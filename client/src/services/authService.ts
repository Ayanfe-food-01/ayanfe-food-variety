import { request } from './api'

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'ADMIN' | 'CUSTOMER'
}

interface AuthResponse {
  success: true
  data: { user: AuthenticatedUser }
}

export async function login(email: string, password: string): Promise<AuthenticatedUser> {
  const response = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return response.data.user
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const response = await request<AuthResponse>('/auth/me')
  return response.data.user
}

export const loginAdmin = login
export const getCurrentAdmin = getCurrentUser

export async function logoutAdmin(): Promise<void> {
  await request<void>('/auth/logout', { method: 'POST' })
}

export const logout = logoutAdmin

export interface CustomerUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'CUSTOMER'
}

interface CustomerAuthResponse {
  success: true
  data: { user: CustomerUser }
}

export async function signupCustomer(name: string, email: string, password: string): Promise<CustomerUser> {
  const response = await request<CustomerAuthResponse>('/auth/customer/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  return response.data.user
}

export async function loginCustomer(email: string, password: string): Promise<CustomerUser> {
  const response = await request<CustomerAuthResponse>('/auth/customer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return response.data.user
}

export async function getCurrentCustomer(): Promise<CustomerUser> {
  const response = await request<CustomerAuthResponse>('/auth/customer/me')
  return response.data.user
}

export async function logoutCustomer(): Promise<void> {
  await request<void>('/auth/customer/logout', { method: 'POST' })
}

export async function getCustomerProviders(): Promise<{ google: boolean; message: string }> {
  const response = await request<{ success: true; data: { google: boolean; message: string } }>('/auth/customer/providers')
  return response.data
}