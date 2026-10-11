export function usersController({ listUsers, createUser }) {
  return {
    async list(_req, res, next) {
      try {
        const result = await listUsers.execute();
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    async create(req, res, next) {
      try {
        const { name, username, password, role } = req.body ?? {};
        const result = await createUser.execute({
          name,
          username,
          password,
          role,
          actorUserId: req.user.id,
        });
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
