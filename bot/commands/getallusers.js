// bot/commands/getallusers.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRobloxId } = require('../../utils/bloxlink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getallusers')
    .setDescription('Fetch Roblox accounts for all server members via Bloxlink.')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Optional: only check members with this role')
        .setRequired(false)
    ),

  async execute(interaction) {
    const requiredRoleId = '1468486541172281395';
    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const filterRole = interaction.options.getRole('role');

    // Fetch all members
    await interaction.guild.members.fetch();
    let members = interaction.guild.members.cache.filter(m => !m.user.bot);

    if (filterRole) {
      members = members.filter(m => m.roles.cache.has(filterRole.id));
    }

    const total = members.size;
    let found = 0;
    let notFound = 0;
    const results = [];

    await interaction.editReply({ content: `🔍 Scanning ${total} members, please wait...` });

    for (const [, member] of members) {
      try {
        const robloxId = await getRobloxId(member.user.id);
        if (robloxId) {
          results.push({ discord: member.user.tag, discordId: member.user.id, robloxId, found: true });
          found++;
        } else {
          results.push({ discord: member.user.tag, discordId: member.user.id, robloxId: null, found: false });
          notFound++;
        }
      } catch (err) {
        console.error(`[getallusers] Error for ${member.user.tag}:`, err.message);
        results.push({ discord: member.user.tag, discordId: member.user.id, robloxId: null, found: false });
        notFound++;
      }
      // Small delay to avoid hammering the DB/Bloxlink
      await new Promise(r => setTimeout(r, 200));
    }

    // Split results into chunks of 20 for embeds
    const foundResults = results.filter(r => r.found);
    const notFoundResults = results.filter(r => !r.found);

    const chunkSize = 20;
    const embeds = [];

    // Summary embed
    embeds.push(new EmbedBuilder()
      .setTitle('👥 Member Roblox Lookup Complete')
      .setColor(0x0099FF)
      .addFields(
        { name: '✅ Linked', value: `${found}`, inline: true },
        { name: '❌ Not Linked', value: `${notFound}`, inline: true },
        { name: '👥 Total Scanned', value: `${total}`, inline: true }
      )
      .setTimestamp()
    );

    // Found users embed(s)
    for (let i = 0; i < foundResults.length; i += chunkSize) {
      const chunk = foundResults.slice(i, i + chunkSize);
      embeds.push(new EmbedBuilder()
        .setTitle(`✅ Linked Users (${i + 1}–${Math.min(i + chunkSize, foundResults.length)})`)
        .setColor(0x00FF00)
        .setDescription(chunk.map(r => `<@${r.discordId}> → \`${r.robloxId}\``).join('\n'))
      );
    }

    // Not found users embed(s)
    for (let i = 0; i < notFoundResults.length; i += chunkSize) {
      const chunk = notFoundResults.slice(i, i + chunkSize);
      embeds.push(new EmbedBuilder()
        .setTitle(`❌ Not Linked (${i + 1}–${Math.min(i + chunkSize, notFoundResults.length)})`)
        .setColor(0xFF0000)
        .setDescription(chunk.map(r => `<@${r.discordId}> (${r.discord})`).join('\n'))
      );
    }

    // Discord allows max 10 embeds per message, so split into batches
    const embedBatches = [];
    for (let i = 0; i < embeds.length; i += 10) {
      embedBatches.push(embeds.slice(i, i + 10));
    }

    await interaction.editReply({ content: null, embeds: embedBatches[0] });
    for (let i = 1; i < embedBatches.length; i++) {
      await interaction.followUp({ embeds: embedBatches[i], ephemeral: true });
    }
  }
};
