import type { RequestHandler } from 'express'
import {
  authCookie,
  changeAdminPassword,
  getAuthenticatedUser,
  getAuthenticatedCustomer,
  getCustomerSessionToken,
  customerAuthCookie,
  getSessionToken,
  login,
  loginCustomer,
  loginWithGoogle,
  revokeCustomerSession,
  revokeSession,
  signupCustomer,
  resendCustomerVerificationEmail,
  requestPasswordReset,
  resetPassword,
  verifyCustomerEmail,
  readAuthCookie,
  setCustomerShoppingMode,
} from './auth.service.js'
import {
  createGoogleOAuthState,
  getGoogleAuthorizationUrl,
  getOAuthFrontendUrl,
  googleOAuthStateCookie,
  isGoogleOAuthConfigured,
} from './auth.google.js'
import { HttpError } from '../../utils/http.js'
import {
  validateCustomerEmailVerificationInput,
  validateCustomerSignupInput,
  validateCustomerVerificationEmailInput,
  validateAdminPasswordChangeInput,
  validateLoginInput,
  validatePasswordResetInput,
  validatePasswordResetRequestInput,
  validateShoppingModeInput,
} from './auth.validator.js'

export const loginController: RequestHandler = async (request, response) => {
  const result = await login(validateLoginInput(request.body))
  const cookie = result.sessionType === 'admin' ? authCookie : customerAuthCookie
  const otherCookie = result.sessionType === 'admin' ? customerAuthCookie : authCookie
  response.clearCookie(otherCookie.name, otherCookie.options)
  response.cookie(cookie.name, result.token, {
    ...cookie.options,
    maxAge: cookie.maxAge,
  })
  response.json({ success: true, data: { user: result.user } })
}

export const logoutController: RequestHandler = async (request, response) => {
  await revokeSession(getSessionToken(request.headers.cookie))
  await revokeCustomerSession(getCustomerSessionToken(request.headers.cookie))
  response.clearCookie(authCookie.name, authCookie.options)
  response.clearCookie(customerAuthCookie.name, customerAuthCookie.options)
  response.status(204).send()
}

export const meController: RequestHandler = async (request, response) => {
  response.set('Cache-Control', 'no-store')
  const user = await getAuthenticatedUser(getSessionToken(request.headers.cookie))
    ?? await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie))
  if (!user) {
    response.status(401).json({ error: { message: 'Authentication is required.', statusCode: 401 } })
    return
  }
  response.json({ success: true, data: { user } })
}

const setCustomerCookie = (response: Parameters<RequestHandler>[1], token: string) => {
  response.cookie(customerAuthCookie.name, token, {
    ...customerAuthCookie.options,
    maxAge: customerAuthCookie.maxAge,
  })
}

export const customerSignupController: RequestHandler = async (request, response) => {
  const result = await signupCustomer(validateCustomerSignupInput(request.body))
  response.status(201).json({
    success: true,
    data: {
      user: result.user,
      verificationExpiresInSeconds: result.verificationExpiresInSeconds,
    },
  })
}

export const customerLoginController: RequestHandler = async (request, response) => {
  const result = await loginCustomer(validateLoginInput(request.body))
  setCustomerCookie(response, result.token)
  response.json({ success: true, data: { user: result.user } })
}

export const customerLogoutController: RequestHandler = async (request, response) => {
  await revokeCustomerSession(getCustomerSessionToken(request.headers.cookie))
  response.clearCookie(customerAuthCookie.name, customerAuthCookie.options)
  response.status(204).send()
}

export const customerMeController: RequestHandler = async (request, response) => {
  response.set('Cache-Control', 'no-store')
  const user = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie))
  if (!user) {
    response.status(401).json({ error: { message: 'Customer authentication is required.', statusCode: 401 } })
    return
  }
  response.json({ success: true, data: { user } })
}

export const customerShoppingModeController: RequestHandler = async (request, response) => {
  const user = await setCustomerShoppingMode(
    request.authenticatedUser!.id,
    validateShoppingModeInput(request.body),
  )
  response.json({ success: true, data: { user } })
}

export const customerProvidersController: RequestHandler = (_request, response) => {
  response.json({
    success: true,
    data: {
      google: isGoogleOAuthConfigured,
      message: isGoogleOAuthConfigured
        ? 'Google OAuth is ready for customer sign-in.'
        : 'Google sign-in is unavailable. Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable it.',
    },
  })
}

export const customerGoogleStartController: RequestHandler = (_request, response, next) => {
  try {
    if (!isGoogleOAuthConfigured) {
      response.redirect(getOAuthFrontendUrl('unavailable').toString())
      return
    }
    const { state, nonce } = createGoogleOAuthState()
    response.cookie(googleOAuthStateCookie.name, state, {
      ...googleOAuthStateCookie.options,
      maxAge: googleOAuthStateCookie.maxAge,
    })
    response.cookie(`${googleOAuthStateCookie.name}_nonce`, nonce, {
      ...googleOAuthStateCookie.options,
      maxAge: googleOAuthStateCookie.maxAge,
    })
    response.redirect(getGoogleAuthorizationUrl(state, nonce))
  } catch (error: unknown) {
    next(error)
  }
}

export const customerGoogleCallbackController: RequestHandler = async (request, response, next) => {
  const stateCookie = readAuthCookie(request.headers.cookie, googleOAuthStateCookie.name)
  const nonceCookie = readAuthCookie(request.headers.cookie, `${googleOAuthStateCookie.name}_nonce`)
  const state = typeof request.query.state === 'string' ? request.query.state : null
  const clearStateCookie = () => {
    response.clearCookie(googleOAuthStateCookie.name, googleOAuthStateCookie.options)
    response.clearCookie(`${googleOAuthStateCookie.name}_nonce`, googleOAuthStateCookie.options)
  }

  if (!stateCookie || !nonceCookie || !state || stateCookie !== state) {
    clearStateCookie()
    response.redirect(getOAuthFrontendUrl('failed').toString())
    return
  }
  clearStateCookie()

  if (request.query.error === 'access_denied') {
    response.redirect(getOAuthFrontendUrl('cancelled').toString())
    return
  }
  const code = typeof request.query.code === 'string' ? request.query.code : null
  if (!code) {
    response.redirect(getOAuthFrontendUrl('failed').toString())
    return
  }

  try {
    const result = await loginWithGoogle(code, nonceCookie)
    if ('verificationRequired' in result) {
      response.clearCookie(authCookie.name, authCookie.options)
      response.clearCookie(customerAuthCookie.name, customerAuthCookie.options)
      response.redirect(getOAuthFrontendUrl(
        'verification',
        result.email,
        result.verificationExpiresInSeconds,
      ).toString())
      return
    }
    response.clearCookie(authCookie.name, authCookie.options)
    setCustomerCookie(response, result.token)
    response.redirect(getOAuthFrontendUrl('success').toString())
  } catch (error: unknown) {
    if (error instanceof HttpError && [403, 409].includes(error.statusCode)) {
      response.redirect(getOAuthFrontendUrl('failed').toString())
      return
    }
    if (error instanceof HttpError && error.statusCode === 503) {
      response.redirect(getOAuthFrontendUrl('unavailable').toString())
      return
    }
    if (error instanceof HttpError && error.statusCode === 401) {
      response.redirect(getOAuthFrontendUrl('failed').toString())
      return
    }
    if (error instanceof HttpError) {
      response.redirect(getOAuthFrontendUrl('failed').toString())
      return
    }
    next(error)
  }
}

export const customerVerifyEmailController: RequestHandler = async (request, response) => {
  const result = await verifyCustomerEmail(validateCustomerEmailVerificationInput(request.body))
  response.json({ success: true, data: { verified: true, email: result.email } })
}

export const customerResendVerificationController: RequestHandler = async (request, response) => {
  const result = await resendCustomerVerificationEmail(validateCustomerVerificationEmailInput(request.body))
  response.json({
    success: true,
    data: {
      email: result.email,
      verificationExpiresInSeconds: result.verificationExpiresInSeconds,
      message: 'If the account requires verification, a new code has been sent.',
    },
  })
}

export const passwordResetRequestController: RequestHandler = async (request, response) => {
  const result = await requestPasswordReset(validatePasswordResetRequestInput(request.body))
  response.json({ success: true, data: result })
}

export const passwordResetController: RequestHandler = async (request, response) => {
  await resetPassword(validatePasswordResetInput(request.body))
  response.clearCookie(authCookie.name, authCookie.options)
  response.clearCookie(customerAuthCookie.name, customerAuthCookie.options)
  response.json({
    success: true,
    data: { message: 'Your password has been reset. You can now sign in.' },
  })
}

export const changeAdminPasswordController: RequestHandler = async (request, response) => {
  await changeAdminPassword(
    request.authenticatedUser!.id,
    getSessionToken(request.headers.cookie),
    validateAdminPasswordChangeInput(request.body),
  )
  response.json({
    success: true,
    data: { message: 'Admin password changed successfully.' },
  })
}