const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Fetch all players
async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) throw error;
  return data;
}

// Search players by username (partial, case-insensitive)
async function searchPlayersByUsername(username) {
  if (!username) return [];
  const { data, error } = await supabase
    .from("players")
    .select("username, avatar_url, group_rank, total_activity")
    .ilike("username", `%${username}%`)
    .limit(10);

  if (error) throw error;
  return data;
}

module.exports = { getAllPlayers, searchPlayersByUsername };

