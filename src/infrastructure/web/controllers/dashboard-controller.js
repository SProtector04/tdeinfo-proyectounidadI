export function dashboardController({ getDashboard }) {
  return {
    get(_req, res, next) {
      try {
        res.json(getDashboard.execute());
      } catch (err) {
        next(err);
      }
    },
  };
}
