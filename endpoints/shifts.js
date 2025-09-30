// endpoints/shifts.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// -------------------------
// Shift DB Functions
// -------------------------

async function getAllShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .order('time', { ascending: true });
  if (error) throw error;
  return data;
}

async function getShiftAttendees(shiftId) {
  const { data, error } = await supabase
    .from('shift_attendees')
    .select('*')
    .eq('shift_id', shiftId);
  if (error) throw error;
  return data;
}

async function addShiftAttendee(shiftId, robloxId, username) {
  const { data, error } = await supabase
    .from('shift_attendees')
    .insert([{ shift_id: shiftId, roblox_id: robloxId, username }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function removeShiftAttendee(shiftId, robloxId) {
  const { error } = await supabase
    .from('shift_attendees')
    .delete()
    .eq('shift_id', shiftId)
    .eq('roblox_id', robloxId);
  if (error) throw error;
  return { success: true };
}

// -------------------------
// Express Router
// -------------------------
const router = express.Router();

// Get all shifts
router.get('/', async (req, res) => {
  try {
    const shifts = await getAllShifts();
    res.json(shifts);
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// Get attendees for a shift
router.get('/attendees', async (req, res) => {
  const shiftId = req.query.shiftId;
  if (!shiftId) return res.status(400).json({ error: 'Missing shiftId' });

  try {
    const attendees = await getShiftAttendees(shiftId);
    res.json(attendees);
  } catch (err) {
    console.error('Error fetching shift attendees:', err);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

// Add an attendee
router.post('/add-attendee', async (req, res) => {
  const { shiftId, robloxId, username } = req.body;
  if (!shiftId || !robloxId || !username)
    return res.status(400).json({ error: 'Missing data' });

  try {
    const attendee = await addShiftAttendee(shiftId, robloxId, username);
    res.json(attendee);
  } catch (err) {
    console.error('Error adding attendee:', err);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

// Remove an attendee
router.post('/remove-attendee', async (req, res) => {
  const { shiftId, robloxId } = req.body;
  if (!shiftId || !robloxId)
    return res.status(400).json({ error: 'Missing data' });

  try {
    await removeShiftAttendee(shiftId, robloxId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing attendee:', err);
    res.status(500).json({ error: 'Failed to remove attendee' });
  }
});

// -------------------------
// Export router only
// -------------------------
module.exports = router;
