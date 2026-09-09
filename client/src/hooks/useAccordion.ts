import { useCallback, useState } from 'react'

export interface AccordionState {
  isOpen: (index: number) => boolean
  toggle: (index: number) => void
  open: (index: number) => void
  close: (index: number) => void
}

interface UseAccordionOptions {
  singleOpen?: boolean
  defaultOpen?: number[]
}

export function useAccordion({ singleOpen = true, defaultOpen = [] }: UseAccordionOptions = {}): AccordionState {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set(defaultOpen))

  const isOpen = useCallback((index: number) => openIndexes.has(index), [openIndexes])

  const toggle = useCallback(
    (index: number) => {
      setOpenIndexes((current) => {
        const next = new Set(current)
        if (next.has(index)) {
          next.delete(index)
        } else if (singleOpen) {
          return new Set([index])
        } else {
          next.add(index)
        }
        return next
      })
    },
    [singleOpen],
  )

  const open = useCallback(
    (index: number) => {
      if (singleOpen) {
        setOpenIndexes(new Set([index]))
        return
      }
      setOpenIndexes((current) => new Set(current).add(index))
    },
    [singleOpen],
  )

  const close = useCallback((index: number) => {
    setOpenIndexes((current) => {
      const next = new Set(current)
      next.delete(index)
      return next
    })
  }, [])

  return { isOpen, toggle, open, close }
}