const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Fetch all players
async function getAllPlayers() {
  const { data, error } = await supabase.from("players").select("*");
  if (error) throw error;
  return data;
}

// Fetch single player by username
async function getPlayerByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .limit(1);
  if (error) throw error;
  return data[0];
}

// Fetch next 3 upcoming shifts
async function getUpcomingShifts() {
  const { data, error } = await supabase
    .from("shifts")
    .select("start_time, host, cohost, overseer")
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) throw error;

  // Format shifts nicely
  return data.map(shift => ({
    host: shift.host,
    cohost: shift.cohost,
    overseer: shift.overseer,
    time: shift.start_time
  }));
}

module.exports = {
  getAllPlayers,
  getPlayerByUsername,
  getUpcomingShifts
};

