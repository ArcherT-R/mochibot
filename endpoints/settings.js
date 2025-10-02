const express = require("express");
const router = express.Router();
const {
  getAllBirthdays,
  setBirthday,
  deleteBirthday,
  resetWeeklyData,
  getLastResetDate,
  getLastWeekHistory,
  searchPlayersByUsername
} = require("./database");

const EXECUTIVE_RANKS = ['Chairman', 'Vice Chairman'];

// Middleware to check executive rank
function requireExecutive(req, res, next) {
  const player = req.session?.player;
  if (!player) return res.status(401).json({ error: 'Not authenticated' });
  
  const rank = player.group_rank || player.rank;
  if (!EXECUTIVE_RANKS.includes(rank)) {
    return res.status(403).json({ error: 'Access denied: Requires Chairman or Vice Chairman' });
  }
  next();
}

// Get all birthdays
router.get('/birthdays', requireExecutive, async (req, res) => {
  try {
    const birthdays = await getAllBirthdays();
    res.json(birthdays);
  } catch (err) {
    console.error('Error fetching birthdays:', err);
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

// Set/update birthday
router.post('/birthdays/set', requireExecutive, async (req, res) => {
  try {
    const { roblox_id, username, birthday } = req.body;
    if (!roblox_id || !username || !birthday) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await setBirthday(roblox_id, username, birthday);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error setting birthday:', err);
    res.status(500).json({ error: 'Failed to set birthday' });
  }
});

// Delete birthday
router.delete('/birthdays/:robloxId', requireExecutive, async (req, res) => {
  try {
    await deleteBirthday(req.params.robloxId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting birthday:', err);
    res.status(500).json({ error: 'Failed to delete birthday' });
  }
});

// Get next reset date
router.get('/weekly-reset/status', requireExecutive, async (req, res) => {
  try {
    const lastReset = await getLastResetDate();
    const now = new Date();
    
    // Calculate next Monday at midnight
    const nextReset = new Date(now);
    nextReset.setHours(0, 0, 0, 0);
    const daysUntilMonday = (8 - nextReset.getDay()) % 7 || 7;
    nextReset.setDate(nextReset.getDate() + daysUntilMonday);
    
    res.json({
      lastReset: lastReset?.reset_date || null,
      nextReset: nextReset.toISOString(),
      playersAffected: lastReset?.players_affected || 0
    });
  } catch (err) {
    console.error('Error fetching reset status:', err);
    res.status(500).json({ error: 'Failed to fetch reset status' });
  }
});

// Manual reset (for testing/emergency)
router.post('/weekly-reset/manual', requireExecutive, async (req, res) => {
  try {
    const result = await resetWeeklyData();
    res.json(result);
  } catch (err) {
    console.error('Error performing manual reset:', err);
    res.status(500).json({ error: 'Failed to perform reset' });
  }
});

// Get last week's history
router.get('/weekly-reset/last-week', requireExecutive, async (req, res) => {
  try {
    const history = await getLastWeekHistory();
    res.json(history);
  } catch (err) {
    console.error('Error fetching last week history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Search players for birthday assignment
router.get('/search-players', requireExecutive, async (req, res) => {
  try {
    const q = req.query.username?.trim();
    if (!q) return res.json([]);
    const players = await searchPlayersByUsername(q);
    res.json(players || []);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json([]);
  }
});

module.exports = router;
