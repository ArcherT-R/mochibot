const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.GuildMember]
  });

  // Command collection
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if (command.data && command.execute) client.commands.set(command.data.name, command);
    }
  }

  // --- Persistent bot data ---
  client.botData = {
    linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} },
    points: {},
    settings: {}
  };

  client.saveBotData = async (createBackup = false) => {
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      const content = JSON.stringify(client.botData, null, 2);

      if (lastMessage) {
        await lastMessage.edit(content);
      } else {
        await channel.send(content);
      }

      if (createBackup) await channel.send(`Backup:\n${content}`);
      console.log('💾 Bot data saved.');
    } catch (err) {
      console.error('❌ Failed to save bot data:', err);
    }
  };

  client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    // Load saved bot data
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      if (lastMessage) {
        client.botData = JSON.parse(lastMessage.content);
      }
      console.log('💾 Loaded bot data:', client.botData);
    } catch (err) {
      console.error('❌ Failed to load bot data:', err);
    }
  });

  // Slash command handling
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ There was an error executing this command.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ There was an error executing this command.', ephemeral: true });
      }
    }
  });

  // Globals
  global.requestsToday = 0;
  global.incidentsToday = 0;
  global.startTime = Date.now();

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    global.requestsToday++;
  });

  client.on('error', (err) => {
    console.error("❌ Client error:", err);
    global.incidentsToday++;
  });

  process.on('uncaughtException', (err) => {
    console.error("❌ Uncaught exception:", err);
    global.incidentsToday++;
  });

  // Welcome DM
  client.on('guildMemberAdd', async (member) => {
    try {
      const dmChannel = await member.createDM();
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('👋 Welcome!')
        .setDescription(`Hello ${member}, welcome to Mochi Bar's discord server!\n\n` +
                        `Be sure to /verify with bloxlink in <#1365990340011753502>!\n\n` +
                        `🎉 Questions can be asked in tickets, you are our **#${member.guild.memberCount}** member!`)
        .setColor(0x00FFFF)
        .setTimestamp();
      await dmChannel.send({ embeds: [welcomeEmbed] });
    } catch (err) {
      console.warn(`⚠ Failed to DM ${member.user.tag}:`, err);
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

module.exports = { startBot };
