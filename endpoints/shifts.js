// endpoints/shifts.js
const express = require('express');
const router = express.Router();
const { getAllShifts, getShiftAttendees, addShiftAttendee, removeShiftAttendee } = require('./shiftDB');

router.get('/', async (req, res) => {
  try {
    const shifts = await getAllShifts();
    res.json(shifts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

router.get('/attendees', async (req, res) => {
  try {
    const shiftId = req.query.shiftId;
    if (!shiftId) return res.status(400).json({ error: 'Missing shiftId' });
    const attendees = await getShiftAttendees(shiftId);
    res.json(attendees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

router.post('/add-attendee', async (req, res) => {
  try {
    const { shiftId, roblox_id, username } = req.body;
    if (!shiftId || !roblox_id || !username) return res.status(400).json({ error: 'Missing data' });
    const added = await addShiftAttendee(shiftId, roblox_id, username);
    res.json(added);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

router.post('/remove-attendee', async (req, res) => {
  try {
    const { shiftId, roblox_id } = req.body;
    if (!shiftId || !roblox_id) return res.status(400).json({ error: 'Missing data' });
    const removed = await removeShiftAttendee(shiftId, roblox_id);
    res.json(removed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove attendee' });
  }
});

module.exports = router;
