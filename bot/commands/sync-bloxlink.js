const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Syncs Roblox usernames from Bloxlink and updates bot data.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild;
      const channel = await guild.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);

      // Fetch all members
      await guild.members.fetch();
      const linkedUsers = { discordToRoblox: {}, robloxToDiscord: {} };

      let count = 0;
      guild.members.cache.forEach(member => {
        const nick = member.nickname || member.user.username; // fallback to username
        // Check for "DisplayName (@Username)"
        const match = nick.match(/^(.+)\s+\(@(.+)\)$/);
        if (match) {
          const displayName = match[1];
          const username = match[2];
          linkedUsers.discordToRoblox[member.id] = username;
          linkedUsers.robloxToDiscord[username] = member.id;
          count++;
        }
      });

      // Convert to JSON string
      const jsonString = JSON.stringify({ linkedUsers }, null, 2);

      // Split into multiple messages if too long
      const MAX_CHARS = 2000;
      const chunks = jsonString.match(/[\s\S]{1,4000}/g);

      // Send or edit first message
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      if (lastMessage) {
        await lastMessage.edit(chunks[0]);
      } else {
        await channel.send(chunks[0]);
      }

      // Send remaining chunks as new messages
      for (let i = 1; i < chunks.length; i++) {
        await channel.send(chunks[i]);
      }

      // Update in-memory bot data
      interaction.client.botData = { linkedUsers };

      await interaction.editReply(`✅ Synced ${count} users from Bloxlink!`);
    } catch (err) {
      console.error('❌ Error in sync-bloxlink:', err);
      await interaction.editReply('❌ Failed to sync users.');
    }
  }
};
