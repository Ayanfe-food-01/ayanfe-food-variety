import { request } from './api'

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  pendingPaymentVerification: number
  verifiedPayments: number
  totalSales: string
}

export interface PaymentSettings {
  bankName: string
  accountName: string
  accountNumber: string
  instructions: string
}

interface DashboardResponse {
  success: true
  data: { stats: DashboardStats }
}

interface SettingsResponse {
  success: true
  data: { settings: PaymentSettings | null }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await request<DashboardResponse>('/admin/dashboard')
  return response.data.stats
}

export async function getPaymentSettings(): Promise<PaymentSettings | null> {
  const response = await request<SettingsResponse>('/admin/settings/payment')
  return response.data.settings
}

export async function updatePaymentSettings(settings: PaymentSettings): Promise<PaymentSettings> {
  const response = await request<SettingsResponse>('/admin/settings/payment', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!response.data.settings) throw new Error('Payment settings were not returned.')
  return response.data.settings
}