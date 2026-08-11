import { HttpError } from '../utils/http.js';
export const notFoundMiddleware = (request, _response, next) => {
    next(new HttpError(404, `Route not found: ${request.method}`));
};
