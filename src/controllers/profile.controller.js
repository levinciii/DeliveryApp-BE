import * as profileService from '../services/profile.service.js';

export const get = async (req, res) => res.json(await profileService.getProfile(req.user.id));
export const update = async (req, res) => res.json(await profileService.updateProfile(req.user.id, req.valid.body));
