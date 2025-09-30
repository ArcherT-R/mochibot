// web/routes/shifts.js
const express = require("express");
const router = express.Router();
const { 
    getAllShifts,        // Returns all shifts from DB
    getShiftAttendees,   // Returns attendees for a shift
    addShiftAttendee,    // Adds a player to shift_attendees
    removeShiftAttendee  // Removes a player from shift_attendees
} = require("../../endpoints/shiftsDB"); // We'll implement these in DB layer

// ----------------------------
// Get upcoming shifts
// ----------------------------
router.get("/sessions", async (req, res) => {
    try {
        const allShifts = await getAllShifts();
        const now = Math.floor(Date.now() / 1000);
        const upcoming = allShifts.filter(s => s.time && s.time > now)
                                  .sort((a,b) => a.time - b.time);
        res.json(upcoming);
    } catch (err) {
        console.error("Failed to fetch shifts:", err);
        res.status(500).json({ error: "Failed to fetch shifts" });
    }
});

// ----------------------------
// Get attendees for a shift
// ----------------------------
router.get("/shifts/attendees", async (req, res) => {
    const shiftId = req.query.shiftId;
    if (!shiftId) return res.status(400).json({ error: "Missing shiftId" });

    try {
        const attendees = await getShiftAttendees(shiftId);
        res.json(attendees); // [{username}]
    } catch (err) {
        console.error(`Failed to get attendees for shift ${shiftId}:`, err);
        res.status(500).json({ error: "Failed to fetch attendees" });
    }
});

// ----------------------------
// Add attendee
// ----------------------------
router.post("/shifts/add-attendee", async (req, res) => {
    const { shiftId, username } = req.body;
    if (!shiftId || !username) return res.status(400).json({ error: "Missing shiftId or username" });

    try {
        await addShiftAttendee(shiftId, username);
        const attendees = await getShiftAttendees(shiftId);
        res.json(attendees);
    } catch (err) {
        console.error(`Failed to add attendee ${username} to shift ${shiftId}:`, err);
        res.status(500).json({ error: "Failed to add attendee" });
    }
});

// ----------------------------
// Remove attendee
// ----------------------------
router.post("/shifts/remove-attendee", async (req, res) => {
    const { shiftId, username } = req.body;
    if (!shiftId || !username) return res.status(400).json({ error: "Missing shiftId or username" });

    try {
        await removeShiftAttendee(shiftId, username);
        const attendees = await getShiftAttendees(shiftId);
        res.json(attendees);
    } catch (err) {
        console.error(`Failed to remove attendee ${username} from shift ${shiftId}:`, err);
        res.status(500).json({ error: "Failed to remove attendee" });
    }
});

module.exports = router;
