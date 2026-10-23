const app = require('../server/src/index');

module.exports = (req, res) => {
  // Ensure the /api path is preserved for Express router
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
