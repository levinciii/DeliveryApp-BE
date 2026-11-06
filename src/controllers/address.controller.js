import * as addressService from '../services/address.service.js';

export const list = async (req, res) => res.json(await addressService.listAddresses(req.user.id));
export const create = async (req, res) =>
  res.status(201).json(await addressService.createAddress(req.user.id, req.valid.body));
export const remove = async (req, res) => {
  await addressService.deleteAddress(req.user.id, req.valid.params.id);
  res.status(204).end();
};
