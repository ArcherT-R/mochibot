// /endpoints/activity.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { createPlayerIfNotExists, logPlayerSession } = require("./database");

const GROUP_ID = 35807738; // your Roblox group ID

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

module.exports = router;
