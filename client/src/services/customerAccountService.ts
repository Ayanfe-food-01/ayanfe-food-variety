import { request } from './api'

export interface CustomerAccountProfile {
  id: string
  name: string
  email: string
  phone: string | null
  emailVerified: boolean
  emailPendingVerification: boolean
  // Sign-in method used to establish this account. Exposed so the account UI
  // can show the correct security options (e.g. change password only when the
  // customer actually has a local password). Never exposes the password itself.
  authProvider: 'PASSWORD' | 'GOOGLE'
  hasPassword: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface CustomerAccountAddress {
  id: string
  label: string
  recipientName: string
  phone: string
  address: string
  city: string
  cityId: string | null
  state: string | null
  areaName: string | null
  areaId: string | null
  instructions: string | null
  isDefault: boolean
  createdAt: string
}

export interface CustomerAddressSaveInput {
  label: string
  recipientName: string
  phone: string
  address: string
  city: string
  cityId?: string | null
  state?: string | null
  areaName?: string | null
  areaId?: string | null
  instructions?: string | null
  isDefault?: boolean
}

export interface CustomerProfileUpdateInput {
  name?: string | null
  phone?: string | null
}

interface ProfileResponse {
  success: true
  data: { profile: CustomerAccountProfile }
}

interface AddressesResponse {
  success: true
  data: { addresses: CustomerAccountAddress[] }
}

export async function getCustomerAccountProfileService(): Promise<CustomerAccountProfile> {
  const response = await request<ProfileResponse>('/customer/account/profile')
  return response.data.profile
}

export async function updateCustomerAccountProfileService(
  input: CustomerProfileUpdateInput,
): Promise<CustomerAccountProfile> {
  const response = await request<ProfileResponse>('/customer/account/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.profile
}

export async function listCustomerAccountAddressesService(): Promise<CustomerAccountAddress[]> {
  const response = await request<AddressesResponse>('/customer/account/addresses')
  return response.data.addresses
}

export async function createCustomerAccountAddressService(
  input: CustomerAddressSaveInput,
): Promise<CustomerAccountAddress[]> {
  const response = await request<AddressesResponse>('/customer/account/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.addresses
}

export async function updateCustomerAccountAddressService(
  addressId: string,
  input: CustomerAddressSaveInput,
): Promise<CustomerAccountAddress[]> {
  const response = await request<AddressesResponse>(`/customer/account/addresses/${addressId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.addresses
}

export async function deleteCustomerAccountAddressService(
  addressId: string,
): Promise<CustomerAccountAddress[]> {
  const response = await request<AddressesResponse>(`/customer/account/addresses/${addressId}`, {
    method: 'DELETE',
  })
  return response.data.addresses
}

interface ChangePasswordResponse {
  success: true
  data: { message: string }
}

export async function changeCustomerAccountPassword(input: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<string> {
  const response = await request<ChangePasswordResponse>('/auth/customer/password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.message
}
