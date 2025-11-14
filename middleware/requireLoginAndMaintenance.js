// middleware/requireLoginAndMaintenance.js
// Combined middleware for convenience
const requireLogin = require('./requireLogin');
const checkMaintenance = require('./checkMaintenance');

/**
 * Combined middleware that checks both login and maintenance status
 * Use this instead of separate requireLogin + checkMaintenance
 */
function requireLoginAndMaintenance(req, res, next) {
  // First check login
  if (!req.session || !req.session.player) {
    return res.redirect('/loginpage/login');
  }
  
  // Then check maintenance
  checkMaintenance(req, res, next);
}

module.exports = requireLoginAndMaintenance;
