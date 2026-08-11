import { createCategory, deleteCategory, getAdminCategory, getCategories, listAdminCategories, updateCategory, updateCategoryStatus, } from './category.service.js';
import { validateAdminCategoriesQuery, validateCategoryId, validateCategoryInput, validateCategoryStatusInput, } from './category.validator.js';
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
    response.status(201).json({
        success: true,
        message: 'Category created.',
        data: { category: await createCategory(validateCategoryInput(request.body)) },
    });
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
    response.json({
        success: true,
        message: 'Category updated.',
        data: {
            category: await updateCategory(validateCategoryId(request.params.id), validateCategoryInput(request.body)),
        },
    });
};
export const deleteAdminCategoryController = async (request, response) => {
    await deleteCategory(validateCategoryId(request.params.id));
    response.json({ success: true, message: 'Category deleted.' });
};
