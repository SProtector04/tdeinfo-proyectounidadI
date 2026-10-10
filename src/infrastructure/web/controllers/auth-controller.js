export function authController({ login, logout }) {
  return {
    login(req, res, next) {
      try {
        const { username, password } = req.body ?? {};
        const result = login.execute({ username, password });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    logout(req, res, next) {
      try {
        logout.execute({ token: req.token, userId: req.user?.id });
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
