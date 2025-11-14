// endpoints/maintenance.js
const express = require('express');
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Leadership ranks who can manage maintenance
const EXECUTIVE_RANKS = ['Chairman', 'Vice Chairman'];

// GET /maintenance/status - Check current maintenance status (public)
router.get('/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_status')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    // If no maintenance record exists, assume operational
    if (!data) {
      return res.json({
        maintenance_active: false,
        areas: [
          { name: 'Dashboard', status: 'Operational' },
          { name: 'Player List', status: 'Operational' },
          { name: 'Shifts', status: 'Operational' },
          { name: 'Sessions', status: 'Operational' },
          { name: 'Settings', status: 'Operational' },
          { name: 'Database', status: 'Operational' },
          { name: 'Discord Bot', status: 'Operational' },
          { name: 'API', status: 'Operational' }
        ]
      });
    }
    
    res.json({
      maintenance_active: data.is_active || false,
      description: data.description,
      estimated_completion: data.estimated_completion,
      timezone: data.timezone || 'AEDT',
      areas: data.affected_areas || []
    });
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance status' });
  }
});

// POST /maintenance/set - Set maintenance mode (admin only)
router.post('/set', async (req, res) => {
  try {
    // Check if user is authenticated and has executive rank
    const player = req.session?.player;
    if (!player) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!EXECUTIVE_RANKS.includes(player.group_rank)) {
      return res.status(403).json({ error: 'Access denied: Executive rank required' });
    }
    
    const { is_active, description, estimated_completion, timezone, affected_areas } = req.body;
    
    const { data, error } = await supabase
      .from('maintenance_status')
      .upsert([{
        id: 1, // Use a fixed ID so there's only one maintenance record
        is_active: is_active || false,
        description: description || null,
        estimated_completion: estimated_completion || null,
        timezone: timezone || 'AEDT',
        affected_areas: affected_areas || [],
        updated_at: new Date().toISOString(),
        updated_by: player.username
      }], { onConflict: 'id' })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error setting maintenance status:', error);
    res.status(500).json({ error: 'Failed to set maintenance status' });
  }
});

// GET /maintenance/check - Quick check if maintenance is active (for middleware)
router.get('/check', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_status')
      .select('is_active')
      .eq('id', 1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.json({ 
      maintenance_active: data?.is_active || false 
    });
  } catch (error) {
    console.error('Error checking maintenance:', error);
    res.json({ maintenance_active: false }); // Fail open
  }
});

module.exports = router;
