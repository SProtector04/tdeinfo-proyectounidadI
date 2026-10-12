import { validateLoginBody } from '../validation.js';

export function authController({ login, logout }) {
  return {
    async login(req, res, next) {
      try {
        const { username, password } = validateLoginBody(req.body);
        const result = await login.execute({ username, password });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async logout(req, res, next) {
      try {
        await logout.execute({ token: req.token, userId: req.user?.id });
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },

    me(req, res) {
      const { id, name, username, role } = req.user;
      res.json({ id, name, username, role });
    },
  };
}
