// endpoints/database.js
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// -------------------------
// Player Labels
// -------------------------

async function getPlayerLabels(roblox_id) {
  const { data, error } = await supabase
    .from('player_labels')
    .select('label')
    .eq('roblox_id', roblox_id);
  if (error) throw error;
  return (data || []).map(row => row.label);
}

async function addPlayerLabel(roblox_id, username, label) {
  const { data, error } = await supabase
    .from('player_labels')
    .insert([{ roblox_id, username, label }])
    .select();
  if (error) throw error;
  return data;
}

async function removePlayerLabel(roblox_id, label) {
  const { error } = await supabase
    .from('player_labels')
    .delete()
    .eq('roblox_id', roblox_id)
    .eq('label', label);
  if (error) throw error;
  return { success: true };
}

async function getAllPlayerLabels() {
  const { data, error } = await supabase
    .from('player_labels')
    .select('*');
  if (error) throw error;
  return data;
}

// -------------------------
// Player Birthdays
// -------------------------

async function getPlayerBirthday(roblox_id) {
  const { data, error } = await supabase
    .from('player_birthdays')
    .select('birthday')
    .eq('roblox_id', roblox_id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data?.birthday || null;
}

async function setPlayerBirthday(roblox_id, username, birthday) {
  // Check if birthday already exists
  const { data: existing } = await supabase
    .from('player_birthdays')
    .select('id')
    .eq('roblox_id', roblox_id)
    .single();

  if (existing) {
    // Update existing birthday
    const { data, error } = await supabase
      .from('player_birthdays')
      .update({ birthday })
      .eq('roblox_id', roblox_id)
      .select();
    if (error) throw error;
    return data;
  } else {
    // Insert new birthday
    const { data, error } = await supabase
      .from('player_birthdays')
      .insert([{ roblox_id, username, birthday }])
      .select();
    if (error) throw error;
    return data;
  }
}

// -------------------------
// Announcements
// -------------------------

async function getAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function addAnnouncement(title, content, author) {
  const { data, error } = await supabase
    .from('announcements')
    .insert([{ 
      title, 
      content, 
      author, 
      created_at: new Date().toISOString() 
    }])
    .select();
  
  if (error) throw error;
  return data[0];
}

async function deleteAnnouncement(id) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return { success: true };
}

// -------------------------
// Players
// -------------------------

// Create player if not exists
async function createPlayerIfNotExists({ roblox_id, username, avatar_url, group_rank, password }) {
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("roblox_id", roblox_id)
    .single();

  if (existing) {
    throw new Error("Player already exists with this Roblox ID");
  }

  const insertData = {
    roblox_id,
    username,
    avatar_url,
    group_rank,
    weekly_minutes: 0
  };

  // Add plain text password if provided
  if (password) {
    insertData.password = password;
    // Hash the password for secure storage
    insertData.password_hash = await bcrypt.hash(password, 10);
  }

  const { data, error } = await supabase
    .from("players")
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get player by username
async function getPlayerByUsername(username) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// Get player by Roblox ID
async function getPlayerByRobloxId(roblox_id) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("roblox_id", roblox_id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// -------------------------
// Leave of Absence (LOA)
// -------------------------

async function addLOA(roblox_id, username, start_date, end_date) {
  const { data, error } = await supabase
    .from('player_loa')
    .insert([{ roblox_id, username, start_date, end_date }])
    .select();
  if (error) throw error;
  return data[0];
}

async function removeLOA(roblox_id) {
  const { error } = await supabase
    .from('player_loa')
    .delete()
    .eq('roblox_id', roblox_id);
  if (error) throw error;
  return { success: true };
}

async function getAllLOA() {
  const { data, error } = await supabase
    .from('player_loa')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data;
}

async function getActiveLOA() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('player_loa')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today);
  if (error) throw error;
  return data;
}

async function isPlayerOnLOA(roblox_id) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('player_loa')
    .select('*')
    .eq('roblox_id', roblox_id)
    .lte('start_date', today)
    .gte('end_date', today)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data ? true : false;
}

async function deleteShift(shiftId) {
  // Delete attendees first
  const { error: attendeesError } = await supabase
    .from('shift_attendees')
    .delete()
    .eq('shift_id', shiftId);
  if (attendeesError) throw attendeesError;
  
  // Delete the shift
  const { error: shiftError } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId);
  if (shiftError) throw shiftError;
  
  return { success: true };
}

// -------------------------
// Authentication
// -------------------------

// Verify player password
async function verifyPlayerPassword(username, password) {
  const player = await getPlayerByUsername(username);
  if (!player) return { success: false, error: "User not found" };

  if (!player.password_hash) return { success: false, error: "No password set for this account" };

  const match = await bcrypt.compare(password, player.password_hash);
  if (!match) return { success: false, error: "Invalid password" };

  return { success: true, player };
}

// Update player password manually
async function updatePlayerPassword(roblox_id, newPassword) {
  const password_hash = await bcrypt.hash(newPassword, 10);
  const updateData = { 
    password_hash,
    password: newPassword // Store plain text as well
  };
  
  const { data, error } = await supabase
    .from("players")
    .update(updateData)
    .eq("roblox_id", roblox_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Get player password (plain text)
async function getPlayerPassword(roblox_id) {
  const { data, error } = await supabase
    .from("players")
    .select("password")
    .eq("roblox_id", roblox_id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data?.password || null;
}

// Generate random 6-digit password
function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// -------------------------
// Player sessions
// -------------------------

async function logPlayerSession(roblox_id, minutes_played, session_start, session_end) {
  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    throw new Error("Missing data in logPlayerSession");
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  const { data: sessionData, error: insertErr } = await supabase
    .from("player_activity")
    .insert([{
      roblox_id,
      session_start,
      session_end,
      minutes_played,
      week_start: weekStart
    }])
    .select();
  if (insertErr) throw insertErr;

  const { data: weeklySessions, error: weeklyErr } = await supabase
    .from("player_activity")
    .select("minutes_played")
    .eq("roblox_id", roblox_id)
    .gte("week_start", weekStart.toISOString());
  if (weeklyErr) throw weeklyErr;

  const totalWeekly = (weeklySessions || []).reduce((sum, s) => sum + (s.minutes_played || 0), 0);

  const { data: updatedPlayer, error: updateErr } = await supabase
    .from("players")
    .update({ weekly_minutes: totalWeekly })
    .eq("roblox_id", roblox_id)
    .select()
    .single();
  if (updateErr) throw updateErr;

  return updatedPlayer;
}

// Get all sessions for a player
async function getPlayerSessions(roblox_id) {
  const { data, error } = await supabase
    .from("player_activity")
    .select("*")
    .eq("roblox_id", roblox_id)
    .order("session_start", { ascending: false });
  if (error) throw error;
  return data;
}

// Get last N sessions
async function getPlayerLastSessions(roblox_id, limit = 4) {
  const sessions = await getPlayerSessions(roblox_id);
  return sessions.slice(0, limit);
}

// -------------------------
// Player shifts
// -------------------------

async function getPlayerShifts(roblox_id) {
  const { data, error } = await supabase
    .from("player_shifts")
    .select("*")
    .eq("roblox_id", roblox_id)
    .order("shift_date", { ascending: false });
  if (error) throw error;

  const attended = data.filter(s => s.type === "attended").length;
  const hosted = data.filter(s => s.type === "hosted").length;
  const coHosted = data.filter(s => s.type === "coHosted").map(s => ({ name: s.name, host: s.host }));

  return { attended, hosted, coHosted };
}

async function addPlayerShift({ roblox_id, type, name, host = null }) {
  const { data, error } = await supabase
    .from("player_shifts")
    .insert([{ roblox_id, type, name, host }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// -------------------------
// Player live sessions
// -------------------------

async function logPlayerLive(roblox_id, username, current_minutes, session_start_time = null) {
  if (!roblox_id || current_minutes == null) throw new Error("Missing data for live session");

  const updateObject = { 
    roblox_id: roblox_id, 
    username: username, 
    current_minutes: Number(current_minutes)
  };
  
  if (session_start_time) {
    const milliseconds = Number(session_start_time) * 1000;
    updateObject.session_start_time = new Date(milliseconds).toISOString(); 
  }

  const { data, error } = await supabase
    .from("player_live")
    .upsert(updateObject, { onConflict: "roblox_id" });

  if (error) throw error;
  return data;
}

async function deletePlayerLiveSession(roblox_id) {
  if (!roblox_id) throw new Error("Missing roblox_id for live session deletion");

  const { error } = await supabase
    .from("player_live")
    .delete()
    .eq("roblox_id", roblox_id);

  if (error) throw error;
  return { success: true };
}

async function getOngoingSession(roblox_id) {
  const { data, error } = await supabase
    .from("player_live")
    .select("roblox_id, username, current_minutes, session_start_time") 
    .eq("roblox_id", roblox_id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// -------------------------
// Shifts
// -------------------------

async function getAllShifts() {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .order('shift_time', { ascending: true });
  if (error) throw error;
  return data;
}

async function addShift({ shift_time, host, cohost, overseer }) {
  const { data, error } = await supabase
    .from('shifts')
    .insert([{ shift_time, host, cohost, overseer }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getShiftByTime(shift_time) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('shift_time', shift_time)
    .single();
  if (error && error.code !== "PGRST116") return null;
  return data;
}

async function getShiftAttendees(shiftId) {
  const { data, error } = await supabase
    .from('shift_attendees')
    .select('*')
    .eq('shift_id', shiftId);
  if (error) throw error;
  return data;
}

async function addShiftAttendee(shiftId, robloxId, username) {
  const { data, error } = await supabase
    .from('shift_attendees')
    .insert([{ shift_id: shiftId, roblox_id: robloxId, username }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function removeShiftAttendee(shiftId, robloxId) {
  const { error } = await supabase
    .from('shift_attendees')
    .delete()
    .eq('shift_id', shiftId)
    .eq('roblox_id', robloxId);
  if (error) throw error;
  return { success: true };
}

// -------------------------
// Birthdays
// -------------------------

async function setBirthday(roblox_id, username, birthday) {
  const { data, error } = await supabase
    .from('player_birthdays')
    .upsert([{ roblox_id, username, birthday }], { onConflict: 'roblox_id' })
    .select();
  if (error) throw error;
  return data;
}

async function getBirthday(roblox_id) {
  const { data, error } = await supabase
    .from('player_birthdays')
    .select('*')
    .eq('roblox_id', roblox_id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

async function getAllBirthdays() {
  const { data, error } = await supabase
    .from('player_birthdays')
    .select('*')
    .order('birthday', { ascending: true });
  if (error) throw error;
  return data;
}

async function deleteBirthday(roblox_id) {
  const { error } = await supabase
    .from('player_birthdays')
    .delete()
    .eq('roblox_id', roblox_id);
  if (error) throw error;
  return { success: true };
}

// -------------------------
// Weekly Reset & History
// -------------------------

async function saveWeeklyHistory() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Get all players
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('roblox_id, username, weekly_minutes');
  if (playersErr) throw playersErr;

  // Get all shifts for the week
  const { data: shifts, error: shiftsErr } = await supabase
    .from('shifts')
    .select('*')
    .gte('shift_time', Math.floor(weekStart.getTime() / 1000))
    .lte('shift_time', Math.floor(weekEnd.getTime() / 1000));
  if (shiftsErr) throw shiftsErr;

  // Count shifts per player
  const shiftCounts = {};
  
  for (const shift of shifts || []) {
    // Count hosts
    if (shift.host && shift.host !== 'TBD') {
      if (!shiftCounts[shift.host]) shiftCounts[shift.host] = { hosted: 0, attended: 0 };
      shiftCounts[shift.host].hosted++;
    }
    
    // Count cohosts as hosted
    if (shift.cohost) {
      if (!shiftCounts[shift.cohost]) shiftCounts[shift.cohost] = { hosted: 0, attended: 0 };
      shiftCounts[shift.cohost].hosted++;
    }
    
    // Count attendees
    const { data: attendees } = await supabase
      .from('shift_attendees')
      .select('username')
      .eq('shift_id', shift.id);
    
    for (const attendee of attendees || []) {
      if (!shiftCounts[attendee.username]) shiftCounts[attendee.username] = { hosted: 0, attended: 0 };
      shiftCounts[attendee.username].attended++;
    }
  }

  // Save history for each player
  const historyRecords = players.map(p => ({
    week_start: weekStart.toISOString().split('T')[0],
    week_end: weekEnd.toISOString().split('T')[0],
    roblox_id: p.roblox_id,
    username: p.username,
    total_minutes: p.weekly_minutes || 0,
    shifts_hosted: shiftCounts[p.username]?.hosted || 0,
    shifts_attended: shiftCounts[p.username]?.attended || 0
  }));

  const { error: insertErr } = await supabase
    .from('weekly_history')
    .insert(historyRecords);
  if (insertErr) throw insertErr;

  return historyRecords.length;
}

async function resetWeeklyData() {
  // Save current week's data first
  const playersAffected = await saveWeeklyHistory();

  // Reset all players' weekly_minutes
  const { error: resetErr } = await supabase
    .from('players')
    .update({ weekly_minutes: 0 })
    .neq('roblox_id', 0); // Update all

  if (resetErr) throw resetErr;

  // Clear player_live table
  const { error: clearErr } = await supabase
    .from('player_live')
    .delete()
    .neq('roblox_id', 0); // Delete all

  if (clearErr) throw clearErr;

  // Log the reset
  const { error: logErr } = await supabase
    .from('weekly_reset_log')
    .insert([{
      reset_date: new Date().toISOString(),
      players_affected: playersAffected
    }]);
  if (logErr) throw logErr;

  return { success: true, playersAffected };
}

async function getLastResetDate() {
  const { data, error } = await supabase
    .from('weekly_reset_log')
    .select('*')
    .order('reset_date', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

async function getLastWeekHistory() {
  const { data, error } = await supabase
    .from('weekly_history')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(100);
  
  if (error) throw error;
  
  // Group by week
  const weeks = {};
  for (const record of data || []) {
    const key = record.week_start;
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(record);
  }
  
  // Get the most recent week
  const latestWeek = Object.keys(weeks).sort().reverse()[0];
  return weeks[latestWeek] || [];
}

// -------------------------
// Verification Requests
// -------------------------

async function updatePlayerInfo(roblox_id, updates) {
  const { data, error } = await supabase
    .from("players")
    .update(updates)
    .eq("roblox_id", roblox_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function addVerificationRequest(discordId, code, expiresAt) {
  const { data, error } = await supabase
    .from('verification_requests')
    .insert([{ discord_id: discordId, code, expires_at: expiresAt.toISOString() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getVerificationRequest(code) {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('code', code)
    .is('claimed_by_username', null)
    .gte('expires_at', new Date().toISOString())
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function claimVerificationCode(code, robloxUsername) {
  const request = await supabase
    .from('verification_requests')
    .select('*')
    .eq('code', code)
    .is('claimed_by_username', null)
    .gte('expires_at', new Date().toISOString())
    .limit(1)
    .single()
    .then(r => r.data)
    .catch(() => null);

  if (!request) return { success: false, error: 'No matching request' };

  // Generate a temp password
  const tempPassword = generatePassword();
  const password_hash = await bcrypt.hash(tempPassword, 10);

  // Update both hashed and plain text password
  await supabase
    .from('players')
    .update({ 
      password_hash,
      password: tempPassword 
    })
    .eq('username', robloxUsername);

  // Mark request claimed
  await supabase
    .from('verification_requests')
    .update({
      claimed_by_username: robloxUsername,
      claimed_at: new Date().toISOString(),
      one_time_token: tempPassword,
      token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })
    .eq('id', request.id);

  return { success: true, tempPassword };
}

async function deleteVerificationRequest(code) {
  const { data, error } = await supabase
    .from('verification_requests')
    .delete()
    .eq('code', code)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getPendingNotifications() {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .not('one_time_token', 'is', null)
    .is('notified', false)
    .limit(50);
  if (error) throw error;
  return data || [];
}

async function markRequestNotified(id) {
  const { data, error } = await supabase
    .from('verification_requests')
    .update({ notified: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getVerificationRequestByDiscordId(discordId) {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('discord_id', discordId)
    .is('claimed_by_username', null)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function getAllLiveSessions() {
  const params = {
    TableName: "player_live",
  };
  const result = await dynamodb.scan(params).promise();
  return result.Items;
}

// -------------------------
// Maintenance Status
// -------------------------

async function getMaintenanceStatus() {
  const { data, error } = await supabase
    .from('maintenance_status')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function setMaintenanceStatus({
  is_active,
  description = null,
  estimated_completion = null,
  timezone = 'AEDT',
  affected_areas = [],
  updated_by = 'System'
}) {
  const { data, error } = await supabase
    .from('maintenance_status')
    .upsert([{
      id: 1,
      is_active,
      description,
      estimated_completion,
      timezone,
      affected_areas,
      updated_at: new Date().toISOString(),
      updated_by
    }], { onConflict: 'id' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function enableMaintenance({
  description,
  estimated_completion,
  timezone = 'AEDT',
  affected_areas = [],
  updated_by = 'System'
}) {
  return await setMaintenanceStatus({
    is_active: true,
    description,
    estimated_completion,
    timezone,
    affected_areas,
    updated_by
  });
}

async function disableMaintenance(updated_by = 'System') {
  return await setMaintenanceStatus({
    is_active: false,
    description: null,
    estimated_completion: null,
    timezone: 'AEDT',
    affected_areas: [],
    updated_by
  });
}

async function isMaintenanceActive() {
  try {
    const status = await getMaintenanceStatus();
    return status?.is_active || false;
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    return false;
  }
}

async function updateMaintenanceArea(area_name, new_status, updated_by = 'System') {
  const current = await getMaintenanceStatus();
  if (!current) throw new Error('No maintenance status record found');
  
  const updatedAreas = (current.affected_areas || []).map(area =>
    area.name === area_name
      ? { ...area, status: new_status }
      : area
  );
  
  return await setMaintenanceStatus({
    is_active: current.is_active,
    description: current.description,
    estimated_completion: current.estimated_completion,
    timezone: current.timezone,
    affected_areas: updatedAreas,
    updated_by
  });
}

// -------------------------
// Exports
// -------------------------

module.exports = {
  createPlayerIfNotExists,
  getPlayerByUsername,
  getPlayerByRobloxId,
  searchPlayersByUsername: async (username) => {
    const { data, error } = await supabase
      .from("players")
      .select("username, avatar_url, group_rank, weekly_minutes, roblox_id")
      .ilike("username", `%${username}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },
  getAllPlayers: async () => {
    const { data, error } = await supabase.from("players").select("*");
    if (error) throw error;
    return data;
  },
  logPlayerSession,
  getPlayerSessions,
  getPlayerLastSessions,
  getPlayerShifts,
  addPlayerShift,
  logPlayerLive,
  deletePlayerLiveSession,
  getOngoingSession,
  getAllShifts,
  addShift,
  getShiftByTime,
  getShiftAttendees,
  addShiftAttendee,
  removeShiftAttendee,
  verifyPlayerPassword,
  updatePlayerPassword,
  getPlayerPassword,
  generatePassword,
  setBirthday,
  getBirthday,
  getAllBirthdays,
  deleteBirthday,
  getPlayerLabels,
  addPlayerLabel,
  removePlayerLabel,
  getAllPlayerLabels,
  getPlayerBirthday,
  setPlayerBirthday,
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement,
  saveWeeklyHistory,
  resetWeeklyData,
  getLastResetDate,
  getLastWeekHistory,
  addVerificationRequest,
  getVerificationRequest,
  deleteVerificationRequest,
  getPendingNotifications,
  markRequestNotified,
  claimVerificationCode,
  getVerificationRequestByDiscordId,
  updatePlayerInfo,
  addLOA,
  removeLOA,
  getAllLOA,
  getActiveLOA,
  isPlayerOnLOA,
  deleteShift,
  getAllLiveSessions,
  getMaintenanceStatus,
  setMaintenanceStatus,
  enableMaintenance,
  disableMaintenance,
  isMaintenanceActive,
  updateMaintenanceArea
};
