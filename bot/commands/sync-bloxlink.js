// commands/sync-bloxlink.js
const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Syncs Discord members (role-only) with Roblox IDs'),

  async execute(interaction) {
    // Use flags for ephemeral (64)
    await interaction.deferReply({ flags: 64 });

    const REQUIRED_ROLE_ID = '1361336053901824214';
    const CHUNK_SIZE = 1950;
    try {
      const guild = interaction.guild;
      if (!guild) return await interaction.editReply('❌ Not in a guild.');

      const channel = await guild.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      if (!channel) return await interaction.editReply('❌ Bot data channel not found.');

      // Make sure members cache is populated
      await guild.members.fetch();

      // Filter to members who have the role
      const membersWithRole = guild.members.cache.filter(m => m.roles?.cache?.has(REQUIRED_ROLE_ID));
      if (membersWithRole.size === 0) {
        return await interaction.editReply(`ℹ️ No members found with role ${REQUIRED_ROLE_ID}.`);
      }

      const newData = { discordToRoblox: {}, robloxToDiscord: {} };
      const debugLines = [];

      // Loop members who have the role
      for (const member of membersWithRole.values()) {
        const nick = (member.nickname || member.user.username || '').trim();
        if (!nick) {
          debugLines.push(`❌ ${member.user.tag} has no nickname/username`);
          continue;
        }

        // Extract username from "( @username )" or use single-word nickname
        const match = nick.match(/\(@\s*([^)]+?)\s*\)/) || nick.match(/\(@([^)]+?)\)/) || nick.match(/\(@([^)]+)\)/);
        // Try the more common pattern without explicit '@' capture if earlier fails
        const match2 = nick.match(/\(@(.+?)\)/);
        let robloxUsername = null;
        if (match && match[1]) robloxUsername = match[1].trim();
        else if (match2 && match2[1]) robloxUsername = match2[1].trim();
        else {
          // No parentheses form -> treat the entire nickname as username
          robloxUsername = nick.trim();
        }

        // Strip potential leading '@' (just in case) and whitespace
        robloxUsername = robloxUsername.replace(/^@+/, '').trim();

        // Roblox usernames don't contain spaces; if there are spaces, they probably indicate a display name fallback
        // but we'll try anyway (Roblox API will respond 404 if invalid)
        if (!robloxUsername) {
          debugLines.push(`❌ ${member.user.tag} -> invalid extracted username`);
          continue;
        }

        try {
          // Use Roblox modern endpoint
          const url = `https://users.roblox.com/v1/users/by-username/${encodeURIComponent(robloxUsername)}`;
          const res = await axios.get(url, { validateStatus: null });
          if (res.status === 200 && res.data && res.data.id) {
            const robloxId = res.data.id.toString();
            newData.discordToRoblox[member.id] = robloxId;      // store numeric ID
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

      // Prepare raw JSON
      const botData = { linkedUsers: newData };
      const json = JSON.stringify(botData, null, 2);

      // Split into 1950-character raw chunks (no code blocks)
      const chunks = [];
      for (let i = 0; i < json.length; i += CHUNK_SIZE) {
        chunks.push(json.slice(i, i + CHUNK_SIZE));
      }

      // Delete old bot-data messages authored by the bot (limit to last 100)
      const oldMessages = await channel.messages.fetch({ limit: 100 });
      for (const msg of oldMessages.values()) {
        if (msg.author?.id === interaction.client.user.id) {
          await msg.delete().catch(() => {});
        }
      }

      // Send raw JSON chunks
      for (const chunk of chunks) {
        await channel.send(chunk);
      }

      // Update in-memory
      interaction.client.botData = botData;

      // Truncate debug output so reply stays under limit
      let debugMsg = debugLines.join('\n');
      if (debugMsg.length > 1500) debugMsg = debugMsg.slice(0, 1500) + '\n... (truncated)';

      await interaction.editReply(`✅ Synced ${Object.keys(newData.robloxToDiscord).length} users with role.\n\nDebug:\n${debugMsg}`);
    } catch (err) {
      console.error('❌ Error in sync-bloxlink:', err);
      // safe reply/edit path
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: '❌ Failed to sync.', ephemeral: true });
      } else {
        await interaction.editReply('❌ Failed to sync.');
      }
    }
  },
};
