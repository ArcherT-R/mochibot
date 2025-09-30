// endpoints/shiftDB.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all shifts
async function getAllShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .order('time', { ascending: true });
  if (error) throw error;
  return data;
}

// Get attendees for a specific shift
async function getShiftAttendees(shiftId) {
  const { data, error } = await supabase
    .from('shift_attendees')
    .select('*')
    .eq('shift_id', shiftId);
  if (error) throw error;
  return data;
}

// Add attendee to a shift
async function addShiftAttendee(shiftId, roblox_id, username) {
  const { data, error } = await supabase
    .from('shift_attendees')
    .insert([{ shift_id: shiftId, roblox_id, username }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Remove attendee from a shift
async function removeShiftAttendee(shiftId, roblox_id) {
  const { error } = await supabase
    .from('shift_attendees')
    .delete()
    .eq('shift_id', shiftId)
    .eq('roblox_id', roblox_id);
  if (error) throw error;
  return { success: true };
}

module.exports = {
  getAllShifts,
  getShiftAttendees,
  addShiftAttendee,
  removeShiftAttendee
};
