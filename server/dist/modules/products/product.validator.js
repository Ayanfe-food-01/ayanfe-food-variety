import { HttpError } from '../../utils/http.js';
export function requireProductIdentifier(value) {
    const identifier = value?.trim() ?? '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const isSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(identifier);
    if (!identifier || identifier.length > 180 || (!isUuid && !isSlug)) {
        throw new HttpError(400, 'product id is required');
    }
    return identifier;
}
