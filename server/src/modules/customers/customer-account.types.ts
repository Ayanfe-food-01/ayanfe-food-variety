import type { CustomerAddress, User } from '@prisma/client'

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

export interface CustomerAccountSavedAddress {
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
  updatedAt: string
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

export interface CustomerAddressUpdateInput extends CustomerAddressSaveInput {
  isDefault?: boolean
}

export interface CustomerProfileUpdateInput {
  name?: string | null
  phone?: string | null
}

export const toCustomerSavedAddress = (
  address: CustomerAddress,
): CustomerAccountSavedAddress => ({
  id: address.id,
  label: address.label,
  recipientName: address.recipientName,
  phone: address.phone,
  address: address.address,
  city: address.city,
  cityId: address.cityId,
  state: address.state,
  areaName: address.areaName,
  areaId: address.areaId,
  instructions: address.instructions,
  isDefault: address.isDefault,
  createdAt: address.createdAt.toISOString(),
  updatedAt: address.updatedAt.toISOString(),
})

export const toCustomerAccountProfile = (user: User): CustomerAccountProfile => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  emailVerified: user.emailVerified,
  emailPendingVerification: false,
  authProvider: user.authProvider,
  hasPassword: Boolean(user.passwordHash),
  createdAt: user.createdAt.toISOString(),
  lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
})
