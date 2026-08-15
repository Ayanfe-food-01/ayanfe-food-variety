import multer from 'multer';
import { HttpError } from '../../utils/http.js';
import { createCategory, deleteCategory, getAdminCategory, getCategories, listAdminCategories, updateCategory, updateCategoryStatus, } from './category.service.js';
import { validateAdminCategoriesQuery, validateCategoryId, validateCategoryInput, validateCategoryStatusInput, } from './category.validator.js';
import { deleteCategoryImage, uploadCategoryImage } from './category.storage.js';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 1 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
        const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname);
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.mimetype) && !hasSupportedExtension) {
            callback(new HttpError(400, 'Category image must be a JPG, PNG, WEBP, or HEIC/HEIF image.'));
            return;
        }
        callback(null, true);
    },
});
export const categoryImageUpload = (request, response, next) => {
    upload.single('image')(request, response, (error) => {
        if (error instanceof multer.MulterError) {
            next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
                ? 'Category images must be 5 MB or smaller.'
                : 'The category image upload is invalid.'));
            return;
        }
        next(error);
    });
};
export const getCategoriesController = async (_request, response) => {
    const categories = await getCategories();
    response.json({ data: categories });
};
export const listAdminCategoriesController = async (request, response) => {
    response.json({
        success: true,
        data: await listAdminCategories(validateAdminCategoriesQuery(request.query)),
    });
};
export const getAdminCategoryController = async (request, response) => {
    response.json({
        success: true,
        data: { category: await getAdminCategory(validateCategoryId(request.params.id)) },
    });
};
export const createAdminCategoryController = async (request, response) => {
    let image;
    try {
        image = request.file ? await uploadCategoryImage(request.file) : undefined;
        response.status(201).json({
            success: true,
            message: 'Category created.',
            data: { category: await createCategory(validateCategoryInput(request.body), image) },
        });
    }
    catch (error) {
        if (image)
            await deleteCategoryImage(image.publicId);
        throw error;
    }
};
export const updateAdminCategoryStatusController = async (request, response) => {
    response.json({
        success: true,
        message: 'Category status updated.',
        data: {
            category: await updateCategoryStatus(validateCategoryId(request.params.id), validateCategoryStatusInput(request.body)),
        },
    });
};
export const updateAdminCategoryController = async (request, response) => {
    const categoryId = validateCategoryId(request.params.id);
    const existingCategory = await getAdminCategory(categoryId);
    let image;
    try {
        image = request.file ? await uploadCategoryImage(request.file) : undefined;
        const category = await updateCategory(categoryId, validateCategoryInput(request.body), image);
        if (image && existingCategory.imagePublicId && existingCategory.imagePublicId !== image.publicId) {
            await deleteCategoryImage(existingCategory.imagePublicId);
        }
        response.json({ success: true, message: 'Category updated.', data: { category } });
    }
    catch (error) {
        if (image)
            await deleteCategoryImage(image.publicId);
        throw error;
    }
};
export const deleteAdminCategoryController = async (request, response) => {
    const deletedImagePublicId = await deleteCategory(validateCategoryId(request.params.id));
    if (deletedImagePublicId)
        await deleteCategoryImage(deletedImagePublicId);
    response.json({ success: true, message: 'Category deleted.' });
};
