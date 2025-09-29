// /endpoints/activity.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { createPlayerIfNotExists, logPlayerSession } = require("./database");

const GROUP_ID = 35807738; // your Roblox group ID

// In-memory live sessions
const activeSessions = {}; // { roblox_id: { username, avatar_url, group_rank, session_start } }

// ---------------------------
// Player Join Endpoint
// ---------------------------
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank } = req.body;
  if (!roblox_id || !username) {
    return res.status(400).json({ error: "Missing roblox_id or username" });
  }

  try {
    const player = await createPlayerIfNotExists({
      roblox_id,
      username,
      avatar_url: avatar_url || "",
      group_rank: group_rank || "Guest",
    });

    console.log(`✅ Player ensured in DB: ${username} (${roblox_id})`);
    res.json(player);
  } catch (err) {
    console.error("❌ Failed to ensure player:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// Log Session Endpoint
// ---------------------------
router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;

  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    // Fetch username
    const userRes = await fetch(`https://users.roblox.com/v1/users/${roblox_id}`);
    const userData = await userRes.json();
    const username = userData.name;

    // Fetch avatar
    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${roblox_id}&size=150x150&format=Png&isCircular=true`
    );
    const thumbData = await thumbRes.json();
    const avatarUrl = thumbData?.data?.[0]?.imageUrl || "";

    // Fetch group rank NAME
    const groupRes = await fetch(`https://groups.roblox.com/v1/users/${roblox_id}/groups/roles`);
    const groupData = await groupRes.json();
    const groupInfo = groupData.data.find(g => g.group.id === GROUP_ID);
    const groupRank = groupInfo ? groupInfo.role.name : "Guest";

    // Ensure player exists
    await createPlayerIfNotExists({
      roblox_id,
      username,
      avatar_url: avatarUrl,
      group_rank: groupRank,
    });

    // Log session
    const updatedPlayer = await logPlayerSession(
      roblox_id,
      Number(minutes_played),
      new Date(session_start * 1000),
      new Date(session_end * 1000)
    );

    console.log(`✅ Logged session for ${username}: ${minutes_played} minutes`);
    res.json(updatedPlayer);
  } catch (err) {
    console.error("Failed to log session:", err);
    res.status(500).json({ error: err.message });
  }
});

// routes/activity.js
const express = require("express");
const router = express.Router();
const { logPlayerLive } = require("../endpoints/database");

// POST /activity/live
router.post("/live", async (req, res) => {
  try {
    const { roblox_id, username, current_minutes } = req.body;
    if (!roblox_id || !username || current_minutes == null)
      return res.status(400).json({ error: "Missing parameters" });

    // Upsert: insert new if not exists, else update
    await logPlayerLive(roblox_id, username, current_minutes);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error updating live session:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------
// Start Live Session
// ---------------------------
router.post("/start-session", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank } = req.body;
  if (!roblox_id || !username) return res.status(400).json({ error: "Missing data" });

  activeSessions[roblox_id] = {
    roblox_id,
    username,
    avatar_url: avatar_url || "",
    group_rank: group_rank || "Guest",
    session_start: Date.now(),
  };

  console.log(`🟢 Live session started: ${username}`);
  res.json({ success: true });
});

// ---------------------------
// End Live Session
// ---------------------------
router.post("/end-session", (req, res) => {
  const { roblox_id } = req.body;
  if (!roblox_id) return res.status(400).json({ error: "Missing roblox_id" });

  const removed = activeSessions[roblox_id];
  if (removed) {
    console.log(`🔴 Live session ended: ${removed.username}`);
    delete activeSessions[roblox_id];
  }

  res.json({ success: true });
});

// ---------------------------
// Get All Active Sessions
// ---------------------------
router.get("/active", (req, res) => {
  const list = Object.values(activeSessions).map(s => ({
    ...s,
    minutes_played: Math.floor((Date.now() - s.session_start) / 60000),
  }));
  res.json(list);
});

module.exports = router;
