export function calculateDiscountedPrice(price, discountType, discountValue) {
    if (!discountType && !discountValue)
        return price;
    if (!discountType || !discountValue || discountValue.lte(0)) {
        throw new Error('Product discount data is invalid.');
    }
    if (discountType === 'PERCENTAGE') {
        if (discountValue.gt(100))
            throw new Error('Product percentage discount is invalid.');
        return price
            .sub(price.mul(discountValue).div(100))
            .toDecimalPlaces(2);
    }
    if (discountValue.gt(price))
        throw new Error('Product fixed discount is invalid.');
    return price.sub(discountValue).toDecimalPlaces(2);
}
