const {
  Client, GatewayIntentBits, Partials, Collection,
  EmbedBuilder, REST, Routes
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const ALLOWED_ROLE_ID = '1468537071168913500';

async function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.GuildMember],
    // These help with Render's network environment
    rest: {
      retries: 5,
      timeout: 30000
    }
  });

  // ----------------------------
  // Load Commands
  // ----------------------------
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);
      if (command?.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.warn(`⚠ Skipped invalid command file: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Error loading command ${file}:`, err);
    }
  }

  // ----------------------------
  // Bot Data
  // ----------------------------
  client.botData = {
    linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} },
    countingGame: { channelId: null, currentNumber: 0, lastUserId: null }
  };

  client.saveBotData = async (createBackup = false) => {
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 10 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);
      const content = JSON.stringify(client.botData, null, 2);

      if (lastBotMessage) {
        await lastBotMessage.edit(content);
      } else {
        await channel.send(content);
      }

      if (createBackup) await channel.send(`Backup:\n${content}`);
      console.log('💾 Bot data saved.');
    } catch (err) {
      console.error('❌ Failed to save bot data:', err);
    }
  };

  // ----------------------------
  // Ready Event
  // ----------------------------
  client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    // Load bot data from channel
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 10 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);

      if (lastBotMessage && lastBotMessage.content) {
        try {
          const parsedData = JSON.parse(lastBotMessage.content);
          if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
            client.botData = parsedData;
            console.log('✅ Loaded bot data from message ID:', lastBotMessage.id);
          } else {
            console.warn('⚠ Invalid bot data structure, using defaults');
          }
        } catch (parseErr) {
          console.error('❌ Failed to parse bot data JSON:', parseErr);
        }
      } else {
        console.log('⚠ No bot message found in data channel, will create on first save');
      }

      if (!client.botData.countingGame || typeof client.botData.countingGame !== 'object') {
        client.botData.countingGame = { channelId: null, currentNumber: 0, lastUserId: null };
      }
      if (!client.botData.linkedUsers || typeof client.botData.linkedUsers !== 'object') {
        client.botData.linkedUsers = { discordToRoblox: {}, robloxToDiscord: {} };
      }

      console.log('💾 Bot data structure ready');
    } catch (err) {
      console.error('❌ Failed to load bot data:', err);
    }

    // Register slash commands
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

      const CORP_SERVER_ID = '1362322934794031104';
      const MAIN_SERVER_ID = process.env.GUILD_ID;
      const corpOnlyCommands = ['blacklist-new', 'blacklist-purge'];

      const mainServerCommands = [];
      const corpServerCommands = [];

      client.commands.forEach(cmd => {
        if (corpOnlyCommands.includes(cmd.data.name)) {
          corpServerCommands.push(cmd.data.toJSON());
        } else {
          mainServerCommands.push(cmd.data.toJSON());
        }
      });

      if (mainServerCommands.length > 0 && MAIN_SERVER_ID) {
        console.log(`📝 Registering ${mainServerCommands.length} commands to main server...`);
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, MAIN_SERVER_ID),
          { body: mainServerCommands }
        );
        console.log('✅ Main server commands registered');
      }

      if (corpServerCommands.length > 0) {
        console.log(`📝 Registering ${corpServerCommands.length} commands to corp server...`);
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, CORP_SERVER_ID),
          { body: corpServerCommands }
        );
        console.log('✅ Corporate server commands registered');
      }

      console.log('✅ All commands registered successfully');
    } catch (err) {
      console.error('❌ Failed to register commands:', err);
    }
  });

  // ----------------------------
  // Gateway / Connection Events
  // (helps diagnose Render WebSocket issues)
  // ----------------------------
  client.on('shardReady', (id) => console.log(`🔌 Shard ${id} ready`));
  client.on('shardDisconnect', (event, id) => console.warn(`⚠️ Shard ${id} disconnected:`, event.code, event.reason));
  client.on('shardReconnecting', (id) => console.log(`🔄 Shard ${id} reconnecting...`));
  client.on('shardResume', (id, replayed) => console.log(`✅ Shard ${id} resumed, replayed ${replayed} events`));
  client.on('shardError', (err, id) => console.error(`❌ Shard ${id} error:`, err));

  // ----------------------------
  // Events
  // ----------------------------
  require('./events/countingGame')(client);

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    global.requestsToday = (global.requestsToday || 0) + 1;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`⚠ Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      console.log(`⚡ Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
      await command.execute(interaction);
    } catch (err) {
      console.error(`❌ Error executing ${interaction.commandName}:`, err);
      const errorMessage = { content: '❌ Error executing command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage).catch(() => {});
      } else {
        await interaction.reply(errorMessage).catch(() => {});
      }
    }
  });

  client.on('error', err => {
    console.error('❌ Client error:', err);
    global.incidentsToday = (global.incidentsToday || 0) + 1;
  });

  process.on('uncaughtException', err => {
    console.error('❌ Uncaught exception:', err);
    global.incidentsToday = (global.incidentsToday || 0) + 1;
  });

  client.on('guildMemberAdd', async member => {
    try {
      const embed = new EmbedBuilder()
        .setTitle('👋 Welcome!')
        .setDescription(
          `Hello ${member}, welcome to Mochi Bar's Discord server!\n\n` +
          `Be sure to /verify with Bloxlink in <#1365990340011753502>!\n\n` +
          `🎉 You are our **#${member.guild.memberCount}** member!`
        )
        .setColor(0x00FFFF)
        .setTimestamp();
      await member.send({ embeds: [embed] });
    } catch (err) {
      console.warn(`⚠ Failed to DM ${member.user.tag}:`, err);
    }
  });

  // ----------------------------
  // Login
  // ----------------------------
  console.log('🔑 Attempting Discord login...');
  await client.login(process.env.DISCORD_TOKEN);
  console.log('✅ Login accepted — waiting for gateway ready event...');
  return client;
}

module.exports = { startBot };
