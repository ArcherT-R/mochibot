// middleware/requireLogin.js
module.exports = function requireLogin(req, res, next) {
  if (req.session && req.session.player) return next();
  res.redirect('/loginpage/login');
};

// ===================================

// middleware/checkMaintenance.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const EXECUTIVE_RANKS = ['Chairman', 'Vice Chairman'];

/**
 * Middleware to check if site is in maintenance mode
 * Redirects non-executive users to maintenance page
 * Must be used AFTER requireLogin middleware
 */
async function checkMaintenance(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('maintenance_status')
      .select('is_active')
      .eq('id', 1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Maintenance check error:', error);
      return next(); // Fail open - allow access on error
    }
    
    // If maintenance is active
    if (data?.is_active) {
      const player = req.session?.player;
      
      // Allow executives to bypass maintenance
      if (!player || !EXECUTIVE_RANKS.includes(player.group_rank)) {
        // Don't redirect if already on maintenance-related pages
        if (req.path.includes('/maintenance') || req.path === '/logout') {
          return next();
        }
        return res.redirect('/dashboard/maintenance');
      }
    }
    
    next();
  } catch (error) {
    console.error('Maintenance check error:', error);
    next(); // Fail open - allow access on error
  }
}

module.exports = checkMaintenance;

// ===================================

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

// ===================================

// middleware/index.js (optional - for easier imports)
module.exports = {
  requireLogin: require('./requireLogin'),
  checkMaintenance: require('./checkMaintenance'),
  requireLoginAndMaintenance: require('./requireLoginAndMaintenance')
};
