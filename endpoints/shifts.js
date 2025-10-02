const express = require('express');
const {
  getAllShifts,
  addShift,
  getShiftAttendees,
  addShiftAttendee,
  removeShiftAttendee,
  getShiftByTime
} = require('./database');

const router = express.Router();

// Cache for shifts data
let shiftsCache = null;
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minute in milliseconds

// Get all shifts with caching
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached data if less than 1 minute old
    if (shiftsCache && (now - lastFetch) < CACHE_DURATION) {
      return res.json(shiftsCache);
    }
    
    // Fetch fresh data
    const shifts = await getAllShifts();
    shiftsCache = shifts;
    lastFetch = now;
    
    res.json(shifts);
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// Invalidate cache when shifts are modified
function invalidateCache() {
  shiftsCache = null;
  lastFetch = 0;
}

// Get attendees
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

// Add attendee
router.post('/add-attendee', async (req, res) => {
  const { shiftId, robloxId, username } = req.body;
  if (!shiftId || !robloxId || !username)
    return res.status(400).json({ error: 'Missing data' });
  
  try {
    const attendee = await addShiftAttendee(shiftId, robloxId, username);
    invalidateCache(); // Invalidate cache when data changes
    res.json(attendee);
  } catch (err) {
    console.error('Error adding attendee:', err);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

// Remove attendee
router.post('/remove-attendee', async (req, res) => {
  const { shiftId, robloxId } = req.body;
  if (!shiftId || !robloxId)
    return res.status(400).json({ error: 'Missing data' });
  
  try {
    await removeShiftAttendee(shiftId, robloxId);
    invalidateCache(); // Invalidate cache when data changes
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing attendee:', err);
    res.status(500).json({ error: 'Failed to remove attendee' });
  }
});

// Add new shift (with duplicate prevention)
router.post('/add', async (req, res) => {
  const { shift_time, host, cohost, overseer } = req.body;
  if (!shift_time) return res.status(400).json({ error: 'Missing shift_time' });
  
  try {
    // Check if shift already exists at this time
    const existing = await getShiftByTime(shift_time);
    if (existing) {
      console.log(`Shift already exists at ${shift_time}, skipping duplicate`);
      return res.json({ message: 'Shift already exists', shift: existing });
    }
    
    const shift = await addShift({ shift_time, host, cohost, overseer });
    invalidateCache(); // Invalidate cache when data changes
    res.json(shift);
  } catch (err) {
    console.error('Error adding shift:', err);
    res.status(500).json({ error: 'Failed to add shift' });
  }
});

module.exports = router;
