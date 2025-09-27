const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all players
async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) throw error;
  return data;
}

// Get player by username
async function getPlayerByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

// Get top 3 upcoming shifts (host info included)
async function getUpcomingShifts() {
  const { data, error } = await supabase
    .from("shifts")
    .select(`
      start_time,
      end_time,
      player_id,
      players!shifts_player_id_fkey(username, avatar_url, group_rank)
    `)
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) throw error;

  return data.map(shift => ({
    host: shift.players.username,
    host_avatar: shift.players.avatar_url,
    host_rank: shift.players.group_rank,
    start_time: shift.start_time,
    end_time: shift.end_time
  }));
}

module.exports = { getAllPlayers, getPlayerByUsername, getUpcomingShifts };
