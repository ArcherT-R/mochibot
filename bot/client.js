const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { Octokit } = require('octokit'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function startBot() {
  // 1. Initialize Client with ALL required Intents for status and roles
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,   // Required for SOTW role checks
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Required for AI commands
      GatewayIntentBits.GuildPresences  // Required to show the green "Online" dot
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Message]
  });

  // --- INITIALIZE AI & GITHUB ---
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // --- COMMAND LOADER ---
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });

  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    try {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if (command?.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      }
    } catch (err) {
      console.error(`❌ Error loading command ${file}:`, err.message);
    }
  }

  // Initial Memory Structure
  client.botData = { 
    linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} },
    countingGame: { channelId: null, currentNumber: 0, lastUserId: null },
    codeChannelId: null 
  };

  // --- DATA SYNC UTILITY ---
  client.saveBotData = async () => {
    try {
      const channelId = process.env.BOT_DATA_CHANNEL_ID;
      if (!channelId) return;
      
      const channel = await client.channels.fetch(channelId);
      const content = JSON.stringify(client.botData, null, 2);
      
      const messages = await channel.messages.fetch({ limit: 10 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);

      if (lastBotMessage) await lastBotMessage.edit(content);
      else await channel.send(content);
      console.log('💾 Data backed up to Discord.');
    } catch (err) {
      console.error('❌ Save error:', err.message);
    }
  };

  // --- READY EVENT ---
  client.once('ready', async () => {
    // FORCE GREEN STATUS
    client.user.setPresence({
      status: 'online',
      activities: [{ name: 'Mochi Bar Dashboard', type: 0 }]
    });

    console.log(`🤖 Logged in as ${client.user.tag}`);
    console.log(`🟢 Status set to ONLINE`);

    // Sync data from the cloud channel
    try {
      const channelId = process.env.BOT_DATA_CHANNEL_ID;
      if (channelId) {
        const channel = await client.channels.fetch(channelId);
        const messages = await channel.messages.fetch({ limit: 10 });
        const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);
        
        if (lastBotMessage?.content) {
          const parsedData = JSON.parse(lastBotMessage.content);
          client.botData = { ...client.botData, ...parsedData };
          console.log('✅ Memory synchronized from Discord store.');
        }
      }
    } catch (err) {
      console.warn('⚠️ Sync failed, using default memory.');
    }
  });

  // --- AI & PROTOCOL MESSAGE HANDLER ---
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!client.botData.codeChannelId || message.channel.id !== client.botData.codeChannelId) return;

    const isOwner = message.author.id === process.env.OWNER_ID;
    const protocolRegex = /protocoladdcode\("(.+)"\)/;
    const match = message.content.match(protocolRegex);

    if (match) {
      if (!isOwner) return message.reply("🚫 **Unauthorized.**");
      const instruction = match[1];
      const statusMsg = await message.reply("⚙️ **Protocol Active...**");

      try {
        const aiPrompt = `Return ONLY the JavaScript code for: ${instruction}. No markdown blocks.`;
        const result = await aiModel.generateContent(aiPrompt);
        const code = result.response.text();

        const filePath = 'updates.js';
        let sha;
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: filePath
          });
          sha = data.sha;
        } catch (e) {}

        await octokit.rest.repos.createOrUpdateFileContents({
          owner: process.env.GITHUB_OWNER,
          repo: process.env.GITHUB_REPO,
          path: filePath,
          message: `Protocol Edit: ${instruction.substring(0, 30)}`,
          content: Buffer.from(code).toString('base64'),
          sha: sha
        });
        await statusMsg.edit("✅ **Protocol Success: GitHub Updated.**");
      } catch (err) {
        await statusMsg.edit(`❌ **Protocol Failed:** ${err.message}`);
      }
    } else {
      await message.channel.sendTyping();
      try {
        const result = await aiModel.generateContent(message.content);
        await message.reply(result.response.text().substring(0, 2000));
      } catch (err) {
        console.error("AI Error:", err);
      }
    }
  });

  // --- SLASH COMMANDS & INTERACTIONS ---
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error("Command Error:", err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
      }
    }
  });

  // Load external events if they exist
  try {
    const countingPath = path.join(__dirname, '../events/countingGame.js');
    if (fs.existsSync(countingPath)) require(countingPath)(client);
  } catch (e) {
    console.warn("⚠️ Counting game event not loaded.");
  }

  // --- FINAL LOGIN ---
  // No "await" here so startup.js can finish its job and open the port
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ DISCORD LOGIN FAILED:", err.message);
  });

  return client;
}

module.exports = { startBot };
