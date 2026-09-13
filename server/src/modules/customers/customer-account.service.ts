import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  CustomerAccountSavedAddress,
  CustomerAccountProfile,
  CustomerAddressSaveInput,
  CustomerAddressUpdateInput,
  CustomerProfileUpdateInput,
} from './customer-account.types.js'
import {
  toCustomerSavedAddress,
  toCustomerAccountProfile,
} from './customer-account.types.js'

export const getCustomerAccountProfileService = async (
  userId: string,
): Promise<CustomerAccountProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { addresses: true },
  })
  if (!user) throw new HttpError(404, 'Account not found.')
  return toCustomerAccountProfile(user)
}

const MUTABLE_PROFILE_FIELDS = ['name', 'phone'] as const

export const updateCustomerAccountProfileService = async (
  userId: string,
  input: CustomerProfileUpdateInput,
): Promise<CustomerAccountProfile> => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new HttpError(404, 'Account not found.')

  const data: Record<string, unknown> = {}
  for (const field of MUTABLE_PROFILE_FIELDS) {
    const value = (input as Record<string, unknown>)[field]
    if (value !== undefined) data[field] = value
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  })
  return toCustomerAccountProfile(updated)
}

export const listCustomerAccountAddressesService = async (
  userId: string,
): Promise<CustomerAccountSavedAddress[]> => {
  const addresses = await prisma.customerAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  })
  return addresses.map(toCustomerSavedAddress)
}

export const createCustomerAccountAddressService = async (
  userId: string,
  input: CustomerAddressSaveInput,
): Promise<CustomerAccountSavedAddress[]> => {
  const cityId = input.cityId || null
  const areaId = input.areaId || null

  const shouldBecomeDefault = input.isDefault === true

  const result = await prisma.$transaction(async (transaction) => {
    if (shouldBecomeDefault) {
      await transaction.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const created = await transaction.customerAddress.create({
      data: {
        userId,
        label: input.label,
        recipientName: input.recipientName,
        phone: input.phone,
        address: input.address,
        city: input.city,
        cityId,
        state: input.state ?? null,
        areaName: input.areaName ?? null,
        areaId,
        instructions: input.instructions ?? null,
        isDefault: shouldBecomeDefault,
      },
    })

    return created
  })

  return listCustomerAccountAddressesService(userId)
}

export const updateCustomerAccountAddressService = async (
  userId: string,
  addressId: string,
  input: CustomerAddressUpdateInput,
): Promise<CustomerAccountSavedAddress[]> => {
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, userId },
  })
  if (!existing) {
    throw new HttpError(404, 'Saved address not found.')
  }

  // The form sends isDefault explicitly. True promotes this address to the
  // customer's single default; false removes default status from it. Omitting
  // the field keeps the current default status untouched.
  const explicitlySetDefault = input.isDefault === true
  const explicitlyClearedDefault = input.isDefault === false
  const shouldBecomeDefault = explicitlySetDefault
  const shouldClearDefault = explicitlyClearedDefault && existing.isDefault

  await prisma.$transaction(async (transaction) => {
    if (shouldBecomeDefault) {
      await transaction.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const data: Record<string, unknown> = {
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      address: input.address,
      city: input.city,
      cityId: input.cityId ?? null,
      state: input.state ?? null,
      areaName: input.areaName ?? null,
      areaId: input.areaId ?? null,
      instructions: input.instructions ?? null,
    }
    if (shouldBecomeDefault) data.isDefault = true
    if (shouldClearDefault) data.isDefault = false

    await transaction.customerAddress.update({
      where: { id: existing.id },
      data,
    })
  })

  return listCustomerAccountAddressesService(userId)
}

export const deleteCustomerAccountAddressService = async (
  userId: string,
  addressId: string,
): Promise<CustomerAccountSavedAddress[]> => {
  const existing = await prisma.customerAddress.findFirst({
    where: { id: addressId, userId },
  })
  if (!existing) {
    throw new HttpError(404, 'Saved address not found.')
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.customerAddress.delete({ where: { id: addressId } })

    if (existing.isDefault) {
      const next = await transaction.customerAddress.findFirst({
        where: { userId, id: { not: addressId } },
        orderBy: { updatedAt: 'desc' },
      })
      if (next) {
        await transaction.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        })
      }
    }
  })

  return listCustomerAccountAddressesService(userId)
}

export const createCustomerDefaultAddressFromInput = async (
  userId: string,
  input: CustomerAddressSaveInput,
): Promise<CustomerAccountSavedAddress> => {
  const address = await prisma.customerAddress.create({
    data: {
      userId,
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      address: input.address,
      city: input.city,
      cityId: input.cityId ?? null,
      state: input.state ?? null,
      areaName: input.areaName ?? null,
      areaId: input.areaId ?? null,
      instructions: input.instructions ?? null,
      isDefault: true,
    },
  })
  return toCustomerSavedAddress(address)
}
