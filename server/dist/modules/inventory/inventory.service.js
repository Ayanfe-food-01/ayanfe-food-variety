import { AdminNotificationType, Prisma } from '@prisma/client';
import { HttpError } from '../../utils/http.js';
import { createAdminNotification } from '../notifications/notification.service.js';
export const LOW_STOCK_THRESHOLD = 5;
export async function recordStockAdjustment(transaction, input) {
    if (input.quantityDelta === 0)
        return null;
    return transaction.productStockAdjustment.create({
        data: input,
        select: { id: true },
    });
}
export async function createLowStockNotificationIfNeeded(transaction, input) {
    const enteredLowStock = input.newQuantity > 0
        && input.newQuantity <= LOW_STOCK_THRESHOLD
        && (input.previousQuantity > LOW_STOCK_THRESHOLD
            || (input.notifyFromZero && input.previousQuantity === 0));
    if (!enteredLowStock)
        return;
    await createAdminNotification(transaction, {
        type: AdminNotificationType.LOW_STOCK,
        eventKey: `low-stock:${input.productId}:${input.stockAdjustmentId}`,
        title: 'Low-stock product',
        message: `${input.productName} has ${input.newQuantity} unit${input.newQuantity === 1 ? '' : 's'} left.`,
        href: `/admin/products/${input.productId}`,
    });
}
export async function deductStock(transaction, input) {
    const product = await lockProduct(transaction, input.productId);
    if (!product)
        throw new HttpError(404, 'Product no longer exists.');
    if (input.productOptionId) {
        const option = await lockProductOption(transaction, input.productOptionId);
        if (!option || option.product_id !== input.productId)
            throw new HttpError(404, 'Product option no longer exists.');
        if (!product.is_active)
            throw new HttpError(409, 'Product is no longer available.');
        if (!option.is_active || option.stock_quantity < input.quantity) {
            throw new HttpError(409, 'Product option is unavailable or there is insufficient stock.');
        }
        await transaction.productOption.update({
            where: { id: option.id },
            data: { stockQuantity: { decrement: input.quantity } },
        });
        const adjustment = await recordStockAdjustment(transaction, {
            productId: input.productId,
            productOptionId: option.id,
            orderId: input.orderId,
            quantityDelta: -input.quantity,
            previousQuantity: option.stock_quantity,
            newQuantity: option.stock_quantity - input.quantity,
            reason: `Order ${input.orderNumber}`,
        });
        if (adjustment) {
            await createLowStockNotificationIfNeeded(transaction, {
                productId: input.productId,
                productName: `${product.name} (${option.label})`,
                previousQuantity: option.stock_quantity,
                newQuantity: option.stock_quantity - input.quantity,
                stockAdjustmentId: adjustment.id,
            });
        }
        return;
    }
    if (!product.is_active || product.stock_quantity < input.quantity) {
        throw new HttpError(409, 'Product is unavailable or there is insufficient stock.');
    }
    await transaction.product.update({
        where: { id: input.productId },
        data: { stockQuantity: { decrement: input.quantity } },
    });
    const adjustment = await recordStockAdjustment(transaction, {
        productId: input.productId,
        orderId: input.orderId,
        quantityDelta: -input.quantity,
        previousQuantity: product.stock_quantity,
        newQuantity: product.stock_quantity - input.quantity,
        reason: `Order ${input.orderNumber}`,
    });
    if (adjustment) {
        await createLowStockNotificationIfNeeded(transaction, {
            productId: input.productId,
            productName: product.name,
            previousQuantity: product.stock_quantity,
            newQuantity: product.stock_quantity - input.quantity,
            stockAdjustmentId: adjustment.id,
        });
    }
}
export async function restoreStock(transaction, input) {
    if (input.productOptionId) {
        const option = await lockProductOption(transaction, input.productOptionId);
        if (!option || option.product_id !== input.productId)
            throw new HttpError(404, 'Product option no longer exists.');
        await transaction.productOption.update({
            where: { id: option.id },
            data: { stockQuantity: { increment: input.quantity } },
        });
        await recordStockAdjustment(transaction, {
            productId: input.productId,
            productOptionId: option.id,
            orderId: input.orderId,
            quantityDelta: input.quantity,
            previousQuantity: option.stock_quantity,
            newQuantity: option.stock_quantity + input.quantity,
            reason: `Cancellation ${input.orderNumber}`,
        });
        return;
    }
    const product = await lockProduct(transaction, input.productId);
    if (!product)
        throw new HttpError(404, 'Product no longer exists.');
    await transaction.product.update({
        where: { id: input.productId },
        data: { stockQuantity: { increment: input.quantity } },
    });
    await recordStockAdjustment(transaction, {
        productId: input.productId,
        orderId: input.orderId,
        quantityDelta: input.quantity,
        previousQuantity: product.stock_quantity,
        newQuantity: product.stock_quantity + input.quantity,
        reason: `Cancellation ${input.orderNumber}`,
    });
}
const lockProduct = async (transaction, productId) => {
    const products = await transaction.$queryRaw(Prisma.sql `SELECT stock_quantity, is_active, name
      FROM products
      WHERE id = ${productId}::uuid
      FOR UPDATE`);
    return products[0] ?? null;
};
const lockProductOption = async (transaction, productOptionId) => {
    const options = await transaction.$queryRaw(Prisma.sql `SELECT id, product_id, label, stock_quantity, is_active
      FROM product_options
      WHERE id = ${productOptionId}::uuid
      FOR UPDATE`);
    return options[0] ?? null;
};
