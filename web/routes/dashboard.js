const express = require("express");
const router = express.Router();
const requireLogin = require("../../middleware/requireLogin");
const {
  getAllPlayers,
  getPlayerByUsername,
  getPlayerSessions,
  getOngoingSession,
  searchPlayersByUsername
} = require("../../endpoints/database");

// ----------------------------
// Leadership ranks (word-based)
// ----------------------------
const LEADERSHIP_RANKS = [
  'Chairman', 'Vice Chairman', 'Chief Administrative Officer', 'Developer',
  'Chief of Operations', 'Chief of Human Resources', 'Chief Of Public Relations',
  'Head Corporate', 'Senior Corporate', 'Junior Corporate', 'Corporate Intern'
];

// ----------------------------
// Helper: Attach ongoing session data to players
// ----------------------------
async function attachLiveSessionData(players) {
  return await Promise.all(players.map(async (player) => {
    const ongoing = await getOngoingSession(player.roblox_id);
    player.ongoing_session_start_time = ongoing?.session_start_time || null;
    return player;
  }));
}

// ----------------------------
// Main dashboard (protected)
// ----------------------------
router.get("/", requireLogin, async (req, res) => {
  try {
    const allPlayers = await getAllPlayers();
    const topPlayersRaw = [...allPlayers]
      .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
      .slice(0, 8);
    const topPlayers = await attachLiveSessionData(topPlayersRaw);

    const player = req.session?.player || null;
    res.render("dashboard", { players: allPlayers, topPlayers, player });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ----------------------------
// Current user endpoint
// ----------------------------
router.get("/current-user", requireLogin, async (req, res) => {
  try {
    const player = req.session?.player;
    if (!player) return res.status(401).json({ error: 'Not authenticated' });

    console.log('Current user session data:', player);

    res.json({
      username: player.username,
      roblox_id: player.roblox_id,
      password: player.password || null,      
      group_rank: player.group_rank || 'Guest',
    });
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});

// ----------------------------
// Player profile page
// ----------------------------
router.get("/player/:username", requireLogin, async (req, res) => {
  try {
    const username = req.params.username;
    const currentPlayer = req.session?.player;

    const player = await getPlayerByUsername(username);
    if (!player) return res.status(404).send("Player not found");

    // Leadership check
    const isLeader = LEADERSHIP_RANKS.includes(currentPlayer.group_rank);
    if (!isLeader && currentPlayer.username !== username) {
      return res.status(403).send("Access denied");
    }

    const sessions = await getPlayerSessions(player.roblox_id);
    const ongoingSession = await getOngoingSession(player.roblox_id);

    res.render("player", { 
      player, 
      sessions, 
      shifts: { attended: 0, hosted: 0 }, 
      ongoingSession 
    });
  } catch (err) {
    console.error("Error loading player page:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ----------------------------
// Top players (everyone)
// ----------------------------
router.get("/top-players", requireLogin, async (req, res) => {
  try {
    const players = await getAllPlayers();
    const withLiveData = await attachLiveSessionData(players);
    const sorted = withLiveData
      .map(p => ({
        ...p,
        live_total_minutes: (p.weekly_minutes || 0) + 
          (p.ongoing_session_start_time ? ((Date.now() - new Date(p.ongoing_session_start_time).getTime()) / 1000 / 60) : 0)
      }))
      .sort((a, b) => b.live_total_minutes - a.live_total_minutes)
      .slice(0, 8);

    res.json(sorted);
  } catch (err) {
    console.error("Error fetching top players:", err);
    res.status(500).json({ error: "Failed to fetch top players" });
  }
});

// ----------------------------
// Full players list (leadership only)
// ----------------------------
router.get("/players", requireLogin, async (req, res) => {
  try {
    const player = req.session?.player;
    if (!player) return res.status(401).json({ error: 'Not authenticated' });

    if (!LEADERSHIP_RANKS.includes(player.group_rank)) {
      return res.status(403).json({ error: 'Access denied: Leadership rank required' });
    }

    const players = await getAllPlayers();
    res.json(players);
  } catch (err) {
    console.error("Error fetching players:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// ----------------------------
// Player search (leadership only)
// ----------------------------
router.get("/search", requireLogin, async (req, res) => {
  try {
    const player = req.session?.player;
    if (!player) return res.status(401).json({ error: 'Not authenticated' });

    if (!LEADERSHIP_RANKS.includes(player.group_rank)) {
      return res.status(403).json({ error: 'Access denied: Leadership rank required' });
    }

    const q = req.query.username?.trim();
    if (!q) return res.json([]);
    const players = await searchPlayersByUsername(q);
    res.json(players || []);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json([]);
  }
});

module.exports = router;
