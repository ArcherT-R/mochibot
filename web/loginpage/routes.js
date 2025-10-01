const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const { getPlayerByUsername } = require('../../endpoints/database');
const axios = require("axios");

const router = express.Router();

// -------------------- Serve Login Page --------------------
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// -------------------- Login Logic --------------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Fetch player from DB
    const player = await getPlayerByUsername(username);
    if (!player) return res.status(400).json({ error: "User not found" });

    // Password check
    const match = await bcrypt.compare(password, player.passwordHash);
    if (!match) return res.status(400).json({ error: "Invalid password" });

    // Success
    res.json({ success: true, player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- Fetch Roblox profile --------------------
router.get("/profile/:username", async (req, res) => {
  try {
    const username = req.params.username;

    // Fetch from Roblox API
    const robloxRes = await axios.get(`https://users.roblox.com/v1/users/search?keyword=${username}`);
    if (!robloxRes.data || !robloxRes.data.data || robloxRes.data.data.length === 0) {
      return res.status(404).json({ error: "Roblox user not found" });
    }

    const robloxUser = robloxRes.data.data[0];

    // Upsert into Supabase
    const player = await createPlayerIfNotExists({
      roblox_id: robloxUser.id.toString(),
      username: robloxUser.name,
      avatar_url: `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUser.id}&width=150&height=150&format=png`,
      group_rank: 0 // you can customize this
    });

    res.json({ success: true, player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Roblox profile" });
  }
});

module.exports = router;
