import { HttpError } from '../../utils/http.js';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const requiredText = (value, field, maxLength) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
        throw new HttpError(400, `${field} is required and must be valid.`);
    }
    return value.trim();
};
const booleanValue = (value, field, defaultValue) => {
    if (value === undefined)
        return defaultValue;
    if (typeof value === 'boolean')
        return value;
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    throw new HttpError(400, `${field} must be true or false.`);
};
const integerValue = (value, field) => {
    const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (!Number.isInteger(number) || number < 0 || number > 1000000000) {
        throw new HttpError(400, `${field} must be a non-negative whole number.`);
    }
    return number;
};
const priceValue = (value) => {
    if (typeof value !== 'string' && typeof value !== 'number')
        throw new HttpError(400, 'Price is required.');
    const normalized = String(value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) < 0 || Number(normalized) > 1000000000) {
        throw new HttpError(400, 'Price must be a valid non-negative amount.');
    }
    return Number(normalized).toFixed(2);
};
export function validateAdminProductId(value) {
    if (!value || !UUID_PATTERN.test(value.trim()))
        throw new HttpError(400, 'Product ID is invalid.');
    return value.trim();
}
export function validateProductInput(body, image, allowMissingImage = false) {
    if (!isRecord(body))
        throw new HttpError(400, 'Product data is required.');
    const categoryId = requiredText(body.categoryId, 'Category', 40);
    if (!UUID_PATTERN.test(categoryId))
        throw new HttpError(400, 'Category is invalid.');
    const suppliedImage = typeof body.image === 'string' ? body.image.trim() : undefined;
    if (!allowMissingImage && !image && !suppliedImage)
        throw new HttpError(400, 'A product image is required.');
    return {
        name: requiredText(body.name, 'Product name', 180),
        categoryId,
        price: priceValue(body.price),
        unit: requiredText(body.unit, 'Unit', 80),
        description: requiredText(body.description, 'Description', 4000),
        isActive: booleanValue(body.isActive, 'Availability', true),
        stockQuantity: integerValue(body.stockQuantity, 'Stock quantity'),
        image: image ?? suppliedImage,
    };
}
export function validateProductStatusInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Availability is required.');
    return booleanValue(body.isActive, 'Availability', false);
}
export function validateAdminProductsQuery(query) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    if (!Number.isInteger(page) || page < 1)
        throw new HttpError(400, 'Page must be a positive integer.');
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50)
        throw new HttpError(400, 'Page size must be between 1 and 50.');
    const categoryId = typeof query.categoryId === 'string' && query.categoryId ? query.categoryId : undefined;
    if (categoryId && !UUID_PATTERN.test(categoryId))
        throw new HttpError(400, 'Category filter is invalid.');
    const availability = query.availability === 'active' || query.availability === 'inactive' || query.availability === 'out-of-stock'
        ? query.availability
        : undefined;
    if (query.availability && !availability)
        throw new HttpError(400, 'Availability filter is invalid.');
    return {
        page,
        pageSize,
        search: typeof query.search === 'string' ? query.search.trim().slice(0, 120) || undefined : undefined,
        categoryId,
        availability,
    };
}
export function requireProductIdentifier(value) {
    const identifier = value?.trim() ?? '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const isSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(identifier);
    if (!identifier || identifier.length > 180 || (!isUuid && !isSlug)) {
        throw new HttpError(400, 'product id is required');
    }
    return identifier;
}
