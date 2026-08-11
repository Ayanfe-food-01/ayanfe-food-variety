import { createCategory, getCategories, updateCategoryStatus } from './category.service.js';
import { validateCategoryId, validateCategoryInput, validateCategoryStatusInput } from './category.validator.js';
export const getCategoriesController = async (_request, response) => {
    const categories = await getCategories();
    response.json({ data: categories });
};
export const listAdminCategoriesController = async (_request, response) => {
    response.json({ success: true, data: { categories: await getCategories(true) } });
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
