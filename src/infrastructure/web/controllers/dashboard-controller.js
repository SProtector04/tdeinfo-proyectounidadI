import { parsePeriod } from '../validation.js';

export function dashboardController({ getDashboard }) {
  return {
    async get(req, res, next) {
      try {
        const days = parsePeriod(req.query);
        const result = await getDashboard.execute({ days });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
