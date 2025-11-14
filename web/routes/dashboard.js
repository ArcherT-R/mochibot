const express = require("express");
const router = express.Router();
const requireLogin = require("../../middleware/requireLogin");
const checkMaintenance = require("../../middleware/checkMaintenance");
const db = require("../../endpoints/database");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const {
  getAllPlayers,
  getPlayerByUsername,
  getPlayerSessions,
  getOngoingSession,
  searchPlayersByUsername,
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement,
  getPlayerByRobloxId
} = require("../../endpoints/database");

// ----------------------------
// Leadership ranks
// ----------------------------
const LEADERSHIP_RANKS = [
  'Chairman', 'Vice Chairman', 'Chief Administrative Officer', 'Leadership Overseer', 
  'Chief of Operations', 'Chief of Human Resources', 'Chief Of Public Relations'
];

const CORPORATE_RANKS = [
  'Chairman', 'Vice Chairman', 'Chief Administrative Officer', 'Leadership Overseer',
  'Chief of Operations', 'Chief of Human Resources', 'Chief Of Public Relations',
  'Head Corporate', 'Senior Corporate', 'Junior Corporate', 'Corporate Intern'
];

const EXECUTIVE_RANKS = ['Chairman', 'Vice Chairman'];

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
// Maintenance status page (public, no auth needed)
// ----------------------------
router.get("/maintenance", async (req, res) => {
  try {
    // Check if maintenance is actually active
    const { data } = await supabase
      .from('maintenance_status')
      .select('*')
      .eq('id', 1)
      .single();
    
    // If not in maintenance AND user is logged in, redirect to dashboard
    if (!data?.is_active && req.session?.player) {
      return res.redirect('/dashboard');
    }
    
    // Serve the maintenance page
    res.sendFile('maintenance.html', { root: './web/public' });
  } catch (error) {
    console.error('Error loading maintenance page:', error);
    res.status(500).send('Error loading maintenance page');
  }
});

// ----------------------------
// Main dashboard (protected + maintenance check)
// ----------------------------
router.get("/", requireLogin, checkMaintenance, async (req, res) => {
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
// Log out route (always accessible, no maintenance check)
// ----------------------------
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out' });
  });
});

// ----------------------------
// Announcements endpoints
// ----------------------------
router.get("/announcements", requireLogin, checkMaintenance, async (req, res) => {
  try {
    const announcements = await getAnnouncements();
    res.json(announcements);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.post("/announcements", requireLogin, checkMaintenance, async (req, res) => {
  try {
    const { title, content } = req.body;
    const player = req.session?.player;
    
    if (!LEADERSHIP_RANKS.includes(player.group_rank)) {
      return res.status(403).json({ error: "Only leadership can create announcements" });
    }
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }
    
    const announcement = await addAnnouncement(title, content, player.username);
    res.status(201).json(announcement);
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

router.delete("/announcements", requireLogin, checkMaintenance, async (req, res) => {
  try {
    const { id, title, date } = req.body;
    const player = req.session?.player;
    
    if (!LEADERSHIP_RANKS.includes(player.group_rank)) {
      return res.status(403).json({ error: "Only leadership can delete announcements" });
    }
    
    if (!id && (!title || !date)) {
      return res.status(400).json({ error: "Either announcement ID or both title and date are required" });
    }
    
    try {
      if (id) {
        await deleteAnnouncement(id);
      } else {
        await deleteAnnouncement(null, title, date);
      }
      
      res.json({ success: true, message: "Announcement deleted successfully" });
    } catch (deleteError) {
      console.error("Database error deleting announcement:", deleteError);
      res.status(500).json({ error: "Failed to delete announcement from database" });
    }
  } catch (err) {
    console.error("Error deleting announcement:", err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// ----------------------------
// Current user endpoint (no maintenance check - needed for API)
// ----------------------------
router.get('/current-user', requireLogin, async (req, res) => {
  try {
    const currentUser = req.session?.player;
    
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userData = await db.getPlayerByRobloxId(currentUser.roblox_id);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      username: userData.username,
      roblox_id: userData.roblox_id,
      group_rank: userData.group_rank,
      avatar_url: userData.avatar_url,
      password: userData.password,
      weekly_minutes: userData.weekly_minutes
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// ----------------------------
// Player profile page
// ----------------------------
router.get("/player/:username", requireLogin, checkMaintenance, async (req, res) => {
  try {
    const username = req.params.username;
    const currentPlayer = req.session?.player;

    const player = await getPlayerByUsername(username);
    if (!player) return res.status(404).send("Player not found");

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
// Top players (API endpoint, no maintenance check for data)
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
// Full players list (API endpoint, no maintenance check for data)
// ----------------------------
router.get("/players", requireLogin, async (req, res) => {
  try {
    const player = req.session?.player;
    if (!player) return res.status(401).json({ error: 'Not authenticated' });

    if (!CORPORATE_RANKS.includes(player.group_rank)) {
      return res.status(403).json({ error: 'Access denied: Corporate rank or higher required' });
    }

    const players = await getAllPlayers();
    res.json(players);
  } catch (err) {
    console.error("Error fetching players:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// ----------------------------
// Player search (API endpoint, no maintenance check for data)
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
