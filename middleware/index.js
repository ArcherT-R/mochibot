
// middleware/index.js (optional - for easier imports)
module.exports = {
  requireLogin: require('./requireLogin'),
  checkMaintenance: require('./checkMaintenance'),
  requireLoginAndMaintenance: require('./requireLoginAndMaintenance')
};
