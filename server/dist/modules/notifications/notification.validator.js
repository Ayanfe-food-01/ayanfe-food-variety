import { HttpError } from '../../utils/http.js';
export function validateAdminNotificationsQuery(query) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    if (!Number.isInteger(page) || page < 1) {
        throw new HttpError(400, 'Page must be a positive integer.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
        throw new HttpError(400, 'Page size must be between 1 and 50.');
    }
    return { page, pageSize };
}
