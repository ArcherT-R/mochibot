// endpoints/database.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getAllPlayers() {
  const { data, error } = await supabase.from('players').select('*');
  if (error) throw error;
  return data;
}

async function searchPlayersByUsername(username) {
  const { data, error } = await supabase
    .from('players')
    .select('roblox_id, username, avatar_url, group_rank, total_activity')
    .ilike('username', `%${username}%`)
    .limit(10);
  if (error) throw error;
  return data;
}

async function createPlayerIfNotExists(roblox_id, username) {
  const { data: existing } = await supabase
    .from('players')
    .select('*')
    .eq('roblox_id', roblox_id)
    .limit(1);

  if (existing.length === 0) {
    await supabase.from('players').insert({ roblox_id, username });
  }
}

async function logPlayerActivity(roblox_id, minutes) {
  const { data, error } = await supabase
    .from('players')
    .select('total_activity')
    .eq('roblox_id', roblox_id)
    .single();

  if (error) throw error;

  const newTotal = (data.total_activity || 0) + minutes;

  await supabase
    .from('players')
    .update({ total_activity: newTotal })
    .eq('roblox_id', roblox_id);
}

module.exports = {
  getAllPlayers,
  searchPlayersByUsername,
  createPlayerIfNotExists,
  logPlayerActivity,
};
