// endpoints/database.js
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// -------------------------
// Players
// -------------------------

// Create player if not exists
async function createPlayerIfNotExists({ roblox_id, username, avatar_url, group_rank, password }) {
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("roblox_id", roblox_id)
    .single();

  if (existing) return existing;

  let password_hash = null;
  if (password) {
    password_hash = await bcrypt.hash(password, 10);
  }

  const { data, error } = await supabase
    .from("players")
    .insert([{
      roblox_id,
      username,
      avatar_url,
      group_rank,
      weekly_minutes: 0,
      password_hash
    }])
    .select()
    .single();

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

// -------------------------
// Authentication
// -------------------------

// Verify player password
async function verifyPlayerPassword(username, password) {
  const player = await getPlayerByUsername(username);
  if (!player) return { success: false, error: "User not found" };

  if (!player.password_hash) return { success: false, error: "No password set for this account" };

  const match = await bcrypt.compare(password, player.password_hash);
  if (!match) return { success: false, error: "Invalid password" };

  return { success: true, player };
}

// Update player password manually
async function updatePlayerPassword(roblox_id, newPassword) {
  const password_hash = await bcrypt.hash(newPassword, 10);
  const { data, error } = await supabase
    .from("players")
    .update({ password_hash })
    .eq("roblox_id", roblox_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// -------------------------
// Player sessions
// -------------------------

async function logPlayerSession(roblox_id, minutes_played, session_start, session_end) {
  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    throw new Error("Missing data in logPlayerSession");
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  // Remove .single() from the insert
  const { data: sessionData, error: insertErr } = await supabase
    .from("player_activity")
    .insert([{
      roblox_id,
      session_start,
      session_end,
      minutes_played,
      week_start: weekStart
    }])
    .select();
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

async function logPlayerLive(roblox_id, username, current_minutes, session_start_time = null) {
  if (!roblox_id || current_minutes == null) throw new Error("Missing data for live session");

  const updateObject = { 
    roblox_id: roblox_id, 
    username: username, 
    current_minutes: Number(current_minutes)
  };
  
  if (session_start_time) {
    const milliseconds = Number(session_start_time) * 1000;
    updateObject.session_start_time = new Date(milliseconds).toISOString(); 
  }

  const { data, error } = await supabase
    .from("player_live")
    .upsert(updateObject, { onConflict: "roblox_id" });

  if (error) throw error;
  return data;
}

async function deletePlayerLiveSession(roblox_id) {
  if (!roblox_id) throw new Error("Missing roblox_id for live session deletion");

  const { error } = await supabase
    .from("player_live")
    .delete()
    .eq("roblox_id", roblox_id);

  if (error) throw error;
  return { success: true };
}

async function getOngoingSession(roblox_id) {
  const { data, error } = await supabase
    .from("player_live")
    .select("roblox_id, username, current_minutes, session_start_time") 
    .eq("roblox_id", roblox_id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// -------------------------
// Shifts
// -------------------------

async function getAllShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .order('shift_time', { ascending: true });
  if (error) throw error;
  return data;
}

async function addShift({ shift_time, host, cohost, overseer }) {
  const { data, error } = await supabase
    .from('shifts')
    .insert([{ shift_time, host, cohost, overseer }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getShiftByTime(shift_time) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('shift_time', shift_time)
    .single();
  if (error && error.code !== "PGRST116") return null;
  return data;
}

async function getShiftAttendees(shiftId) {
  const { data, error } = await supabase
    .from('shift_attendees')
    .select('*')
    .eq('shift_id', shiftId);
  if (error) throw error;
  return data;
}

async function addShiftAttendee(shiftId, robloxId, username) {
  const { data, error } = await supabase
    .from('shift_attendees')
    .insert([{ shift_id: shiftId, roblox_id: robloxId, username }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function removeShiftAttendee(shiftId, robloxId) {
  const { error } = await supabase
    .from('shift_attendees')
    .delete()
    .eq('shift_id', shiftId)
    .eq('roblox_id', robloxId);
  if (error) throw error;
  return { success: true };
}

// Add this to your database.js file, before the module.exports section

async function getPlayerByRobloxId(roblox_id) {
  const { data, error } = await supabase
    .from("players")
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
  getPlayerByUsername,
  searchPlayersByUsername: async (username) => {
    const { data, error } = await supabase
      .from("players")
      .select("username, avatar_url, group_rank, weekly_minutes, roblox_id")
      .ilike("username", `%${username}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },
  getAllPlayers: async () => {
    const { data, error } = await supabase.from("players").select("*");
    if (error) throw error;
    return data;
  },
  logPlayerSession,
  getPlayerSessions,
  getPlayerLastSessions,
  getPlayerShifts,
  addPlayerShift,
  logPlayerLive,
  deletePlayerLiveSession,
  getOngoingSession,
  getAllShifts,
  addShift,
  getShiftByTime,
  getShiftAttendees,
  addShiftAttendee,
  removeShiftAttendee,
  verifyPlayerPassword,
  updatePlayerPassword,
  getPlayerByRobloxId
};
