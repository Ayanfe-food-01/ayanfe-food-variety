import { listCategories } from '../services/categoryService.js';
export const getCategories = async (_request, response) => {
    const categories = await listCategories();
    response.json({ data: categories });
};
