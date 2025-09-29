// endpoints/database.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// -------------------------
// Players
// -------------------------

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

// Log a completed player session
async function logPlayerSession(roblox_id, minutes_played, session_start, session_end) {
  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    throw new Error("Missing data in logPlayerSession");
  }

  // Calculate current week start (Monday 00:00)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  // Insert into player_activity
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

  // Update total weekly minutes
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

// Search players by username
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

// -------------------------
// Player sessions
// -------------------------

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

// Get last N sessions
async function getPlayerLastSessions(roblox_id, limit = 4) {
  const sessions = await getPlayerSessions(roblox_id);
  return sessions.slice(0, limit);
}

// -------------------------
// Player shifts
// -------------------------

// Get all shifts for a player
async function getPlayerShifts(roblox_id) {
  const { data, error } = await supabase
    .from("player_shifts")
    .select("*")
    .eq("roblox_id", roblox_id)
    .order("shift_date", { ascending: false });
  if (error) throw error;

  const attended = data.filter(s => s.type === "attended").length;
  const hosted = data.filter(s => s.type === "hosted").length;
  const coHosted = data.filter(s => s.type === "coHosted").map(s => ({ name: s.name, host: s.host }));

  return { attended, hosted, coHosted };
}

// Add a shift
async function addPlayerShift({ roblox_id, type, name, host = null }) {
  const { data, error } = await supabase
    .from("player_shifts")
    .insert([{ roblox_id, type, name, host }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// -------------------------
// Player live sessions
// -------------------------

// Log/update live session
async function logPlayerLive(roblox_id, username, current_minutes) {
  if (!roblox_id || current_minutes == null) throw new Error("Missing data for live session");

  const { data, error } = await supabase
    .from("player_live")
    .upsert(
      { roblox_id, username, current_minutes },
      { onConflict: "roblox_id" } // assumes roblox_id is unique
    );

  if (error) throw error;
  return data;
}

/**
 * @description CRITICAL FIX: Deletes the player's row from the player_live table.
 * @param {string} roblox_id 
 */
async function **deletePlayerLiveSession**(roblox_id) {
  if (!roblox_id) throw new Error("Missing roblox_id for live session deletion");

  const { error } = await supabase
    .from("player_live")
    .delete()
    .eq("roblox_id", roblox_id);

  if (error) throw error;
  return { success: true };
}


// Get ongoing live session (from player_live table)
async function getOngoingSession(roblox_id) {
  const { data, error } = await supabase
    .from("player_live")
    .select("*")
    .eq("roblox_id", roblox_id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// -------------------------
// Exports
// -------------------------
module.exports = {
  createPlayerIfNotExists,
  logPlayerSession,
  getPlayerByUsername,
  searchPlayersByUsername,
  getAllPlayers,
  getPlayerSessions,
  getPlayerLastSessions,
  getPlayerShifts,
  addPlayerShift,
  logPlayerLive,
  deletePlayerLiveSession, // <--- NEW EXPORT
  getOngoingSession,
};
