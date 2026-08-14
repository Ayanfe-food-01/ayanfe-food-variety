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

interface CustomerSignupResponse {
  success: true
  data: {
    user: CustomerUser
    verificationExpiresInSeconds: number
  }
}

export async function signupCustomer(name: string, email: string, password: string): Promise<{
  user: CustomerUser
  verificationExpiresInSeconds: number
}> {
  const response = await request<CustomerSignupResponse>('/auth/customer/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  return response.data
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

export async function verifyCustomerEmail(email: string, otp: string): Promise<void> {
  await request<{ success: true; data: { verified: true; email: string } }>('/auth/customer/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })
}

export async function resendCustomerVerification(email: string): Promise<{
  verificationExpiresInSeconds: number
  message: string
}> {
  const response = await request<{
    success: true
    data: {
      email: string
      verificationExpiresInSeconds: number
      message: string
    }
  }>('/auth/customer/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return response.data
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await request<{
    success: true
    data: { message: string }
  }>('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return response.data.message
}

export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<string> {
  const response = await request<{
    success: true
    data: { message: string }
  }>('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmPassword }),
  })
  return response.data.message
}