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
      }
    } catch (err) {
      console.error(`❌ Error loading command ${file}:`, err);
    }
  }

  // Initial Data Structure (Ensure codeChannelId exists)
  client.botData = { 
    linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} },
    countingGame: { channelId: null, currentNumber: 0, lastUserId: null },
    codeChannelId: null 
  };

  client.saveBotData = async (createBackup = false) => {
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 10 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);
      const content = JSON.stringify(client.botData, null, 2);

      if (lastBotMessage) await lastBotMessage.edit(content);
      else await channel.send(content);
      console.log('💾 Bot data saved.');
    } catch (err) {
      console.error('❌ Failed to save bot data:', err);
    }
  };

  client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    try {
      const channel = await client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 10 });
      const lastBotMessage = messages.find(msg => msg.author.id === client.user.id);
      
      if (lastBotMessage && lastBotMessage.content) {
        const parsedData = JSON.parse(lastBotMessage.content);
        // Merge loaded data with current data
        client.botData = { ...client.botData, ...parsedData };
        console.log('✅ Loaded bot data from message store');
      }
    } catch (err) {
      console.warn('⚠ Using default data (Cloud fetch failed)');
    }
  });

  // --- AI AND PROTOCOL LOGIC ---
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    // Only trigger if this is the designated code channel
    if (!client.botData.codeChannelId || message.channel.id !== client.botData.codeChannelId) return;

    const isOwner = message.author.id === process.env.OWNER_ID;
    const protocolRegex = /protocoladdcode\("(.+)"\)/;
    const match = message.content.match(protocolRegex);

    if (match) {
      // 1. Protocol Mode
      if (!isOwner) return message.reply("🚫 **Unauthorized:** Only the bot owner can use protocol commands.");
      
      const instruction = match[1];
      const status = await message.reply("⚙️ **Protocol Active:** Generating and pushing to GitHub...");

      try {
        // AI Logic: Get code based on your text
        const aiPrompt = `Return ONLY the JavaScript code for this instruction: ${instruction}. Do not use markdown code blocks (\`\`\`).`;
        const result = await aiModel.generateContent(aiPrompt);
        const code = result.response.text();

        // GitHub Logic: Update the file
        const path = 'updates.js'; // You can change this to any file path
        let sha;
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: path
          });
          sha = data.sha;
        } catch (e) {}

        await octokit.rest.repos.createOrUpdateFileContents({
          owner: process.env.GITHUB_OWNER,
          repo: process.env.GITHUB_REPO,
          path: path,
          message: `Protocol Edit: ${instruction.substring(0, 30)}`,
          content: Buffer.from(code).toString('base64'),
          sha: sha
        });

        await status.edit("✅ **Protocol Success:** Code generated and GitHub file updated.");
      } catch (err) {
        await status.edit(`❌ **Protocol Failed:** ${err.message}`);
      }
    } else {
      // 2. Standard AI Mode
      await message.channel.sendTyping();
      try {
        const result = await aiModel.generateContent(message.content);
        const responseText = result.response.text();
        await message.reply(responseText.substring(0, 2000));
      } catch (err) {
        console.error("AI Error:", err);
      }
    }
  });

  require('./events/countingGame')(client);

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Command Error.', ephemeral: true });
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

module.exports = { startBot };
