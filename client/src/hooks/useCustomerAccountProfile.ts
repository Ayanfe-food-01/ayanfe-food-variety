import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../services/api'
import {
  getCustomerAccountProfileService,
  type CustomerAccountProfile,
} from '../services/customerAccountService'

type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profile: CustomerAccountProfile }
  | { status: 'error'; error: string }

export function useCustomerAccountProfile(enabled: boolean) {
  const [state, setState] = useState<ProfileState>({ status: 'loading' })
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let active = true
    getCustomerAccountProfileService()
      .then((profile) => {
        if (active) setState({ status: 'ready', profile })
      })
      .catch((caught: unknown) => {
        if (!active) return
        if (caught instanceof ApiError && caught.status === 401) return
        setState({
          status: 'error',
          error: caught instanceof ApiError ? caught.message : 'Your profile could not be loaded.',
        })
      })
    return () => { active = false }
  }, [enabled, reloadNonce])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setReloadNonce((current) => current + 1)
  }, [])

  return { state, retry }
}