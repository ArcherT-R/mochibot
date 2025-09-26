const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) throw error;
  return data;
}

// New function for search
async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("username, avatar, group_rank, total_activity")
    .ilike("username", `%${username}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

module.exports = { getAllPlayers, searchPlayersByUsername };
