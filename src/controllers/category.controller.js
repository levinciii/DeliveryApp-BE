import * as categoryService from '../services/category.service.js';

export const list = async (_req, res) => res.json(await categoryService.listCategories());
export const create = async (req, res) =>
  res.status(201).json(await categoryService.createCategory(req.user.id, req.valid.body));
