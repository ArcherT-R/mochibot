// commands/sync-bloxlink.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync Discord members (role-only) with Roblox IDs'),

  async execute(interaction) {
    // Allowed to run only if they have the admin role
    const ADMIN_ROLE = '1363595276576620595';    // who can run
    const TARGET_ROLE = '1361336053901824214';   // who gets logged

    if (!interaction.member.roles.cache.has(ADMIN_ROLE)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    // Use flags for ephemeral (64)
    await interaction.deferReply({ flags: 64 });

    const CHUNK_SIZE = 1950;
    try {
      const guild = interaction.guild;
      if (!guild) return await interaction.editReply('❌ Not in a guild.');

      const channel = await guild.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      if (!channel) return await interaction.editReply('❌ Bot data channel not found.');

      await guild.members.fetch();

      // Only members with the TARGET_ROLE will be processed
      const membersWithRole = guild.members.cache.filter(m => m.roles?.cache?.has(TARGET_ROLE));
      if (membersWithRole.size === 0) {
        return await interaction.editReply(`ℹ️ No members found with role ${TARGET_ROLE}.`);
      }

      const newData = { discordToRoblox: {}, robloxToDiscord: {} };
      const debugLines = [];

      for (const member of membersWithRole.values()) {
        const nick = (member.nickname || member.user.username || '').trim();
        if (!nick) {
          debugLines.push(`❌ ${member.user.tag} has no nickname/username`);
          continue;
        }

        // Extract Roblox username
        const match = nick.match(/\(@\s*([^)]+?)\s*\)/);
        let robloxUsername = match?.[1]?.trim() || nick.trim();
        robloxUsername = robloxUsername.replace(/^@+/, '').trim();

        if (!robloxUsername) {
          debugLines.push(`❌ ${member.user.tag} -> invalid extracted username`);
          continue;
        }

        try {
          const url = `https://users.roblox.com/v1/users/by-username/${encodeURIComponent(robloxUsername)}`;
          const res = await axios.get(url, { validateStatus: null });

          if (res.status === 200 && res.data?.id) {
            const robloxId = res.data.id.toString();
            newData.discordToRoblox[member.id] = robloxId;
            newData.robloxToDiscord[robloxId] = member.id;
            debugLines.push(`${robloxUsername} > ${robloxId}`);
          } else {
            debugLines.push(`❌ ${robloxUsername} not found (member ${member.user.tag})`);
          }
        } catch (err) {
          debugLines.push(`❌ Failed to fetch ${robloxUsername}`);
          console.warn(`Failed fetch for ${robloxUsername}:`, err?.message || err);
        }
      }

      // Write JSON to channel
      const botData = { linkedUsers: newData };
      const json = JSON.stringify(botData, null, 2);

      const chunks = [];
      for (let i = 0; i < json.length; i += CHUNK_SIZE) {
        chunks.push(json.slice(i, i + CHUNK_SIZE));
      }

      const oldMessages = await channel.messages.fetch({ limit: 100 });
      for (const msg of oldMessages.values()) {
        if (msg.author?.id === interaction.client.user.id) {
          await msg.delete().catch(() => {});
        }
      }

      for (const chunk of chunks) {
        await channel.send(chunk);
      }

      interaction.client.botData = botData;

      let debugMsg = debugLines.join('\n');
      if (debugMsg.length > 1500) debugMsg = debugMsg.slice(0, 1500) + '\n... (truncated)';

      await interaction.editReply(
        `✅ Synced ${Object.keys(newData.robloxToDiscord).length} users with role.\n\nDebug:\n${debugMsg}`
      );
    } catch (err) {
      console.error('❌ Error in sync-bloxlink:', err);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: '❌ Failed to sync.', ephemeral: true });
      } else {
        await interaction.editReply('❌ Failed to sync.');
      }
    }
  },
};
