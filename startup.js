const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildPresences // CRITICAL for green dot
    ],
    partials: [Partials.Channel, Partials.GuildMember]
  });

  client.commands = new Collection();
  // Load commands from folder
  const cmdPath = path.join(__dirname, '../commands');
  if (fs.existsSync(cmdPath)) {
    const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const cmd = require(path.join(cmdPath, file));
      if (cmd.data) client.commands.set(cmd.data.name, cmd);
    }
  }

  client.once('ready', () => {
    client.user.setPresence({ status: 'online', activities: [{ name: 'Mochi Bar', type: 0 }] });
    console.log(`🤖 Bot Ready: ${client.user.tag}`);
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

module.exports = { startBot };
