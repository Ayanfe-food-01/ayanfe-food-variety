import type { UserRole } from '@prisma/client'

export interface LoginInput {
  email: string
  password: string
}

export interface CustomerSignupInput {
  name: string
  email: string
  password: string
}

export interface CustomerEmailVerificationInput {
  email: string
  otp: string
}

export interface CustomerVerificationEmailInput {
  email: string
}

export interface PasswordResetRequestInput {
  email: string
}

export interface PasswordResetInput {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface AdminPasswordChangeInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
}

export interface AuthResponse {
  user: AuthenticatedUser
}