import { getCategories } from './category.service.js';
export const getCategoriesController = async (_request, response) => {
    const categories = await getCategories();
    response.json({ data: categories });
};
