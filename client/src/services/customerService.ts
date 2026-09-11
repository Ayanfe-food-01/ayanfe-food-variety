import { request } from './api'
import type {
  AdminCustomerDetail,
  AdminCustomersPage,
  AdminCustomersQuery,
} from '../types/customer'

interface CustomersResponse {
  success: true
  data: AdminCustomersPage
}

interface CustomerResponse {
  success: true
  data: { customer: AdminCustomerDetail }
}

const toQueryString = (query: AdminCustomersQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
  })
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.minOrders !== undefined) params.set('minOrders', String(query.minOrders))
  if (query.maxOrders !== undefined) params.set('maxOrders', String(query.maxOrders))
  if (query.lastOrder !== undefined) params.set('lastOrder', String(query.lastOrder))
  return params.toString()
}

export async function getAdminCustomers(query: AdminCustomersQuery): Promise<AdminCustomersPage> {
  const response = await request<CustomersResponse>(`/admin/customers?${toQueryString(query)}`)
  return response.data
}

export async function getAdminCustomer(id: string): Promise<AdminCustomerDetail> {
  const response = await request<CustomerResponse>(`/admin/customers/${encodeURIComponent(id)}`)
  return response.data.customer
}