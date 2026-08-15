import multer from 'multer';
import { HttpError } from '../../utils/http.js';
import { createProduct, deleteProduct, getAdminProduct, listAdminProducts, updateProduct, updateProductFeatured, updateProductStatus, validateProductCategory, } from './product.service.js';
import { validateAdminProductId, validateAdminProductsQuery, validateProductFeaturedInput, validateProductFields, validateProductStatusInput, } from './product.validator.js';
import { deleteProductImage, uploadProductImage } from './product.storage.js';
const routeParam = (value) => Array.isArray(value) ? value[0] : value;
const upload = multer({
    storage: multer.memoryStorage(),
    // Product forms send 11 scalar fields before an optional image file.
    // Keep this above the current form shape so adding a documented product
    // option cannot be misreported as an image upload failure.
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 20, fieldSize: 1 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            callback(new HttpError(400, 'Product image must be a JPG, PNG, or WEBP image.'));
            return;
        }
        callback(null, true);
    },
});
export const productImageUpload = (request, response, next) => {
    upload.single('image')(request, response, (error) => {
        if (error instanceof multer.MulterError) {
            next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
                ? 'Product images must be 5 MB or smaller.'
                : error.code === 'LIMIT_FIELD_COUNT'
                    ? 'Too many product form fields were submitted.'
                    : error.code === 'LIMIT_UNEXPECTED_FILE'
                        ? 'Only one product image can be uploaded.'
                        : 'The product image upload is invalid.'));
            return;
        }
        next(error);
    });
};
export const listAdminProductsController = async (request, response) => {
    response.json({ success: true, data: await listAdminProducts(validateAdminProductsQuery(request.query)) });
};
export const getAdminProductController = async (request, response) => {
    response.json({ success: true, data: { product: await getAdminProduct(validateAdminProductId(routeParam(request.params.id))) } });
};
export const createAdminProductController = async (request, response) => {
    const fields = validateProductFields(request.body);
    await validateProductCategory(fields.categoryId);
    if (!request.file)
        throw new HttpError(400, 'A product image is required.');
    let image;
    try {
        image = await uploadProductImage(request.file);
        response.status(201).json({
            success: true,
            message: 'Product created.',
            data: { product: await createProduct({ ...fields, image }, request.authenticatedUser.id) },
        });
    }
    catch (error) {
        // The image is uploaded before the transaction so the database never
        // contains a product that points at a failed upload. If persistence fails,
        // remove the newly uploaded asset to avoid orphaned Cloudinary files.
        if (image)
            await deleteProductImage(image);
        throw error;
    }
};
export const updateAdminProductController = async (request, response) => {
    const productId = validateAdminProductId(routeParam(request.params.id));
    const fields = validateProductFields(request.body);
    await validateProductCategory(fields.categoryId);
    const existingProduct = await getAdminProduct(productId);
    let image;
    try {
        image = request.file ? await uploadProductImage(request.file) : undefined;
        const product = await updateProduct({ ...fields, image }, request.authenticatedUser.id, productId);
        if (image && existingProduct.image && existingProduct.image !== image) {
            await deleteProductImage(existingProduct.image);
        }
        response.json({
            success: true,
            message: 'Product updated.',
            data: { product },
        });
    }
    catch (error) {
        if (image)
            await deleteProductImage(image);
        throw error;
    }
};
export const updateAdminProductStatusController = async (request, response) => {
    response.json({
        success: true,
        message: 'Product availability updated.',
        data: { product: await updateProductStatus(validateAdminProductId(routeParam(request.params.id)), validateProductStatusInput(request.body)) },
    });
};
export const updateAdminProductFeaturedController = async (request, response) => {
    response.json({
        success: true,
        message: 'Featured status updated.',
        data: { product: await updateProductFeatured(validateAdminProductId(routeParam(request.params.id)), validateProductFeaturedInput(request.body)) },
    });
};
export const deleteAdminProductController = async (request, response) => {
    const deletedProduct = await deleteProduct(validateAdminProductId(routeParam(request.params.id)));
    if (deletedProduct.image) {
        const removed = await deleteProductImage(deletedProduct.image);
        if (!removed) {
            console.warn(JSON.stringify({
                event: 'product_cloudinary_delete_failed',
                productName: deletedProduct.name,
            }));
        }
    }
    response.json({ success: true, message: 'Product deleted.' });
};
