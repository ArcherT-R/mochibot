const bcrypt = require('bcryptjs');
const { getPlayerByRobloxId, updatePlayerPassword } = require('./database');

async function claimVerificationCode(code, robloxUsername) {
  // find the request
  const request = await getVerificationRequest(code);
  if (!request) return { success: false, error: 'No matching request' };

  // generate temp password
  const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase(); // 8-char temp
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // update the player in DB with hashed temp password
  const player = await getPlayerByRobloxId(robloxUsername);
  if (!player) return { success: false, error: 'Player not found' };

  await updatePlayerPassword(player.roblox_id, tempPassword); // saves hash

  // mark verification request as claimed
  await supabase
    .from('verification_requests')
    .update({
      claimed_by_username: robloxUsername,
      claimed_at: new Date().toISOString(),
      one_time_token: tempPassword, // optionally store temp password here
      token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })
    .eq('id', request.id);

  return { success: true, tempPassword }; // send plain temp password to client
}

module.exports = router;
