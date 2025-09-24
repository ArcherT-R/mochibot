// bot/client.js
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

async function startBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel] // Needed for DMs to new members
  });

  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      const server = member.guild;
      const memberCount = server.memberCount;

      const embed = new EmbedBuilder()
        .setColor(0x00FFAA) // greenish color
        .setTitle('👋 Welcome!')
        .setDescription(
          `👋 Hello ${member}!\n` +
          `Welcome to Mochi Bar's Discord server. Be sure to /verify with Bloxlink in <#1365990340011753502>!\n\n` +
          `🎉 Questions can be asked in tickets. You are our **#${memberCount} member!**`
        )
        .setTimestamp();

      await member.send({ embeds: [embed] });
      console.log(`Sent welcome embed to ${member.user.tag}`);
    } catch (err) {
      console.warn(`Could not DM ${member.user.tag}:`, err);
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}

module.exports = { startBot };
