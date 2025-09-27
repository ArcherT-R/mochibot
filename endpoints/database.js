const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Check if a player exists; if not, create them
async function createPlayerIfNotExists(playerData) {
  const { roblox_id, username, group_rank, avatar_url } = playerData;

  // Check if player exists
  const { data: existing, error: selectErr } = await supabase
    .from("players")
    .select("*")
    .eq("roblox_id", roblox_id)
    .single();

  if (selectErr && selectErr.code !== "PGRST116") throw selectErr;

  if (existing) {
    // Optionally update username/rank/avatar
    await supabase.from("players")
      .update({ username, group_rank, avatar_url })
      .eq("roblox_id", roblox_id);
    return existing;
  } else {
    // Insert new player
    const { data, error } = await supabase.from("players")
      .insert([{ roblox_id, username, group_rank, avatar_url }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// Log activity in minutes
async function logPlayerActivity(roblox_id, minutes_played) {
  // Update total_activity in players table
  const { data, error } = await supabase
    .from("players")
    .update({ total_activity: supabase.raw("COALESCE(total_activity, 0) + ?", [minutes_played]) })
    .eq("roblox_id", roblox_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  getAllPlayers: async () => {
    const { data, error } = await supabase.from("players").select("*");
    if (error) throw error;
    return data;
  },
  getPlayerByUsername: async (username) => {
    const { data, error } = await supabase.from("players").select("*").eq("username", username).single();
    if (error) return null;
    return data;
  },
  createPlayerIfNotExists,
  logPlayerActivity
};

