// middleware/checkMaintenance.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Middleware to check if site is in maintenance mode
 * Redirects ALL users to maintenance page (no bypass)
 * Must be used AFTER requireLogin middleware
 */
async function checkMaintenance(req, res, next) {
  // FIRST: Check if we're already on maintenance-related paths
  // This MUST be first to prevent redirect loops
  if (req.path === '/maintenance' || 
      req.path.startsWith('/maintenance') || 
      req.originalUrl.includes('/maintenance')) {
    console.log('✅ On maintenance page, allowing access');
    return next();
  }

  try {
    // Get maintenance status from database
    const { data, error } = await supabase
      .from('maintenance_status')
      .select('is_active')
      .eq('id', 1)
      .single();
    
    // If error or no data, fail open (allow access)
    if (error || !data) {
      console.log('⚠️ No maintenance status found, allowing access');
      return next();
    }
    
    // If maintenance is NOT active, continue normally
    if (!data.is_active) {
      console.log('✅ Maintenance is OFF, allowing access');
      return next();
    }
    
    // Maintenance IS active - redirect to maintenance page
    const player = req.session?.player;
    console.log(`🔧 Maintenance is ON - Redirecting ${player?.username || 'user'} to /dashboard/maintenance`);
    return res.redirect('/dashboard/maintenance');
    
  } catch (error) {
    console.error('❌ Maintenance check error:', error);
    next(); // Fail open - allow access on error
  }
}

module.exports = checkMaintenance;
