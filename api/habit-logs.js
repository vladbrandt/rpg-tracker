// Re-export habits handler with logs flag
import handler from './habits.js';
export default (req, res) => {
  req.query = req.query || {};
  req.query.logs = '1';
  return handler(req, res);
};
