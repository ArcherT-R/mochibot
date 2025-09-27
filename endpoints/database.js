// endpoints/database.js (or similar)
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Create player if they don’t exist
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

// Log activity (increment total_activity in minutes)
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

module.exports = { createPlayerIfNotExists, logPlayerActivity };

