const express = require('express');
const router = express.Router();
const { getAllPlayers } = require('./database'); // your database.js

// You should have a table called `shift_attendees` with fields: id (serial), shift_id (int), username (text)
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get attendees for a shift
router.get('/attendees', async (req, res) => {
  const { shiftId } = req.query;
  if (!shiftId) return res.status(400).json({ error: 'Missing shiftId' });

  const { data, error } = await supabase
    .from('shift_attendees')
    .select('*')
    .eq('shift_id', shiftId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get list of all players (for Add New dropdown)
router.get('/players', async (req, res) => {
  try {
    const players = await getAllPlayers();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add attendee
router.post('/add-attendee', async (req, res) => {
  const { shiftId, username } = req.body;
  if (!shiftId || !username) return res.status(400).json({ error: 'Missing shiftId or username' });

  const { data, error } = await supabase
    .from('shift_attendees')
    .insert([{ shift_id: shiftId, username }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, attendee: data[0] });
});

// Remove attendee
router.post('/remove-attendee', async (req, res) => {
  const { shiftId, username } = req.body;
  if (!shiftId || !username) return res.status(400).json({ error: 'Missing shiftId or username' });

  const { error } = await supabase
    .from('shift_attendees')
    .delete()
    .eq('shift_id', shiftId)
    .eq('username', username);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
