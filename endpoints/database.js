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
  // Start of current week (Monday)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0,0,0,0);

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

  // Update player's weekly_minutes
  const { data: player, error: selectErr } = await supabase
    .from("players")
    .select("weekly_minutes, last_week_minutes")
    .eq("roblox_id", roblox_id)
    .single();
  if (selectErr) throw selectErr;

  let weekly_minutes = player?.weekly_minutes || 0;
  let last_week_minutes = player?.last_week_minutes || 0;

  const currentWeekISO = weekStart.toISOString().slice(0,10); // YYYY-MM-DD

  // Reset weekly_minutes if it's a new week
  if (player.week_start?.toISOString().slice(0,10) !== currentWeekISO) {
    last_week_minutes = weekly_minutes;
    weekly_minutes = 0;
  }

  weekly_minutes += minutes_played;

  const { data: updated, error: updateErr } = await supabase
    .from("players")
    .update({ weekly_minutes, last_week_minutes })
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
