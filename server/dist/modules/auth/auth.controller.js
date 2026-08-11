import { authCookie, getAuthenticatedUser, getAuthenticatedCustomer, getCustomerSessionToken, customerAuthCookie, getSessionToken, login, loginCustomer, revokeCustomerSession, revokeSession, signupCustomer, isGoogleOAuthConfigured, } from './auth.service.js';
import { validateCustomerSignupInput, validateLoginInput } from './auth.validator.js';
export const loginController = async (request, response) => {
    const result = await login(validateLoginInput(request.body));
    response.cookie(authCookie.name, result.token, {
        ...authCookie.options,
        maxAge: authCookie.maxAge,
    });
    response.json({ success: true, data: { user: result.user } });
};
export const logoutController = async (request, response) => {
    await revokeSession(getSessionToken(request.headers.cookie));
    response.clearCookie(authCookie.name, authCookie.options);
    response.status(204).send();
};
export const meController = async (request, response) => {
    const user = await getAuthenticatedUser(getSessionToken(request.headers.cookie));
    if (!user) {
        response.status(401).json({ error: { message: 'Authentication is required.', statusCode: 401 } });
        return;
    }
    response.json({ success: true, data: { user } });
};
const setCustomerCookie = (response, token) => {
    response.cookie(customerAuthCookie.name, token, {
        ...customerAuthCookie.options,
        maxAge: customerAuthCookie.maxAge,
    });
};
export const customerSignupController = async (request, response) => {
    const result = await signupCustomer(validateCustomerSignupInput(request.body));
    setCustomerCookie(response, result.token);
    response.status(201).json({ success: true, data: { user: result.user } });
};
export const customerLoginController = async (request, response) => {
    const result = await loginCustomer(validateLoginInput(request.body));
    setCustomerCookie(response, result.token);
    response.json({ success: true, data: { user: result.user } });
};
export const customerLogoutController = async (request, response) => {
    await revokeCustomerSession(getCustomerSessionToken(request.headers.cookie));
    response.clearCookie(customerAuthCookie.name, customerAuthCookie.options);
    response.status(204).send();
};
export const customerMeController = async (request, response) => {
    const user = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie));
    if (!user) {
        response.status(401).json({ error: { message: 'Customer authentication is required.', statusCode: 401 } });
        return;
    }
    response.json({ success: true, data: { user } });
};
export const customerProvidersController = (_request, response) => {
    response.json({
        success: true,
        data: {
            google: isGoogleOAuthConfigured,
            message: isGoogleOAuthConfigured
                ? 'Google OAuth credentials are configured; an OAuth callback must be enabled before use.'
                : 'Google sign-in is unavailable. Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable it.',
        },
    });
};
