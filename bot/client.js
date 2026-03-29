
const {
  Client, GatewayIntentBits, Partials, Collection,
  EmbedBuilder, REST, Routes
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const fetch = require('node-fetch');
const { getRobloxId } = require('../utils/bloxlink');

async function waitForDiscordAccess() {
  const CHECK_INTERVAL = 60000;
  let attempt = 0;

  while (true) {
    attempt++;
    const reachable = await new Promise((resolve) => {
      https.get('https://discord.com/api/v10/gateway', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ Discord API reachable! (attempt ${attempt})`);
            resolve(true);
          } else {
            console.warn(`⏳ Still rate limited (attempt ${attempt}) — Status: ${res.statusCode}, Code: ${data.trim()}`);
            console.warn(`   Retrying in 60 seconds...`);
            resolve(false);
          }
        });
      }).on('error', (err) => {
        console.error(`❌ Network error reaching Discord (attempt ${attempt}): ${err.message}`);
        console.warn(`   Retrying in 60 seconds...`);
        resolve(false);
      });
    });

    if (reachable) return;
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}

async function startBot() {
  const db = require('../endpoints/database');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.GuildMember],
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
      const content = JSON.stringify(client.botData, null, 2);

      if (content.length > 1990) {
        console.warn(`⚠️ Bot data too large for Discord (${content.length} chars), saving to Supabase...`);
        await db.saveBotDataBackup(content);
        console.log('💾 Bot data saved to Supabase.');
        return;
      }

      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 10 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);

      if (lastBotMessage) {
        await lastBotMessage.edit(content);
      } else {
        await channel.send(content);
      }

      if (createBackup) await channel.send(`Backup:\n${content}`);
      console.log('💾 Bot data saved to Discord.');
    } catch (err) {
      console.error('❌ Failed to save bot data:', err);
    }
  };

  // ----------------------------
  // Ready Event
  // ----------------------------
  client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    try {
      let parsedData = null;

      // Try Discord first
      try {
        const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
        const messages = await channel.messages.fetch({ limit: 10 });
        const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);

        if (lastBotMessage && lastBotMessage.content) {
          parsedData = JSON.parse(lastBotMessage.content);
          console.log('✅ Loaded bot data from Discord message ID:', lastBotMessage.id);
        }
      } catch (discordErr) {
        console.warn('⚠️ Could not load bot data from Discord:', discordErr.message);
      }

      // Fall back to Supabase
      if (!parsedData) {
        try {
          const supabaseData = await db.loadBotDataBackup();
          if (supabaseData) {
            parsedData = JSON.parse(supabaseData);
            console.log('✅ Loaded bot data from Supabase backup.');
          }
        } catch (supabaseErr) {
          console.warn('⚠️ Could not load bot data from Supabase:', supabaseErr.message);
        }
      }

      if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
        client.botData = parsedData;
      } else {
        console.warn('⚠ No valid bot data found, using defaults.');
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
  // Gateway / Shard Events
  // ----------------------------
  client.on('shardReady', (id) => console.log(`🔌 Shard ${id} ready`));
  client.on('shardDisconnect', (event, id) => console.warn(`⚠️ Shard ${id} disconnected:`, event.code, event.reason));
  client.on('shardReconnecting', (id) => console.log(`🔄 Shard ${id} reconnecting...`));
  client.on('shardResume', (id, replayed) => console.log(`✅ Shard ${id} resumed, replayed ${replayed} events`));
  client.on('shardError', (err, id) => console.error(`❌ Shard ${id} error:`, err.message));

  // ----------------------------
  // Other Events
  // ----------------------------
  require('./events/countingGame')(client);

  // ----------------------------
  // Interaction Handler
  // ----------------------------
  client.on('interactionCreate', async (interaction) => {

    // Button handler
    if (interaction.isButton()) {
      if (interaction.customId === 'fetch_roblox') {
        await interaction.deferReply({ ephemeral: true });
        try {
          const robloxId = await Promise.race([
            getRobloxId(interaction.user.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
          ]);

          if (!robloxId) {
            return await interaction.editReply({
              embeds: [new EmbedBuilder()
                .setTitle('❌ Not Found')
                .setDescription('No Roblox account linked. Please verify with Bloxlink first.')
                .setColor(0xFF0000)
              ]
            });
          }

          const userRes = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
          const userData = await userRes.json();

          const thumbRes = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`
          );
          const thumbData = await thumbRes.json();
          const thumbUrl = thumbData.data[0]?.imageUrl;

          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Roblox Account Found')
            .setColor(0x00FF00)
            .addFields(
              { name: 'Roblox Username', value: userData.name ?? 'Unknown', inline: true },
              { name: 'Roblox ID', value: `${robloxId}`, inline: true }
            )
            .setFooter({ text: 'Powered by Bloxlink cache' });

          if (thumbUrl) successEmbed.setThumbnail(thumbUrl);
          await interaction.editReply({ embeds: [successEmbed] });

        } catch (err) {
          console.error('[fetch_roblox]', err);
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setTitle('❌ Error')
              .setDescription(err.message === 'timeout' ? 'Request timed out, please try again.' : 'Something went wrong.')
              .setColor(0xFF0000)
            ]
          }).catch(() => {});
        }
      }
      return;
    }

    // Command handler
    if (!interaction.isCommand()) return;
    if (interaction.replied || interaction.deferred) return;

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
    if (err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT') {
      process.exit(1);
    }
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
  // Wait for rate limit to clear, then login
  // ----------------------------
  console.log('🌐 Checking Discord API access before login...');
  await waitForDiscordAccess();

  console.log('🔑 Attempting Discord login...');
  await client.login(process.env.DISCORD_TOKEN);
  console.log('✅ Login accepted — waiting for gateway ready event...');
  return client;
}

module.exports = { startBot };
