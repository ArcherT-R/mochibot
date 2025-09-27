const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all players with total_activity
async function getAllPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("id, roblox_id, username, avatar_url, group_rank, total_activity, created_at");
  if (error) throw error;
  return data;
}

// Search players by username (case-insensitive)
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("id, roblox_id, username, avatar_url, group_rank, total_activity")
    .ilike("username", `%${username}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

// Get shifts for players
async function getAllShifts() {
  const { data, error } = await supabase
    .from("shifts")
    .select("id, player_id, start_time, end_time");
  if (error) throw error;
  return data;
}

module.exports = { getAllPlayers, searchPlayersByUsername, getAllShifts };
