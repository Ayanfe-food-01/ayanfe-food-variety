import { HttpError } from '../utils/http.js';
export function requireRouteId(value, label = 'id') {
    if (!value || value.trim().length === 0) {
        throw new HttpError(400, `${label} is required`);
    }
    return value.trim();
}
