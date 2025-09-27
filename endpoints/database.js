// endpoints/database.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ----------------------------
// Players
// ----------------------------

// Get all players
async function getAllPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("id, username, roblox_id, avatar_url, group_rank, total_activity, shifts_hosted, shifts_attended")
    .order("total_activity", { ascending: false });
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

// Create player if not exists, or update avatar & group rank
async function createPlayerIfNotExists({ roblox_id, username, avatar_url, group_rank }) {
  // Check if player exists
  const { data: existing } = await supabase
    .from("players")
    .select("*")
    .eq("roblox_id", roblox_id)
    .single();

  if (existing) {
    // Update avatar/group_rank if changed
    const updates = {};
    if (avatar_url && avatar_url !== existing.avatar_url) updates.avatar_url = avatar_url;
    if (group_rank && group_rank !== existing.group_rank) updates.group_rank = group_rank;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("players")
        .update(updates)
        .eq("roblox_id", roblox_id);
      if (error) throw error;
    }
    return { ...existing, ...updates };
  }

  // Insert new player
  const { data, error } = await supabase
    .from("players")
    .insert([{ roblox_id, username, avatar_url, group_rank, total_activity: 0, shifts_hosted: 0, shifts_attended: 0 }])
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

// ----------------------------
// Shifts
// ----------------------------

// Get next 3 upcoming shifts
async function getUpcomingShifts() {
  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("id, player_id, cohost_id, start_time, end_time")
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) throw error;

  // Add host/cohost username
  const shiftsWithUsers = await Promise.all(shifts.map(async (shift) => {
    const { data: host } = await supabase
      .from("players")
      .select("username")
      .eq("id", shift.player_id)
      .single();

    let cohostUsername = null;
    if (shift.cohost_id) {
      const { data: cohost } = await supabase
        .from("players")
        .select("username")
        .eq("id", shift.cohost_id)
        .single();
      cohostUsername = cohost?.username || null;
    }

    return {
      host: host?.username || "Unknown",
      cohost: cohostUsername,
      time: shift.start_time,
    };
  }));

  return shiftsWithUsers;
}

module.exports = {
  getAllPlayers,
  getPlayerByUsername,
  searchPlayersByUsername,
  createPlayerIfNotExists,
  logPlayerActivity,
  getUpcomingShifts
};
