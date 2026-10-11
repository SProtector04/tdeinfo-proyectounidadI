export function dashboardController({ getDashboard }) {
  return {
    async get(_req, res, next) {
      try {
        const result = await getDashboard.execute();
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
