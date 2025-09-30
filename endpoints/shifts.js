// endpoints/shifts.js
const express = require('express');
const router = express.Router();
const { supabase } = require('./database'); // or import your supabase client

// Get all players for selection
router.get('/players', async (req, res) => {
  try {
    const { data: players } = await supabase
      .from('players')
      .select('username, roblox_id')
      .order('username', { ascending: true });
    res.json(players || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Add attendee to shift
router.post('/add-attendee', async (req, res) => {
  try {
    const { shiftId, username } = req.body;
    if (!shiftId || !username) return res.status(400).json({ error: 'Missing data' });

    const { data: shiftAttendees } = await supabase
      .from('shift_attendees')
      .insert([{ shift_id: shiftId, username }])
      .select()
      .single();

    res.json(shiftAttendees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

// Remove attendee from shift
router.post('/remove-attendee', async (req, res) => {
  try {
    const { shiftId, username } = req.body;
    if (!shiftId || !username) return res.status(400).json({ error: 'Missing data' });

    const { error } = await supabase
      .from('shift_attendees')
      .delete()
      .eq('shift_id', shiftId)
      .eq('username', username);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove attendee' });
  }
});

module.exports = router;
