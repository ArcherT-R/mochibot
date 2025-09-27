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
    .limit(1);

  if (error) throw error;
  return data[0] || null;
}

// Get upcoming shifts
async function getUpcomingShifts() {
  const { data, error } = await supabase
    .from("shifts")
    .select("start_time, end_time, player_id")
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) throw error;

  // Get player info for each shift
  const shifts = await Promise.all(data.map(async (s) => {
    const { data: playerData } = await supabase.from("players").select("username").eq("id", s.player_id).single();
    return {
      host: playerData?.username || "Unknown",
      time: s.start_time
    };
  }));

  return shifts;
}

module.exports = { getAllPlayers, getPlayerByUsername, getUpcomingShifts };
