import { HttpError } from '../utils/http.js';
import { getAuthenticatedCustomer, getAuthenticatedUser, getCustomerSessionToken, getSessionToken, customerAuthCookie, } from '../modules/auth/auth.service.js';
import { UserRole, ShoppingMode } from '@prisma/client';
export const requireAuthentication = async (request, _response, next) => {
    const user = await getAuthenticatedUser(getSessionToken(request.headers.cookie));
    if (!user) {
        next(new HttpError(401, 'Authentication is required.'));
        return;
    }
    request.authenticatedUser = user;
    next();
};
export const requireAdminRole = (request, _response, next) => {
    if (!request.authenticatedUser || request.authenticatedUser.role !== UserRole.ADMIN) {
        next(new HttpError(403, 'Administrator access is required.'));
        return;
    }
    next();
};
export const requireCustomerAuthentication = async (request, response, next) => {
    const user = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie));
    if (!user) {
        if (getCustomerSessionToken(request.headers.cookie)) {
            response.clearCookie(customerAuthCookie.name, customerAuthCookie.options);
        }
        next(new HttpError(401, 'Customer authentication is required.'));
        return;
    }
    request.authenticatedUser = user;
    next();
};
export const requireCustomerRole = (request, _response, next) => {
    if (!request.authenticatedUser || request.authenticatedUser.role !== UserRole.CUSTOMER) {
        next(new HttpError(403, 'Customer access is required.'));
        return;
    }
    next();
};
export const requireWholesaleMode = (request, _response, next) => {
    if (!request.authenticatedUser
        || request.authenticatedUser.role !== UserRole.CUSTOMER
        || request.authenticatedUser.shoppingMode !== ShoppingMode.WHOLESALE) {
        next(new HttpError(403, 'Switch to Wholesale mode to access wholesale pricing.'));
        return;
    }
    next();
};
export const optionalCustomerAuthentication = async (request, response, next) => {
    const user = await getAuthenticatedCustomer(getCustomerSessionToken(request.headers.cookie));
    if (user)
        request.authenticatedUser = user;
    else if (getCustomerSessionToken(request.headers.cookie)) {
        response.clearCookie(customerAuthCookie.name, customerAuthCookie.options);
    }
    next();
};
