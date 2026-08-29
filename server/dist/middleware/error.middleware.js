import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/http.js';
export const errorMiddleware = (error, _request, response, _next) => {
    const isMalformedJson = error instanceof SyntaxError &&
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 400;
    // Transient connection-level failures caused by serverless database
    // latency. The request may even have committed before the response failed;
    // callers are expected to retry idempotently (guarded by unique keys and
    // status claims). They are surfaced as 503 rather than 500 so clients can
    // distinguish "temporarily busy, retry" from an actual error.
    const isTransientPrismaError = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === 'P2024' || error.code === 'P2028');
    // Connection-level failures (refused, pool timeout, socket timeout). Prisma
    // does not export these classes, so they are recognised by their stable
    // class name instead of instanceof.
    const isConnectionPrismaError = error instanceof Error
        && error.constructor.name.startsWith('PrismaClientConnection');
    const statusCode = error instanceof HttpError
        ? error.statusCode
        : isMalformedJson
            ? 400
            : isTransientPrismaError || isConnectionPrismaError
                ? 503
                : 500;
    const message = error instanceof HttpError
        ? error.message
        : isMalformedJson
            ? 'Request body contains invalid JSON.'
            : isTransientPrismaError || isConnectionPrismaError
                ? 'The store is temporarily busy. Please try again.'
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
