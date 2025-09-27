// endpoints/database.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all players
async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) throw error;
  return data;
}

// Get player by username
async function getPlayerByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// Search players for search bar
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("username, avatar_url, group_rank, weekly_minutes")
    .ilike("username", `%${username}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

// Create player if not exists
async function createPlayerIfNotExists({ roblox_id, username, avatar_url, group_rank }) {
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("roblox_id", roblox_id)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("players")
    .insert([{ roblox_id, username, avatar_url, group_rank }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Log a player session
async function logPlayerSession(roblox_id, minutes_played, session_start, session_end) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday

  // Insert session
  const { data: sessionData, error: insertErr } = await supabase
    .from("player_activity")
    .insert([{
      roblox_id,
      session_start,
      session_end,
      minutes_played,
      week_start: weekStart
    }])
    .select()
    .single();
  if (insertErr) throw insertErr;

  // Update weekly_minutes
  const { data: player, error: selectErr } = await supabase
    .from("players")
    .select("weekly_minutes")
    .eq("roblox_id", roblox_id)
    .single();
  if (selectErr) throw selectErr;

  const newWeekly = (player?.weekly_minutes || 0) + minutes_played;

  const { data: updated, error: updateErr } = await supabase
    .from("players")
    .update({ weekly_minutes: newWeekly })
    .eq("roblox_id", roblox_id)
    .select()
    .single();
  if (updateErr) throw updateErr;

  return updated;
}

// Get all sessions for a player
async function getPlayerSessions(roblox_id) {
  const { data, error } = await supabase
    .from("player_activity")
    .select("*")
    .eq("roblox_id", roblox_id)
    .order("session_start", { ascending: false });
  if (error) throw error;
  return data;
}

module.exports = {
  getAllPlayers,
  getPlayerByUsername,
  searchPlayersByUsername,
  createPlayerIfNotExists,
  logPlayerSession,
  getPlayerSessions
};
