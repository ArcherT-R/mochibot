// src/bot/register.js
const { REST, Routes } = require('discord.js');

async function registerCommandsToGuild(client) {
  const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
  const CLIENT_ID = process.env.CLIENT_ID;
  const GUILD_ID = process.env.GUILD_ID;

  if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.warn('⚠️ Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  const commandsPayload = Array.from(client.commands.values()).map(c => c.data.toJSON());

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commandsPayload }
    );
    console.log(`📜 Registered ${commandsPayload.length} commands to guild ${GUILD_ID}`);
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }
}

module.exports = { registerCommandsToGuild };
