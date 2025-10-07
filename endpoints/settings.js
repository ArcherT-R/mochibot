const express = require("express");
const router = express.Router();
const requireLogin = require("../middleware/requireLogin");
const db = require("../endpoints/database");

const {
  getPlayerLabels,
  addPlayerLabel,
  removePlayerLabel,
  getAllPlayerLabels,
  setBirthday,
  getBirthday,
  getAllBirthdays,
  deleteBirthday,
  saveWeeklyHistory,
  resetWeeklyData,
  getLastResetDate,
  getLastWeekHistory,
  searchPlayersByUsername,
  getAllPlayers,
  createPlayerIfNotExists
} = db;

// Leadership ranks
const EXECUTIVE_RANKS = ["Chairman", "Vice Chairman"];

// Middleware to check executive access
function requireExecutive(req, res, next) {
  const player = req.session?.player;
  if (!player || !EXECUTIVE_RANKS.includes(player.group_rank)) {
    return res
      .status(403)
      .json({ error: "Access denied: Requires Vice Chairman+" });
  }
  next();
}

// ----------------------------
// Player Labels
// ----------------------------

router.get("/labels/:roblox_id", requireLogin, async (req, res) => {
  try {
    const labels = await getPlayerLabels(req.params.roblox_id);
    res.json(labels);
  } catch (err) {
    console.error("Error fetching labels:", err);
    res.status(500).json({ error: "Failed to fetch labels" });
  }
});

router.post("/labels", requireLogin, requireExecutive, async (req, res) => {
  try {
    const { roblox_id, username, label } = req.body;
    const result = await addPlayerLabel(roblox_id, username, label);
    res.json(result);
  } catch (err) {
    console.error("Error adding label:", err);
    res.status(500).json({ error: "Failed to add label" });
  }
});

router.delete("/labels", requireLogin, requireExecutive, async (req, res) => {
  try {
    const { roblox_id, label } = req.body;
    const result = await removePlayerLabel(roblox_id, label);
    res.json(result);
  } catch (err) {
    console.error("Error removing label:", err);
    res.status(500).json({ error: "Failed to remove label" });
  }
});

// ----------------------------
// Birthdays
// ----------------------------

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
    const result = await setBirthday(roblox_id, username, birthday);
    res.json(result);
  } catch (err) {
    console.error("Error setting birthday:", err);
    res.status(500).json({ error: "Failed to set birthday" });
  }
});

router.delete("/birthdays/:roblox_id", requireLogin, requireExecutive, async (req, res) => {
  try {
    const result = await deleteBirthday(req.params.roblox_id);
    res.json(result);
  } catch (err) {
    console.error("Error deleting birthday:", err);
    res.status(500).json({ error: "Failed to delete birthday" });
  }
});

// ------------------
// LOA Management
// ------------------

router.get("/loa", requireLogin, async (req, res) => {
  try {
    const player = req.session?.player;
    if (!EXECUTIVE_RANKS.includes(player.group_rank)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const loas = await db.getAllLOA();
    res.json(loas);
  } catch (err) {
    console.error("Error fetching LOAs:", err);
    res.status(500).json({ error: "Failed to fetch LOAs" });
  }
});

router.post("/loa", requireLogin, requireExecutive, async (req, res) => {
  try {
    const { roblox_id, username, start_date, end_date } = req.body;
    const loa = await db.addLOA(roblox_id, username, start_date, end_date);
    res.json(loa);
  } catch (err) {
    console.error("Error adding LOA:", err);
    res.status(500).json({ error: "Failed to add LOA" });
  }
});

router.delete("/loa/:roblox_id", requireLogin, requireExecutive, async (req, res) => {
  try {
    await db.removeLOA(req.params.roblox_id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing LOA:", err);
    res.status(500).json({ error: "Failed to remove LOA" });
  }
});

// Check if player is on LOA
router.get("/loa/check/:roblox_id", requireLogin, async (req, res) => {
  try {
    const isOnLOA = await db.isPlayerOnLOA(req.params.roblox_id);
    res.json({ onLOA: isOnLOA });
  } catch (err) {
    console.error("Error checking LOA:", err);
    res.status(500).json({ error: "Failed to check LOA" });
  }
});

// Delete shift
router.delete("/shifts/:shiftId", requireLogin, requireExecutive, async (req, res) => {
  try {
    await db.deleteShift(req.params.shiftId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting shift:", err);
    res.status(500).json({ error: "Failed to delete shift" });
  }
});

// ----------------------------
// Weekly Reset
// ----------------------------

router.get("/weekly-reset/status", requireLogin, requireExecutive, async (req, res) => {
  try {
    const lastReset = await getLastResetDate();

    // Calculate next Monday at midnight
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setHours(0, 0, 0, 0);
    const daysUntilMonday = (8 - nextReset.getDay()) % 7;
    nextReset.setDate(nextReset.getDate() + daysUntilMonday);

    const players = await getAllPlayers();

    res.json({
      lastReset: lastReset?.reset_date || null,
      nextReset: nextReset.toISOString(),
      playersAffected: lastReset?.players_affected || 0,
      totalPlayers: players.length,
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

// ----------------------------
// Search Players
// ----------------------------

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

// ----------------------------
// Add Player
// ----------------------------

router.post("/add-player", requireLogin, requireExecutive, async (req, res) => {
  try {
    const { roblox_id, username, group_rank, avatar_url, password } = req.body;

    if (!roblox_id || !username || !group_rank || !avatar_url || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate password is 6 digits
    if (!/^\d{6}$/.test(password)) {
      return res.status(400).json({ error: "Password must be 6 digits" });
    }

    const player = await createPlayerIfNotExists({
      roblox_id,
      username,
      avatar_url,
      group_rank,
      password,
    });

    res.json({ success: true, player });
  } catch (err) {
    console.error("Error adding player:", err);
    res.status(500).json({ error: "Failed to add player" });
  }
});

// ----------------------------
// Generate Password
// ----------------------------

router.get("/generate-password", requireLogin, requireExecutive, async (req, res) => {
  try {
    const players = await getAllPlayers();
    const existingPasswords = new Set(players.map((p) => p.password).filter(Boolean));

    let password;
    let attempts = 0;
    const maxAttempts = 1000;

    do {
      password = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;

      if (attempts >= maxAttempts) {
        return res.status(500).json({ error: "Failed to generate unique password" });
      }
    } while (existingPasswords.has(password));

    res.json({ password });
  } catch (err) {
    console.error("Error generating password:", err);
    res.status(500).json({ error: "Failed to generate password" });
  }
});

module.exports = router;
