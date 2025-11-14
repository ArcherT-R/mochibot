// middleware/requireLogin.js
module.exports = function requireLogin(req, res, next) {
  if (req.session && req.session.player) return next();
  res.redirect('/loginpage/login');
};

// ========================

// ===================================

// middleware/index.js (optional - for easier imports)
module.exports = {
  requireLogin: require('./requireLogin'),
  checkMaintenance: require('./checkMaintenance'),
  requireLoginAndMaintenance: require('./requireLoginAndMaintenance')
};
