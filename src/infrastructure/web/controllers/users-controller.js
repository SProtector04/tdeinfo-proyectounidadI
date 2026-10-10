export function usersController({ listUsers, createUser }) {
  return {
    list(_req, res, next) {
      try {
        res.json(listUsers.execute());
      } catch (err) {
        next(err);
      }
    },

    create(req, res, next) {
      try {
        const { name, username, password, role } = req.body ?? {};
        const result = createUser.execute({
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
