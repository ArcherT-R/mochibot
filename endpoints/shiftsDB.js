const express = require('express');
const router = express.Router();
const { getAllShifts, getShiftAttendees, addShiftAttendee, removeShiftAttendee } = require('./shiftDB'); // your functions

// Get all shifts
router.get('/', async (req, res) => {
    try {
        const shifts = await getAllShifts();
        res.json(shifts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shifts' });
    }
});

// Get attendees for a shift
router.get('/attendees', async (req, res) => {
    try {
        const shiftId = req.query.shiftId;
        const attendees = await getShiftAttendees(shiftId);
        res.json(attendees);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch attendees' });
    }
});

// Add attendee
router.post('/add-attendee', async (req, res) => {
    try {
        const { shiftId, username } = req.body;
        await addShiftAttendee(shiftId, username);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add attendee' });
    }
});

// Remove attendee
router.post('/remove-attendee', async (req, res) => {
    try {
        const { shiftId, username } = req.body;
        await removeShiftAttendee(shiftId, username);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to remove attendee' });
    }
});

module.exports = router;
