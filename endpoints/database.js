// endpoints/database.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// -------------------------
// Players
// -------------------------

// ✅ Create player if not exists
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

// endpoints/database.js

async function logPlayerSession(roblox_id, minutes_played, session_start, session_end) {
  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    throw new Error("Missing data in logPlayerSession");
  }

  // 1️⃣ Calculate current week start (Monday 00:00)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  // 2️⃣ Insert new session record into player_activity
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

  // 3️⃣ Calculate the new total weekly minutes
  const { data: weeklySessions, error: weeklyErr } = await supabase
    .from("player_activity")
    .select("minutes_played")
    .eq("roblox_id", roblox_id)
    .gte("week_start", weekStart.toISOString());
  if (weeklyErr) throw weeklyErr;

  const totalWeekly = (weeklySessions || []).reduce(
    (sum, s) => sum + (s.minutes_played || 0),
    0
  );

  // 4️⃣ Update the player's weekly_minutes in the players table
  const { data: updatedPlayer, error: updateErr } = await supabase
    .from("players")
    .update({ weekly_minutes: totalWeekly })
    .eq("roblox_id", roblox_id)
    .select()
    .single();
  if (updateErr) throw updateErr;

  // 5️⃣ Return the updated player row (including weekly_minutes)
  return updatedPlayer;
}

// ✅ Get a single player by username
async function getPlayerByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// ✅ Search players for dashboard suggestions
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("username, avatar_url, group_rank, weekly_minutes")
    .ilike("username", `%${username}%`)
    .limit(10);

  if (error) throw error;
  return data;
}

// ✅ Get all players
async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) throw error;
  return data;
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

// -------------------------
// Exports
// -------------------------

module.exports = {
  createPlayerIfNotExists,
  logPlayerSession,
  getPlayerByUsername,
  searchPlayersByUsername,
  getAllPlayers,
  getPlayerSessions, // 👈 added this
};
