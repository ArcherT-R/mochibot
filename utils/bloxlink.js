const fetch = require('node-fetch');
const db = require('../endpoints/database');

const BLOXLINK_API_KEY = '38603859-bbdc-49a1-9859-dbf795686e8a';
const GUILD_ID = '1468451546579599441';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getRobloxId(discordId) {
  const cached = await db.getCachedBloxlink(discordId);

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime();
    if (age < CACHE_TTL_MS) {
      console.log(`[Bloxlink] Cache hit for ${discordId} -> ${cached.roblox_id}`);
      return cached.roblox_id;
    }
    console.log(`[Bloxlink] Cache expired for ${discordId}, refreshing...`);
  } else {
    console.log(`[Bloxlink] No cache for ${discordId}, calling Bloxlink API...`);
  }

  const res = await fetch(
    `https://api.blox.link/v4/public/guilds/${GUILD_ID}/discord-to-roblox/${discordId}`,
    { headers: { Authorization: BLOXLINK_API_KEY } }
  );

  if (!res.ok) {
    console.warn(`[Bloxlink] API failed (${res.status}) for ${discordId}, using stale cache.`);
    return cached?.roblox_id ?? null;
  }

  const data = await res.json();
  const robloxId = data.robloxID ?? null;

  if (robloxId) {
    await db.saveBloxlinkCache(discordId, robloxId);
    console.log(`[Bloxlink] Cached ${discordId} -> ${robloxId}`);
  } else {
    console.warn(`[Bloxlink] No Roblox account found for Discord ID ${discordId}`);
  }

  return robloxId;
}

async function getDiscordId(robloxId) {
  return await db.getCachedBloxlinkByRoblox(robloxId);
}

module.exports = { getRobloxId, getDiscordId };
