// endpoints/shifts.js
const express = require('express');
const router = express.Router();
const db = require('./database');

// Get list of all players for attendee picker
router.get('/players', async (req, res) => {
  try {
    const players = await db.getAllPlayers();
    res.json(players);
  } catch (err) {
    console.error('Error getting players:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Add attendee to shift
router.post('/add-attendee', async (req, res) => {
  const { shiftId, username } = req.body;
  if (!shiftId || !username) return res.status(400).json({ error: 'Missing data' });

  try {
    const { data, error } = await db.supabase
      .from('shift_attendees')
      .insert([{ shift_id: shiftId, username }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error adding attendee:', err);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

// Remove attendee
router.post('/remove-attendee', async (req, res) => {
  const { shiftId, username } = req.body;
  if (!shiftId || !username) return res.status(400).json({ error: 'Missing data' });

  try {
    const { error } = await db.supabase
      .from('shift_attendees')
      .delete()
      .eq('shift_id', shiftId)
      .eq('username', username);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing attendee:', err);
    res.status(500).json({ error: 'Failed to remove attendee' });
  }
});

// Get attendees for a shift
router.get('/:shiftId/attendees', async (req, res) => {
  const { shiftId } = req.params;
  try {
    const { data, error } = await db.supabase
      .from('shift_attendees')
      .select('username')
      .eq('shift_id', shiftId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error getting attendees:', err);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

module.exports = router;
