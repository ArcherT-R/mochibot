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
  if (error && error.code !== "PGRST116") throw error; // not found
  return data;
}

// Search players by username
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("username, avatar_url, group_rank, total_activity")
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

// Log activity in minutes
async function logPlayerActivity(roblox_id, minutes_played) {
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

// Count shifts hosted (host or cohost)
async function getShiftsHosted(roblox_id) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .or(`host_id.eq.${roblox_id},cohost_id.eq.${roblox_id}`);

  if (error) throw error;
  return data.length;
}

// Get next 3 shifts
async function getUpcomingShifts() {
  const { data: shifts, error } = await supabase
    .from("sessions")
    .select("id, host_id, cohost_id, start_time, end_time")
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) throw error;

  const shiftsWithHost = await Promise.all(shifts.map(async (shift) => {
    const { data: host } = await supabase
      .from("players")
      .select("username")
      .eq("roblox_id", shift.host_id)
      .single();
    return {
      host: host?.username || "Unknown",
      cohost: null, // add if needed
      time: shift.start_time,
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
  getShiftsHosted,
  getUpcomingShifts
};
