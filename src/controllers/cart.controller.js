import * as cartService from '../services/cart.service.js';

export const get = async (req, res) => res.json(await cartService.getCart(req.user.id));
export const setItem = async (req, res) => res.json(await cartService.setItem(req.user.id, req.valid.body));
export const removeItem = async (req, res) =>
  res.json(await cartService.removeItem(req.user.id, req.valid.params.productId));
export const clear = async (req, res) => res.json(await cartService.clearCart(req.user.id));
