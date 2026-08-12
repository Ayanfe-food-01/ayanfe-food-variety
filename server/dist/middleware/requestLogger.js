import crypto from 'node:crypto';
export const requestLogger = (request, response, next) => {
    const startedAt = Date.now();
    const requestId = request.get('x-request-id') || crypto.randomUUID();
    response.setHeader('x-request-id', requestId);
    response.on('finish', () => {
        const duration = Date.now() - startedAt;
        const origin = request.get('origin') || 'same-origin';
        const allowedOrigin = response.getHeader('access-control-allow-origin') || 'none';
        console.info(`[request:${requestId}] ${request.method} ${request.originalUrl} `
            + `${response.statusCode} ${duration}ms origin=${origin} cors=${allowedOrigin}`);
    });
    next();
};
