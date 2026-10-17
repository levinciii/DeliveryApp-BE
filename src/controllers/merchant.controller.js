import * as merchantService from '../services/merchant.service.js';

export const create = async (req, res) =>
  res.status(201).json(await merchantService.createMerchant(req.user.id, req.valid.body));
export const list = async (req, res) => res.json(await merchantService.listMerchants(req.valid.query));
export const approve = async (req, res) =>
  res.json(await merchantService.approveMerchant(req.user.id, req.valid.params.id));
export const createBranch = async (req, res) =>
  res.status(201).json(await merchantService.createBranch(req.user.id, req.valid.params.id, req.valid.body));
