const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ALLOWED_ROLE_ID = '1468537071168913500';
const CORP_SERVER_ID = '1362322934794031104';

// Initialize global counters
global.requestsToday = 0;
global.incidentsToday = 0;

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
      } else {
        console.warn(`⚠ Skipped invalid command file: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Error loading command ${file}:`, err);
    }
  }

  // Initial Data Structure
  client.botData = { 
    linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} },
    countingGame: { channelId: null, currentNumber: 0, lastUserId: null } 
  };

  client.saveBotData = async (createBackup = false) => {
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 20 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id && !msg.content.startsWith('Backup:'));
      
      const content = JSON.stringify(client.botData, null, 2);

      // Warning: Discord character limit is 2000
      if (content.length > 1950) {
        console.error("❌ CRITICAL: botData is too large for a Discord message!");
        return;
      }

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

    // --- DATA LOADING ---
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 20 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id && !msg.content.startsWith('Backup:'));
      
      if (lastBotMessage?.content) {
        const parsedData = JSON.parse(lastBotMessage.content);
        client.botData = { ...client.botData, ...parsedData };
        console.log('✅ Loaded bot data successfully.');
      }
    } catch (err) {
      console.error('❌ Data load error (using defaults):', err.message);
    }

    // --- COMMAND REGISTRATION ---
    try {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      const mainServerCommands = [];
      const corpServerCommands = [];
      const corpOnlyCommands = ['blacklist-new', 'blacklist-purge'];

      client.commands.forEach(cmd => {
        const cmdJSON = cmd.data.toJSON();
        if (corpOnlyCommands.includes(cmd.data.name)) {
          corpServerCommands.push(cmdJSON);
        } else {
          mainServerCommands.push(cmdJSON);
        }
      });

      if (process.env.GUILD_ID) {
        await rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: mainServerCommands });
      }
      await rest.put(Routes.applicationGuildCommands(client.user.id, CORP_SERVER_ID), { body: corpServerCommands });
      
      console.log('✅ Slash commands synced.');
    } catch (err) {
      console.error('❌ Failed to register commands:', err);
    }
  });

  // Events
  require('./events/countingGame')(client);

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    global.requestsToday++;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`❌ Execution error (${interaction.commandName}):`, err);
      const msg = { content: '❌ An error occurred while running this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  });

  client.on('guildMemberAdd', async member => {
    try {
      const embed = new EmbedBuilder()
        .setTitle('👋 Welcome!')
        .setDescription(`Hello ${member}, welcome to Mochi Bar!\n\nVerify in <#1365990340011753502>.\n\nYou are member **#${member.guild.memberCount}**!`)
        .setColor(0x00FFFF)
        .setTimestamp();
      await member.send({ embeds: [embed] });
    } catch {
      console.warn(`Could not DM ${member.user.tag}.`);
    }
  });

  client.on('error', err => { console.error('Client Error:', err); global.incidentsToday++; });
  process.on('uncaughtException', err => { console.error('Uncaught Exception:', err); global.incidentsToday++; });

  await client.login(process.env.DISCORD_TOKEN);
}

module.exports = { startBot };
