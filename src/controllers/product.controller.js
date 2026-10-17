import * as productService from '../services/product.service.js';

export const list = async (req, res) => res.json(await productService.listProducts(req.valid.query));
export const create = async (req, res) =>
  res.status(201).json(await productService.createProduct(req.user.id, req.valid.body));
export const update = async (req, res) =>
  res.json(await productService.updateProduct(req.user.id, req.valid.params.id, req.valid.body));
