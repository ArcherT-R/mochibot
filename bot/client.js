const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, REST, Routes } = require('discord.js');
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

  // --- Command collection ---
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command?.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.warn(`⚠ Skipped invalid command file: ${file}`);
    }
  }

  // --- Persistent bot data ---
  client.botData = { linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} } };

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

    // Load bot data
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      if (lastMessage) client.botData = JSON.parse(lastMessage.content);
      console.log('💾 Loaded bot data:', client.botData);
    } catch (err) {
      console.error('❌ Failed to load bot data:', err);
    }

    // Register slash commands to the guild
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      const commandsData = client.commands.map(cmd => cmd.data.toJSON());
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
        { body: commandsData }
      );
      console.log('✅ Commands registered with Discord');
    } catch (err) {
      console.error('❌ Failed to register commands:', err);
    }
  });

  // --- Interaction handling ---
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    global.requestsToday = (global.requestsToday || 0) + 1;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Error executing command.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Error executing command.', ephemeral: true });
      }
    }
  });

  // --- Error handling ---
  client.on('error', err => { console.error('❌ Client error:', err); global.incidentsToday = (global.incidentsToday || 0) + 1; });
  process.on('uncaughtException', err => { console.error('❌ Uncaught exception:', err); global.incidentsToday = (global.incidentsToday || 0) + 1; });

  // --- Welcome DM ---
  client.on('guildMemberAdd', async member => {
    try {
      const dm = await member.createDM();
      const embed = new EmbedBuilder()
        .setTitle('👋 Welcome!')
        .setDescription(`Hello ${member}, welcome to Mochi Bar's Discord server!\n\n` +
                        `Be sure to /verify with Bloxlink in <#1365990340011753502>!\n\n` +
                        `🎉 You are our **#${member.guild.memberCount}** member!`)
        .setColor(0x00FFFF)
        .setTimestamp();
      await dm.send({ embeds: [embed] });
    } catch (err) {
      console.warn(`⚠ Failed to DM ${member.user.tag}:`, err);
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

module.exports = { startBot };
