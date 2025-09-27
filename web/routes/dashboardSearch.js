const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Helper: search local DB
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("id, roblox_id, username, avatar_url, group_rank")
    .ilike("username", `%${username}%`)
    .limit(10);

  if (error) throw error;
  return data;
}

// Helper: fetch from Roblox
async function fetchRobloxUser(username) {
  try {
    const res = await axios.get(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`);
    if (res.data && res.data.Id && res.data.Username) {
      return {
        roblox_id: res.data.Id,
        username: res.data.Username,
        avatar_url: `https://www.roblox.com/headshot-thumbnail/image?userId=${res.data.Id}&width=48&height=48&format=png`,
        group_rank: null
      };
    }
  } catch (err) {
    console.warn("Roblox API fetch failed:", err.message);
  }
  return null;
}

router.get("/", async (req, res) => {
  const { username } = req.query;
  if (!username) return res.json([]);

  try {
    // 1. Search local DB
    let players = await searchPlayersByUsername(username);

    // 2. If nothing found, search Roblox
    if (!players.length) {
      const robloxUser = await fetchRobloxUser(username);
      if (robloxUser) {
        players = [robloxUser];

        // Optional: insert into DB for future searches
        await supabase.from("players").insert([{
          roblox_id: robloxUser.roblox_id,
          username: robloxUser.username,
          avatar_url: robloxUser.avatar_url,
          group_rank: robloxUser.group_rank
        }]);
      }
    }

    res.json(players);
  } catch (err) {
    console.error("Dashboard search error:", err);
    res.status(500).json([]);
  }
});

module.exports = router;
