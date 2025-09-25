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

  // Load commands from bot/commands
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.warn(`⚠ Skipped invalid command file: ${file}`);
      }
    }
  } else {
    console.warn(`⚠ Commands folder not found at: ${commandsPath}`);
  }

  // When bot is ready
  client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
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

  // Globals (reset on restart)
global.requestsToday = 0;
global.incidentsToday = 0;
global.startTime = Date.now(); // bot start time

// Count every command request
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  global.requestsToday++;
});

// Count every error as incident
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
      console.log(`✅ Sent welcome DM to ${member.user.tag}`);
    } catch (err) {
      console.warn(`⚠ Failed to DM ${member.user.tag}:`, err);
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

module.exports = { startBot };
