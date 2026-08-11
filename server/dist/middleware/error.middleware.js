import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/http.js';
export const errorMiddleware = (error, _request, response, _next) => {
    const isMalformedJson = error instanceof SyntaxError &&
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 400;
    const statusCode = error instanceof HttpError
        ? error.statusCode
        : isMalformedJson
            ? 400
            : 500;
    const message = error instanceof HttpError
        ? error.message
        : isMalformedJson
            ? 'Request body contains invalid JSON.'
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
