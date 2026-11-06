import * as orderService from '../services/order.service.js';

export const quote = async (req, res) => res.json(await orderService.quoteOrder(req.user.id, req.valid.body));
export const place = async (req, res) => res.status(201).json(await orderService.placeOrder(req.user.id, req.valid.body));
export const list = async (req, res) => res.json(await orderService.listOrders(req.user, req.valid.query));
export const get = async (req, res) => res.json(await orderService.getOrder(req.user, req.valid.params.id));
export const updateStatus = async (req, res) =>
  res.json(await orderService.updateStatus(req.user, req.valid.params.id, req.valid.body.status));
