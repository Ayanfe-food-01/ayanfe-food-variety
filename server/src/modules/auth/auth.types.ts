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

export interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  user: AuthenticatedUser
}