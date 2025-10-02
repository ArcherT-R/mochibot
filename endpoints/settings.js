const express = require("express");
const router = express.Router();
const requireLogin = require("../middleware/requireLogin");
const {
  setBirthday,
  getBirthday,
  getAllBirthdays,
  deleteBirthday,
  getAllPlayers,
  searchPlayersByUsername,
  saveWeeklyHistory,
  resetWeeklyData,
  getLastResetDate,
  getLastWeekHistory,
  getPlayerLabels,
  addPlayerLabel,
  removePlayerLabel,
  getAllPlayerLabels
} = require("../endpoints/database");

const EXECUTIVE_RANKS = ['Chairman', 'Vice Chairman'];

// Middleware to check executive access
function requireExecutive(req, res, next) {
  const player = req.session?.player;
  if (!player || !EXECUTIVE_RANKS.includes(player.group_rank)) {
    return res.status(403).json({ error: 'Access denied: Requires Vice Chairman+' });
  }
  next();
}

// -------------------------
// Labels Routes
// -------------------------

// Get labels for a specific player
router.get("/labels/:robloxId", requireLogin, async (req, res) => {
  try {
    const robloxId = parseInt(req.params.robloxId);
    const labels = await getPlayerLabels(robloxId);
    res.json(labels);
  } catch (err) {
    console.error("Error fetching player labels:", err);
    res.status(500).json({ error: "Failed to fetch labels" });
  }
});

// Add a label to a player
router.post("/labels", requireLogin, requireExecutive, async (req, res) => {
  try {
    const { roblox_id, username, label } = req.body;
    
    if (!roblox_id || !username || !label) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const validLabels = ['Management', 'Public Relations', 'Operations', 'Human Resources'];
    if (!validLabels.includes(label)) {
      return res.status(400).json({ error: "Invalid label" });
    }
    
    const result = await addPlayerLabel(roblox_id, username, label);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error adding player label:", err);
    res.status(500).json({ error: "Failed to add label" });
  }
});

// Remove a label from a player
router.delete("/labels", requireLogin, requireExecutive, async (req, res) => {
  try {
    const { roblox_id, label } = req.body;
    
    if (!roblox_id || !label) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    await removePlayerLabel(roblox_id, label);
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing player label:", err);
    res.status(500).json({ error: "Failed to remove label" });
  }
});

// Get all labels
router.get("/labels", requireLogin, async (req, res) => {
  try {
    const labels = await getAllPlayerLabels();
    res.json(labels);
  } catch (err) {
    console.error("Error fetching all labels:", err);
    res.status(500).json({ error: "Failed to fetch labels" });
  }
});

// -------------------------
// Birthday Routes
// -------------------------

router.get("/birthdays", requireLogin, async (req, res) => {
  try {
    const birthdays = await getAllBirthdays();
    res.json(birthdays);
  } catch (err) {
    console.error("Error fetching birthdays:", err);
    res.status(500).json({ error: "Failed to fetch birthdays" });
  }
});

router.post("/birthdays/set", requireLogin, requireExecutive, async (req, res) => {
  try {
    const { roblox_id, username, birthday } = req.body;
    
    if (!roblox_id || !username || !birthday) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const result = await setBirthday(roblox_id, username, birthday);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error setting birthday:", err);
    res.status(500).json({ error: "Failed to set birthday" });
  }
});

router.delete("/birthdays/:robloxId", requireLogin, requireExecutive, async (req, res) => {
  try {
    const robloxId = parseInt(req.params.robloxId);
    await deleteBirthday(robloxId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting birthday:", err);
    res.status(500).json({ error: "Failed to delete birthday" });
  }
});

// -------------------------
// Player Search for Settings
// -------------------------

router.get("/search-players", requireLogin, requireExecutive, async (req, res) => {
  try {
    const q = req.query.username?.trim();
    if (!q) return res.json([]);
    
    const players = await searchPlayersByUsername(q);
    res.json(players || []);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json([]);
  }
});

// -------------------------
// Weekly Reset Routes
// -------------------------

router.get("/weekly-reset/status", requireLogin, requireExecutive, async (req, res) => {
  try {
    const lastReset = await getLastResetDate();
    const allPlayers = await getAllPlayers();
    
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((8 - now.getDay()) % 7));
    nextMonday.setHours(0, 0, 0, 0);
    
    res.json({
      lastReset: lastReset?.reset_date || null,
      nextReset: nextMonday.toISOString(),
      playersAffected: allPlayers.length
    });
  } catch (err) {
    console.error("Error fetching reset status:", err);
    res.status(500).json({ error: "Failed to fetch reset status" });
  }
});

router.post("/weekly-reset/manual", requireLogin, requireExecutive, async (req, res) => {
  try {
    const result = await resetWeeklyData();
    res.json(result);
  } catch (err) {
    console.error("Error performing manual reset:", err);
    res.status(500).json({ error: "Failed to perform reset" });
  }
});

router.get("/weekly-reset/last-week", requireLogin, requireExecutive, async (req, res) => {
  try {
    const history = await getLastWeekHistory();
    res.json(history);
  } catch (err) {
    console.error("Error fetching last week history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router;
