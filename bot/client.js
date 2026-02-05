const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, REST, Routes, ChannelType } = require('discord.js');
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
    partials: [Partials.Channel, Partials.GuildMember]
  });

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

  // Initialize default bot data structure
  client.botData = { 
    linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} },
    countingGame: { channelId: null, currentNumber: 0, lastUserId: null } 
  };

  client.saveBotData = async (createBackup = false) => {
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 10 });
      
      // Find the last message sent by THIS bot
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

  client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    // Load bot data from channel
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 10 });
      
      // Find the last message sent by THIS bot
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);
      
      if (lastBotMessage && lastBotMessage.content) {
        try {
          const parsedData = JSON.parse(lastBotMessage.content);
          
          // Validate that parsedData is an object before using it
          if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
            client.botData = parsedData;
            console.log('✅ Loaded bot data from message ID:', lastBotMessage.id);
          } else {
            console.warn('⚠ Invalid bot data structure (not an object), using defaults');
          }
        } catch (parseErr) {
          console.error('❌ Failed to parse bot data JSON:', parseErr);
          console.warn('⚠ Using default bot data structure');
        }
      } else {
        console.log('⚠ No bot message found in data channel, will create new one on first save');
      }
      
      // Ensure countingGame always exists with correct structure
      if (!client.botData.countingGame || typeof client.botData.countingGame !== 'object') {
        console.log('⚠ countingGame missing or invalid, initializing...');
        client.botData.countingGame = { channelId: null, currentNumber: 0, lastUserId: null };
      }
      
      // Ensure linkedUsers always exists
      if (!client.botData.linkedUsers || typeof client.botData.linkedUsers !== 'object') {
        console.log('⚠ linkedUsers missing or invalid, initializing...');
        client.botData.linkedUsers = { discordToRoblox: {}, robloxToDiscord: {} };
      }
      
      console.log('💾 Bot data structure ready:', client.botData);
    } catch (err) {
      console.error('❌ Failed to load bot data:', err);
      console.warn('⚠ Using default bot data structure');
    }

    // Register slash commands
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      
      // Separate commands by server
      const mainServerCommands = [];
      const corpServerCommands = [];
      
      const CORP_SERVER_ID = '1362322934794031104';
      const MAIN_SERVER_ID = process.env.GUILD_ID;
      
      // Commands that should only be in corporate server
      const corpOnlyCommands = ['blacklist-new', 'blacklist-purge'];
      
      client.commands.forEach(cmd => {
        if (corpOnlyCommands.includes(cmd.data.name)) {
          corpServerCommands.push(cmd.data.toJSON());
        } else {
          mainServerCommands.push(cmd.data.toJSON());
        }
      });
      
      // Register main server commands
      if (mainServerCommands.length > 0 && MAIN_SERVER_ID) {
        console.log(`📝 Registering ${mainServerCommands.length} commands to main server (${MAIN_SERVER_ID}):`, mainServerCommands.map(c => c.name).join(', '));
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, MAIN_SERVER_ID),
          { body: mainServerCommands }
        );
        console.log(`✅ Main server commands registered`);
      }
      
      // Register corporate server commands
      if (corpServerCommands.length > 0) {
        console.log(`📝 Registering ${corpServerCommands.length} commands to corporate server (${CORP_SERVER_ID}):`, corpServerCommands.map(c => c.name).join(', '));
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, CORP_SERVER_ID),
          { body: corpServerCommands }
        );
        console.log(`✅ Corporate server commands registered`);
      }
      
      console.log('✅ All commands registered successfully');
    } catch (err) {
      console.error('❌ Failed to register commands:', err);
    }
  });

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

  // Track processed messages to prevent duplicates
  const processingMessages = new Set();

  client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    // Ensure botData structure exists
    if (!client.botData || !client.botData.countingGame) {
      console.warn('⚠ botData.countingGame not initialized in messageCreate');
      return;
    }
    
    const game = client.botData.countingGame;
    if (!game.channelId || message.channel.id !== game.channelId) return;

    // Prevent duplicate processing of the same message
    if (processingMessages.has(message.id)) {
      console.log('⚠ Skipping duplicate message processing:', message.id);
      return;
    }
    processingMessages.add(message.id);
    
    // Clean up old message IDs after 10 seconds
    setTimeout(() => processingMessages.delete(message.id), 10000);

    const expectedNumber = game.currentNumber + 1;
    const userNumber = parseInt(message.content.trim());
    
    const handleFailure = async (reason) => {
      try {
        await message.react('❌');
      } catch (error) {
        if (error.code !== 10008) {
          console.error("Error reacting to counting fail:", error);
        }
      }
      
      // Update game state BEFORE saving to prevent race conditions
      const failedNumber = expectedNumber;
      game.currentNumber = 0;
      game.lastUserId = null;
      
      // Save in background
      client.saveBotData().catch(err => {
        console.error("Error saving after counting failure:", err);
      });

      // Send failure message
      await message.channel.send({
        content: `🛑 **FAIL!** ${message.author} ${reason}. The next number was **${failedNumber}**. ` + 
                 `The count has been reset to **0**. The next number must be **1**.`,
        allowedMentions: { users: [message.author.id] }
      });
    };

    if (isNaN(userNumber) || userNumber !== expectedNumber) {
      return handleFailure("ruined the count with an incorrect number or format");
    }

    if (message.author.id === game.lastUserId) {
      return handleFailure("tried to count twice in a row");
    }
    
    // Update game state
    game.currentNumber = userNumber;
    game.lastUserId = message.author.id;
    
    // Save in background
    client.saveBotData().catch(err => {
      console.error("Error saving after successful count:", err);
    });
    
    try {
      await message.react('✅');
    } catch (error) {
      if (error.code !== 10008) {
        console.error("Error reacting to successful count:", error);
      }
    }
  });

  client.on('error', err => { console.error('❌ Client error:', err); global.incidentsToday = (global.incidentsToday || 0) + 1; });
  process.on('uncaughtException', err => { console.error('❌ Uncaught exception:', err); global.incidentsToday = (global.incidentsToday || 0) + 1; });

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
