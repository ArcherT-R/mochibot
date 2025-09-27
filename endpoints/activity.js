const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

router.post('/', async (req, res) => {
  const { roblox_id, minutes_played } = req.body;

  console.log('Received activity:', req.body);

  if (!roblox_id || !minutes_played) {
    return res.status(400).json({ error: 'Missing roblox_id or minutes_played' });
  }

  try {
    // 1️⃣ Fetch current total_activity
    const { data: playerData, error: fetchError } = await supabase
      .from('players')
      .select('total_activity')
      .eq('roblox_id', roblox_id)
      .single();

    if (fetchError) throw fetchError;
    if (!playerData) return res.status(404).json({ error: 'Player not found' });

    console.log('Current total_activity:', playerData.total_activity);

    // 2️⃣ Update total_activity
    const { error: updateError } = await supabase
      .from('players')
      .update({
        total_activity: (playerData.total_activity || 0) + minutes_played
      })
      .eq('roblox_id', roblox_id);

    if (updateError) throw updateError;

    console.log(`Updated player ${roblox_id} total_activity by ${minutes_played} minutes`);

    res.json({ success: true });
  } catch (err) {
    console.error('Activity endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
