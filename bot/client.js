// bot/client.js
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Collection,
} = require('discord.js');

const { registerCommandsToGuild } = require('./register');
const loadCommands = require('./loadCommands');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();

async function startBot() {
  if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN missing in .env');

  // Load commands into client
  loadCommands(client);

  // Login to Discord
  await client.login(DISCORD_TOKEN);

  // Once ready
  client.once(Events.ClientReady, async c => {
    console.log(`🤖 Logged in as ${c.user.tag}`);
    if (CLIENT_ID && GUILD_ID) {
      await registerCommandsToGuild(client);
      console.log('📜 Commands registered to guild.');
    }
  });

  // Handle interactions
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({ content: 'Command not found.', ephemeral: true });
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Error executing ${interaction.commandName}:`, err);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
      }
    }
  });

  return client; // Important: return the client for endpoints to use
}

module.exports = { client, startBot };

