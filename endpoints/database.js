// endpoints/database.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// -------------------------
// Players
// -------------------------

async function createPlayerIfNotExists({ roblox_id, username, avatar_url, group_rank }) {
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("roblox_id", roblox_id)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("players")
    .insert([{
      roblox_id,
      username,
      avatar_url,
      group_rank,
      weekly_minutes: 0
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Log player session
async function logPlayerSession(roblox_id, minutes_played, session_start, session_end) {
  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    throw new Error("Missing data in logPlayerSession");
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

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

  const { data: weeklySessions, error: weeklyErr } = await supabase
    .from("player_activity")
    .select("minutes_played")
    .eq("roblox_id", roblox_id)
    .gte("week_start", weekStart.toISOString());
  if (weeklyErr) throw weeklyErr;

  const totalWeekly = (weeklySessions || []).reduce((sum, s) => sum + (s.minutes_played || 0), 0);

  const { data: updatedPlayer, error: updateErr } = await supabase
    .from("players")
    .update({ weekly_minutes: totalWeekly })
    .eq("roblox_id", roblox_id)
    .select()
    .single();
  if (updateErr) throw updateErr;

  return updatedPlayer;
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

// Search players
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("username, avatar_url, group_rank, weekly_minutes")
    .ilike("username", `%${username}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

// Get all players
async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) throw error;
  return data;
}

// Get all shifts for a player
async function getPlayerShifts(roblox_id) {
  const { data, error } = await supabase
    .from("player_shifts")
    .select("*")
    .eq("roblox_id", roblox_id)
    .order("shift_date", { ascending: false });
  if (error) throw error;

  // Separate into types
  const attended = data.filter(s => s.type === "attended").length;
  const hosted = data.filter(s => s.type === "hosted").length;
  const coHosted = data.filter(s => s.type === "coHosted").map(s => ({ name: s.name, host: s.host }));

  return { attended, hosted, coHosted };
}

// Add a shift for a player
async function addPlayerShift({ roblox_id, type, name, host = null }) {
  const { data, error } = await supabase
    .from("player_shifts")
    .insert([{ roblox_id, type, name, host }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Get last N sessions
async function getPlayerLastSessions(roblox_id, limit = 4) {
  const sessions = await getPlayerSessions(roblox_id);
  return sessions.slice(0, limit);
}

// Ongoing session (replace with real-time memory if needed)
async function getOngoingSession(roblox_id) {
  return null; // or a string describing current session
}

// ✅ Get all play sessions for a player
async function getPlayerSessions(roblox_id) {
  const { data, error } = await supabase
    .from("player_activity")
    .select("*")
    .eq("roblox_id", roblox_id)
    .order("session_start", { ascending: false });

  if (error) throw error;
  return data;
}

async function logPlayerLive(roblox_id, username, current_minutes) {
  const { data, error } = await supabase
    .from("player_live")
    .upsert({
      roblox_id,
      username,
      current_minutes,
      last_updated: new Date().toISOString()
    }, { onConflict: ["roblox_id"] }); // ensures only one row per player

  if (error) throw error;
  return data;
}

module.exports = {
  createPlayerIfNotExists,
  logPlayerSession,
  getPlayerByUsername,
  searchPlayersByUsername,
  getAllPlayers,
  getPlayerSessions,
  getPlayerLastSessions,
  getPlayerShifts,
  getOngoingSession,
  addPlayerShift,
  logPlayerLive
};
