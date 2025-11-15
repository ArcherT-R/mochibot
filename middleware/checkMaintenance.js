// middleware/checkMaintenance.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Middleware to check if site is in maintenance mode
 * Redirects ALL users to maintenance page (no bypass)
 * Must be used AFTER requireLogin middleware
 */
async function checkMaintenance(req, res, next) {
  try {
    // IMPORTANT: Don't check maintenance for the maintenance page itself!
    if (req.path === '/maintenance' || req.path.includes('/maintenance')) {
      return next();
    }
    
    // Get maintenance status
    const { data, error } = await supabase
      .from('maintenance_status')
      .select('is_active')
      .eq('id', 1)
      .single();
    
    // If error or no data, fail open (allow access)
    if (error || !data) {
      console.log('No maintenance status found, allowing access');
      return next();
    }
    
    // If maintenance is NOT active, continue normally
    if (!data.is_active) {
      return next();
    }
    
    // Maintenance IS active - redirect ALL users to maintenance page
    const player = req.session?.player;
    console.log(`🔧 Redirecting ${player?.username || 'user'} to maintenance page`);
    return res.redirect('/dashboard/maintenance');
    
  } catch (error) {
    console.error('Maintenance check error:', error);
    next(); // Fail open - allow access on error
  }
}

module.exports = checkMaintenance;
