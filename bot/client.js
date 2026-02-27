const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, REST, Routes, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { Octokit } = require('octokit'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

  // --- INITIALIZE AI & GITHUB ---
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Command Handler
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);
      if (command?.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      }
    } catch (err) {
      console.error(`❌ Error loading command ${file}:`, err);
    }
  }

  // Initial Data Structure
  client.botData = { 
    linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} },
    countingGame: { channelId: null, currentNumber: 0, lastUserId: null },
    codeChannelId: null 
  };

  // --- DATA STORAGE LOGIC ---
  client.saveBotData = async () => {
    try {
      const channelId = process.env.BOT_DATA_CHANNEL_ID;
      if (!channelId) return console.warn("⚠️ No BOT_DATA_CHANNEL_ID set.");
      
      const channel = await client.channels.fetch(channelId);
      const messages = await channel.messages.fetch({ limit: 10 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);
      const content = JSON.stringify(client.botData, null, 2);

      if (lastBotMessage) await lastBotMessage.edit(content);
      else await channel.send(content);
      console.log('💾 Bot data saved to Discord.');
    } catch (err) {
      console.error('❌ Failed to save bot data:', err);
    }
  };

  client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    
    // Sync memory from Discord Channel
    try {
      const channelId = process.env.BOT_DATA_CHANNEL_ID;
      if (channelId) {
        const channel = await client.channels.fetch(channelId);
        const messages = await channel.messages.fetch({ limit: 10 });
        const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);
        
        if (lastBotMessage && lastBotMessage.content) {
          const parsedData = JSON.parse(lastBotMessage.content);
          client.botData = { ...client.botData, ...parsedData };
          console.log('✅ Bot data synced from cloud');
        }
      }
    } catch (err) {
      console.warn('⚠ Could not sync data, using defaults.');
    }
  });

  // --- AI AND PROTOCOL LOGIC ---
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!client.botData.codeChannelId || message.channel.id !== client.botData.codeChannelId) return;

    const isOwner = message.author.id === process.env.OWNER_ID;
    const protocolRegex = /protocoladdcode\("(.+)"\)/;
    const match = message.content.match(protocolRegex);

    if (match) {
      if (!isOwner) return message.reply("🚫 **Unauthorized.**");
      const instruction = match[1];
      const status = await message.reply("⚙️ **Protocol Active...**");

      try {
        const aiPrompt = `Return ONLY the JavaScript code for: ${instruction}. No markdown.`;
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
        await status.edit("✅ **Protocol Success.**");
      } catch (err) {
        await status.edit(`❌ **Protocol Failed:** ${err.message}`);
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

  // Load external modules
  try {
    require('./events/countingGame')(client);
  } catch (e) {
    console.warn("⚠️ Counting game module not found.");
  }

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (!interaction.replied) await interaction.reply({ content: '❌ Command Error.', ephemeral: true });
    }
  });

  // CRITICAL: We don't "await" login here so the main.js can move on immediately
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ Login failed:", err.message);
  });

  return client;
}

module.exports = { startBot };
