const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Get all players for dashboard top players
 */
async function getAllPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("username, group_rank, total_activity, shifts"); // include shifts if stored

  if (error) throw error;

  // Add placeholder avatar to prevent dashboard issues
  return data.map(player => ({ ...player, avatar: "" }));
}

/**
 * Search players by username for AJAX search
 */
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("username, group_rank, total_activity")
    .ilike("username", `%${username}%`)
    .limit(10);

  if (error) throw error;

  // Add placeholder avatar to prevent dashboard issues
  return data.map(player => ({ ...player, avatar: "" }));
}

module.exports = { getAllPlayers, searchPlayersByUsername };
