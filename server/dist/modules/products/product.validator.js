import { HttpError } from '../../utils/http.js';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const requiredText = (value, field, minLength, maxLength) => {
    if (typeof value !== 'string' || value.trim().length < minLength || value.trim().length > maxLength) {
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
const moneyValue = (value, field, allowZero) => {
    if (typeof value !== 'string' && typeof value !== 'number')
        throw new HttpError(400, `${field} is required.`);
    const normalized = String(value).trim();
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
    if (!match) {
        throw new HttpError(400, `${field} must be ${allowZero ? 'zero or a' : 'greater than zero and a'} valid amount.`);
    }
    const wholePart = match[1].replace(/^0+(?=\d)/, '');
    const fractionalPart = (match[2] ?? '').padEnd(2, '0');
    if (!allowZero && wholePart === '0' && fractionalPart === '00') {
        throw new HttpError(400, `${field} must be greater than zero and valid.`);
    }
    if (wholePart.length > 10
        || (wholePart.length === 10 && wholePart > '1000000000')
        || (wholePart === '1000000000' && fractionalPart !== '00')) {
        throw new HttpError(400, `${field} is too large.`);
    }
    return `${wholePart}.${fractionalPart}`;
};
const priceValue = (value) => moneyValue(value, 'Price', false);
const deliveryFeeValue = (value) => moneyValue(value, 'Delivery fee', true);
const discountTypeValue = (value) => {
    if (value === undefined || value === null || value === '')
        return null;
    if (value === 'PERCENTAGE' || value === 'FIXED')
        return value;
    throw new HttpError(400, 'Discount type must be percentage or fixed amount.');
};
const discountFields = (typeValue, value, originalPrice) => {
    const discountType = discountTypeValue(typeValue);
    const hasDiscountValue = value !== undefined && value !== null && String(value).trim() !== '';
    if (!discountType) {
        if (hasDiscountValue)
            throw new HttpError(400, 'A discount type is required when a discount value is provided.');
        return { discountType: null, discountValue: null };
    }
    const discountValue = moneyValue(value, 'Discount value', false);
    const numericValue = Number(discountValue);
    const numericPrice = Number(originalPrice);
    if (discountType === 'PERCENTAGE' && numericValue > 100) {
        throw new HttpError(400, 'Percentage discount cannot be greater than 100.');
    }
    if (discountType === 'FIXED' && numericValue > numericPrice) {
        throw new HttpError(400, 'Fixed discount cannot be greater than the product price.');
    }
    return { discountType, discountValue };
};
export const MAX_PRODUCT_OPTIONS = 50;
const optionInput = (value) => {
    if (!isRecord(value))
        throw new HttpError(400, 'Each product option must be an object.');
    const label = requiredText(value.label, 'Option label', 1, 80);
    const price = moneyValue(value.price, 'Option price', false);
    return {
        label,
        price,
        stockQuantity: value.stockQuantity === undefined ? 0 : integerValue(value.stockQuantity, 'Option stock quantity'),
        sortOrder: value.sortOrder === undefined ? 0 : integerValue(value.sortOrder, 'Option order'),
        isActive: booleanValue(value.isActive, 'Option availability', true),
    };
};
export function parseProductOptions(value) {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        return undefined;
    }
    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        }
        catch {
            throw new HttpError(400, 'Product options must be a valid JSON array.');
        }
    }
    if (!Array.isArray(parsed))
        throw new HttpError(400, 'Product options must be an array.');
    if (parsed.length > MAX_PRODUCT_OPTIONS) {
        throw new HttpError(400, `A product can have at most ${MAX_PRODUCT_OPTIONS} options.`);
    }
    const options = parsed.map(optionInput);
    const labels = new Set();
    const orders = new Set();
    for (const option of options) {
        const labelKey = option.label.toLowerCase();
        if (labels.has(labelKey))
            throw new HttpError(400, `Duplicate option label "${option.label}".`);
        labels.add(labelKey);
        if (orders.has(option.sortOrder)) {
            throw new HttpError(400, 'Option order positions must be unique.');
        }
        orders.add(option.sortOrder);
    }
    return options;
}
export function validateAdminProductId(value) {
    if (!value || !UUID_PATTERN.test(value.trim()))
        throw new HttpError(400, 'Product ID is invalid.');
    return value.trim();
}
export function validateProductFields(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Product data is required.');
    const categoryId = requiredText(body.categoryId, 'Category', 1, 40);
    if (!UUID_PATTERN.test(categoryId))
        throw new HttpError(400, 'Category is invalid.');
    const options = parseProductOptions(body.options);
    const hasOptions = Boolean(options && options.length > 0);
    let price;
    if (hasOptions) {
        const hasProvidedPrice = body.price !== undefined && body.price !== null && String(body.price).trim() !== '';
        if (hasProvidedPrice)
            price = priceValue(body.price);
        if ((body.discountType !== undefined && body.discountType !== null && body.discountType !== '')
            || (body.discountValue !== undefined && body.discountValue !== null && String(body.discountValue).trim() !== '')) {
            throw new HttpError(400, 'Discounts cannot be combined with product options.');
        }
    }
    else {
        price = priceValue(body.price);
    }
    return {
        name: requiredText(body.name, 'Product name', 2, 180),
        categoryId,
        price,
        ...(hasOptions ? { discountType: null, discountValue: null } : discountFields(body.discountType, body.discountValue, price)),
        deliveryFee: deliveryFeeValue(body.deliveryFee),
        unit: requiredText(body.unit, 'Unit', 1, 80),
        description: requiredText(body.description, 'Description', 10, 4000),
        isActive: booleanValue(body.isActive, 'Availability', true),
        isFeatured: booleanValue(body.isFeatured, 'Featured', false),
        stockQuantity: hasOptions ? undefined : integerValue(body.stockQuantity, 'Stock quantity'),
        options,
    };
}
export function validateProductImageOrder(body) {
    if (!isRecord(body) || body.imageOrder === undefined || body.imageOrder === '')
        return null;
    if (typeof body.imageOrder !== 'string')
        throw new HttpError(400, 'Product image order is invalid.');
    let parsed;
    try {
        parsed = JSON.parse(body.imageOrder);
    }
    catch {
        throw new HttpError(400, 'Product image order is invalid.');
    }
    if (!Array.isArray(parsed) || parsed.length > 10 || parsed.some((item) => typeof item !== 'string')) {
        throw new HttpError(400, 'Product image order is invalid.');
    }
    return parsed;
}
export function validateProductStatusInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Availability is required.');
    return booleanValue(body.isActive, 'Availability', false);
}
export function validateProductFeaturedInput(body) {
    if (!isRecord(body))
        throw new HttpError(400, 'Featured status is required.');
    return booleanValue(body.isFeatured, 'Featured', false);
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
export function validatePublicProductsQuery(query) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    if (!Number.isInteger(page) || page < 1)
        throw new HttpError(400, 'Page must be a positive integer.');
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
        throw new HttpError(400, 'Limit must be between 1 and 50.');
    const sortValues = ['relevance', 'price_asc', 'price_desc', 'newest'];
    const sort = typeof query.sort === 'string' && sortValues.includes(query.sort)
        ? query.sort
        : query.sort === undefined
            ? 'relevance'
            : undefined;
    if (!sort)
        throw new HttpError(400, 'Sort must be one of relevance, price_asc, price_desc, or newest.');
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 120) || undefined : undefined;
    if (query.search !== undefined && typeof query.search !== 'string')
        throw new HttpError(400, 'Search must be text.');
    const category = typeof query.category === 'string' ? query.category.trim() || undefined : undefined;
    if (query.category !== undefined && typeof query.category !== 'string')
        throw new HttpError(400, 'Category must be text.');
    if (category && category.length > 120)
        throw new HttpError(400, 'Category is too long.');
    return { page, limit, sort, search, category };
}
export function validateCategorySectionsQuery(query) {
    const limit = Number(query.limit ?? 6);
    if (!Number.isInteger(limit) || limit < 4 || limit > 6) {
        throw new HttpError(400, 'Category section limit must be between 4 and 6.');
    }
    return limit;
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
