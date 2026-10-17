import * as authService from '../services/auth.service.js';

// Express 5 forwards errors from async handlers automatically, so no try/catch is needed here.
export const register = async (req, res) => res.status(201).json(await authService.register(req.valid.body));
export const login = async (req, res) => res.json(await authService.login(req.valid.body));
export const refresh = async (req, res) => res.json(await authService.refresh(req.valid.body.refreshToken));
export const logout = async (req, res) => {
  await authService.logout(req.valid.body.refreshToken);
  res.status(204).end();
};
