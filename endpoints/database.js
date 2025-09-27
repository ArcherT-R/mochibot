// endpoints/database.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all players
async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) throw error;
  return data;
}

// Get a single player by username
async function getPlayerByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
}

// Search players by username (for search bar)
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("username, avatar_url, group_rank, total_activity")
    .ilike("username", `%${username}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

// Create a player if not exists
async function createPlayerIfNotExists({ roblox_id, username }) {
  // Check if exists
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("roblox_id", roblox_id)
    .single();

  if (existing) return existing;

  // Create new player
  const { data, error } = await supabase
    .from("players")
    .insert([{ roblox_id, username }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Log player activity in minutes
async function logPlayerActivity(roblox_id, minutes_played) {
  // Get current total_activity
  const { data: player, error: selectErr } = await supabase
    .from("players")
    .select("total_activity")
    .eq("roblox_id", roblox_id)
    .single();

  if (selectErr) throw selectErr;

  const newTotal = (player?.total_activity || 0) + minutes_played;

  const { data, error } = await supabase
    .from("players")
    .update({ total_activity: newTotal })
    .eq("roblox_id", roblox_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get next 3 shifts
async function getUpcomingShifts() {
  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, player_id, start_time, end_time")
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) throw error;

  // Add host username for each shift
  const shiftsWithHost = await Promise.all(shifts.map(async (shift) => {
    const { data: player } = await supabase
      .from("players")
      .select("username")
      .eq("id", shift.player_id)
      .single();

    return {
      host: player?.username || "Unknown",
      time: shift.start_time,
      cohost: null, // Add cohost if tracked
    };
  }));

  return shiftsWithHost;
}

module.exports = {
  getAllPlayers,
  getPlayerByUsername,
  searchPlayersByUsername,
  createPlayerIfNotExists,
  logPlayerActivity,
  getUpcomingShifts
};
