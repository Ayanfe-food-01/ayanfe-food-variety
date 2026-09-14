import { useEffect, useState } from 'react'
import { ApiError } from '../../../services/api'
import {
  deleteAdminContactMessage,
  getAdminContactMessages,
  updateAdminContactMessageStatus,
  type AdminContactMessage,
  type AdminContactMessagesPage,
  type AdminContactMessagesQuery,
  type ContactMessageStatus,
} from '../../../services/contactService'
import { useInitialRouteLoad } from '../../../hooks/useInitialRouteLoad'
import { pageSize } from './contactColumns'

export interface ContactMessagesState {
  result: AdminContactMessagesPage | null
  isLoading: boolean
  error: string | null
  busyId: string | null
  searchInput: string
  onSearchInputChange: (value: string) => void
  onSearch: (value: string) => void
  status: ContactMessageStatus | undefined
  onStatus: (status: ContactMessageStatus | undefined) => void
  sort: 'newest' | 'oldest' | undefined
  onSort: (sort: 'newest' | 'oldest') => void
  onPageChange: (page: number) => void
  setMessageStatus: (id: string, nextStatus: ContactMessageStatus) => Promise<void>
  removeMessage: (id: string) => Promise<void>
}

export function useContactMessages(): ContactMessagesState {
  const [query, setQuery] = useState<AdminContactMessagesQuery>({ page: 1, pageSize, sort: 'newest' })
  const [searchInput, setSearchInput] = useState('')
  const [result, setResult] = useState<AdminContactMessagesPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)

  useEffect(() => {
    let current = true
    queueMicrotask(() => {
      if (!current) return
      setIsLoading(true)
      setError(null)
    })
    getAdminContactMessages(query)
      .then((page) => {
        if (current) setResult(page)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Contact messages could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => {
      current = false
    }
  }, [query])

  const updateLocalRows = (id: string, map: (message: AdminContactMessage) => AdminContactMessage) => {
    setResult((current) => (current
      ? { ...current, contactMessages: current.contactMessages.map((message) => (message.id === id ? map(message) : message)) }
      : current))
  }

  const onSearch = (value: string) => {
    setQuery((current) => ({ ...current, search: value.trim() || undefined, page: 1 }))
  }

  const onStatus = (nextStatus: ContactMessageStatus | undefined) => {
    setQuery((current) => ({ ...current, status: nextStatus, page: 1 }))
  }

  const onSort = (nextSort: 'newest' | 'oldest') => {
    setQuery((current) => ({ ...current, sort: nextSort, page: 1 }))
  }

  const onPageChange = (page: number) => {
    setQuery((current) => ({ ...current, page }))
  }

  const setMessageStatus = async (id: string, nextStatus: ContactMessageStatus): Promise<void> => {
    setBusyId(id)
    try {
      const updated = await updateAdminContactMessageStatus(id, nextStatus)
      updateLocalRows(id, () => updated)
    } finally {
      setBusyId(null)
    }
  }

  const removeMessage = async (id: string): Promise<void> => {
    setBusyId(id)
    try {
      await deleteAdminContactMessage(id)
      setResult((current) => (current
        ? {
            ...current,
            contactMessages: current.contactMessages.filter((message) => message.id !== id),
            pagination: { ...current.pagination, total: current.pagination.total - 1 },
          }
        : current))
    } finally {
      setBusyId(null)
    }
  }

  return {
    result,
    isLoading,
    error,
    busyId,
    searchInput,
    onSearchInputChange: setSearchInput,
    onSearch,
    status: query.status,
    onStatus,
    sort: query.sort,
    onSort,
    onPageChange,
    setMessageStatus,
    removeMessage,
  }
}