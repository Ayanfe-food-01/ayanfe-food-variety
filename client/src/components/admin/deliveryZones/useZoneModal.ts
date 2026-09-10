import { useState } from 'react'
import { useToast } from '../../ui/Toast'
import { ApiError } from '../../../services/api'
import {
  createAdminDeliveryZone,
  updateAdminDeliveryZone,
  type AdminDeliveryZone,
  type DeliveryZoneInput,
} from '../../../services/adminService'

interface ZoneModalState {
  mode: 'create' | 'edit'
  zone: AdminDeliveryZone | null
}

export interface UseZoneModalResult {
  modal: ZoneModalState | null
  modalBusy: boolean
  modalError: string | null
  openCreate: () => void
  openEdit: (zone: AdminDeliveryZone) => void
  close: () => void
  save: (input: DeliveryZoneInput) => Promise<void>
}

export function useZoneModal(onSaved: () => void): UseZoneModalResult {
  const { showToast } = useToast()
  const [modal, setModal] = useState<ZoneModalState | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalBusy, setModalBusy] = useState(false)

  const openCreate = () => {
    setModalError(null)
    setModal({ mode: 'create', zone: null })
  }

  const openEdit = (zone: AdminDeliveryZone) => {
    setModalError(null)
    setModal({ mode: 'edit', zone })
  }

  const close = () => setModal(null)

  const save = async (input: DeliveryZoneInput) => {
    if (!modal) return
    setModalBusy(true)
    setModalError(null)
    try {
      if (modal.mode === 'create') {
        await createAdminDeliveryZone(input)
        showToast('Delivery zone created.', 'success')
      } else if (modal.zone) {
        await updateAdminDeliveryZone(modal.zone.id, input)
        showToast('Delivery zone updated.', 'success')
      }
      setModal(null)
      onSaved()
    } catch (caught: unknown) {
      setModalError(caught instanceof ApiError ? caught.message : 'Delivery zone could not be saved.')
    } finally {
      setModalBusy(false)
    }
  }

  return { modal, modalBusy, modalError, openCreate, openEdit, close, save }
}