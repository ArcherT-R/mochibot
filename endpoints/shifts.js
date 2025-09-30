const express = require('express');
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// -------------------------
// Database functions
// -------------------------

async function getAllShifts() {
  const { data, error } = await supabase.from("shifts").select("*").order("time", { ascending: true });
  if (error) throw error;
  return data;
}

async function getShiftAttendees(shiftId) {
  const { data, error } = await supabase.from("shift_attendees").select("*").eq("shift_id", shiftId);
  if (error) throw error;
  return data;
}

async function addShiftAttendee(shiftId, username) {
  const { data, error } = await supabase.from("shift_attendees").insert([{ shift_id: shiftId, username }]).select().single();
  if (error) throw error;
  return data;
}

async function removeShiftAttendee(shiftId, username) {
  const { error } = await supabase.from("shift_attendees").delete().eq("shift_id", shiftId).eq("username", username);
  if (error) throw error;
  return { success: true };
}

// -------------------------
// Routes
// -------------------------

// Get all shifts
router.get("/", async (req, res) => {
  try {
    const shifts = await getAllShifts();
    res.json(shifts);
  } catch (err) {
    console.error("Failed to fetch shifts:", err);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

// Get attendees for a shift
router.get("/attendees", async (req, res) => {
  try {
    const { shiftId } = req.query;
    if (!shiftId) return res.status(400).json({ error: "Missing shiftId" });
    const attendees = await getShiftAttendees(shiftId);
    res.json(attendees);
  } catch (err) {
    console.error("Failed to fetch attendees:", err);
    res.status(500).json({ error: "Failed to fetch attendees" });
  }
});

// Add an attendee
router.post("/add-attendee", async (req, res) => {
  try {
    const { shiftId, username } = req.body;
    if (!shiftId || !username) return res.status(400).json({ error: "Missing data" });
    const result = await addShiftAttendee(shiftId, username);
    res.json(result);
  } catch (err) {
    console.error("Failed to add attendee:", err);
    res.status(500).json({ error: "Failed to add attendee" });
  }
});

// Remove an attendee
router.post("/remove-attendee", async (req, res) => {
  try {
    const { shiftId, username } = req.body;
    if (!shiftId || !username) return res.status(400).json({ error: "Missing data" });
    const result = await removeShiftAttendee(shiftId, username);
    res.json(result);
  } catch (err) {
    console.error("Failed to remove attendee:", err);
    res.status(500).json({ error: "Failed to remove attendee" });
  }
});

// Export the router
module.exports = router;
