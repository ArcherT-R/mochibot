const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- Middleware to ensure JSON parsing ---
router.use(express.json());

router.post('/', async (req, res) => {
  console.log('💡 /activity endpoint called');

  const { roblox_id, username, minutes_played } = req.body;

  console.log('📥 Received body:', req.body);

  if (!roblox_id || !username || minutes_played == null) {
    console.warn('⚠ Missing fields in request body');
    return res.status(400).json({ error: 'Missing roblox_id, username, or minutes_played' });
  }

  try {
    // Insert or update activity log for today
    const today = new Date().toISOString().split('T')[0];

    // Check if an entry already exists for this Roblox ID today
    const { data: existing, error: selectError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('roblox_id', roblox_id)
      .eq('date', today)
      .limit(1);

    if (selectError) throw selectError;

    if (existing && existing.length > 0) {
      // Update existing entry
      const log = existing[0];
      const { error: updateError } = await supabase
        .from('activity_logs')
        .update({ minutes_played: log.minutes_played + minutes_played })
        .eq('id', log.id);

      if (updateError) throw updateError;

      console.log(`🔄 Updated activity for ${username} (+${minutes_played} mins)`);
    } else {
      // Insert new entry
      const { error: insertError } = await supabase.from('activity_logs').insert([
        { roblox_id, date: today, minutes_played }
      ]);

      if (insertError) throw insertError;

      console.log(`➕ Inserted new activity for ${username} (${minutes_played} mins)`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error logging activity:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

module.exports = router;
