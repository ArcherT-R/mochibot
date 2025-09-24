const { Client, GatewayIntentBits, EmbedBuilder, Partials } = require('discord.js');

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

  client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
  });

  client.on('guildMemberAdd', async (member) => {
    try {
      // Make sure the bot can DM
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

