import * as branchService from '../services/branch.service.js';

export const list = async (req, res) => res.json(await branchService.listBranches(req.valid.query));
export const get = async (req, res) => res.json(await branchService.getBranch(req.valid.params.id));
