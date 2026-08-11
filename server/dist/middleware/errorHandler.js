import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/http.js';
export const notFoundHandler = (request, _response, next) => {
    next(new HttpError(404, `Route not found: ${request.method} ${request.originalUrl}`));
};
export const errorHandler = (error, _request, response, _next) => {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof HttpError
        ? error.message
        : error instanceof Prisma.PrismaClientKnownRequestError
            ? 'The database request could not be completed.'
            : 'An unexpected server error occurred';
    if (statusCode >= 500) {
        console.error(error);
    }
    response.status(statusCode).json({
        error: {
            message,
            statusCode,
        },
    });
};
