import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getAdminPayments, rejectAdminPayment, verifyAdminPayment, type AdminPayment } from '../../services/paymentService'
import { PaymentReview } from '../../components/admin/PaymentReview'
import { PaymentTable } from '../../components/admin/PaymentTable'
import { useToast } from '../../components/ui/Toast'

export function Payments() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [selected, setSelected] = useState<AdminPayment | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  const loadPayments = () => getAdminPayments().then(setPayments).catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Payments could not be loaded.'))
  useEffect(() => { void loadPayments() }, [])

  const review = async (action: 'verify' | 'reject', note: string) => {
    if (!selected) return
    setIsSaving(true)
    try {
      if (action === 'verify') await verifyAdminPayment(selected.id, note)
      else await rejectAdminPayment(selected.id, note)
      setSelected(null)
      await loadPayments()
      showToast(`Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully.`, 'success')
    } catch (caught) {
      showToast(caught instanceof ApiError ? caught.message : 'Payment review could not be saved.', 'error')
    } finally { setIsSaving(false) }
  }

  return <div><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Cash management</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Payments</h1><p className="mt-3 text-sm text-muted">Review transfer receipts before marking orders as paid.</p></div><span className="rounded-full bg-orange/10 px-3 py-2 text-xs font-bold text-orange">{payments.length} pending review</span></div>{error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}<div className="mt-8"><PaymentTable payments={payments} onSelect={setSelected} /></div>{selected && <PaymentReview payment={selected} isSaving={isSaving} onClose={() => setSelected(null)} onVerify={(note) => review('verify', note)} onReject={(note) => review('reject', note)} />}</div>
}