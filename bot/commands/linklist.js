// bot/commands/linklist.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require(‘discord.js’);
const { loadLinkedUsers, saveLinkedUsers } = require(’../../data/data’); // local JSON backup

module.exports = {
data: new SlashCommandBuilder()
.setName(‘linklist’)
.setDescription(‘Show all linked Discord ↔ Roblox accounts (staff only)’),

async execute(interaction) {
const requiredRoleId = ‘1363595276576620595’;

```
const member = interaction.member;
if (!member) {
  return await interaction.reply({ content: '❌ Could not fetch your member data.', ephemeral: true });
}
if (!member.roles.cache.has(requiredRoleId)) {
  return await interaction.reply({ content: '❌ You don't have permission to use this command.', ephemeral: true });
}

// Load from memory first, fallback to JSON
const linkedUsers = interaction.client.botData.linkedUsers || loadLinkedUsers();
const mappings = linkedUsers.discordToRoblox || {};

if (Object.keys(mappings).length === 0) {
  return await interaction.reply({ content: '💫 No linked users found, please check data is saved!', ephemeral: true });
}

const embed = new EmbedBuilder()
  .setTitle('🔗 Linked Users')
  .setColor(0x0099FF)
  .setDescription(
    Object.entries(mappings)
      .map(([discordId, robloxName]) => `👤 <@${discordId}> → **${robloxName}**`)
      .join('\n')
  )
  .setFooter({ text: 'Select a user below to delete their link' });

// Create select menu with all linked users
const options = Object.entries(mappings).map(([discordId, robloxName]) => ({
  label: `${robloxName}`,
  description: `Discord ID: ${discordId}`,
  value: discordId
}));

// Discord has a limit of 25 options per select menu
const selectMenu = new StringSelectMenuBuilder()
  .setCustomId('delete_link')
  .setPlaceholder('Select a user to unlink')
  .addOptions(options.slice(0, 25)); // Limit to 25 options

const row = new ActionRowBuilder().addComponents(selectMenu);

await interaction.reply({ 
  embeds: [embed], 
  components: [row], 
  ephemeral: true 
});

// Wait for select menu interaction
try {
  const selectInteraction = await interaction.channel.awaitMessageComponent({
    filter: (i) => i.user.id === interaction.user.id && i.customId === 'delete_link',
    componentType: ComponentType.StringSelect,
    time: 60000
  });

  const selectedDiscordId = selectInteraction.values[0];
  const robloxName = mappings[selectedDiscordId];

  // Create confirmation buttons
  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm_delete')
    .setLabel('Confirm Delete')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_delete')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

  const confirmEmbed = new EmbedBuilder()
    .setTitle('⚠️ Confirm Deletion')
    .setColor(0xFF0000)
    .setDescription(`Are you sure you want to unlink?\n👤 <@${selectedDiscordId}> → **${robloxName}**`);

  await selectInteraction.update({ 
    embeds: [confirmEmbed], 
    components: [buttonRow] 
  });

  // Wait for button interaction
  const buttonInteraction = await interaction.channel.awaitMessageComponent({
    filter: (i) => i.user.id === interaction.user.id && (i.customId === 'confirm_delete' || i.customId === 'cancel_delete'),
    componentType: ComponentType.Button,
    time: 30000
  });

  if (buttonInteraction.customId === 'confirm_delete') {
    // Find and delete the Roblox ID mapping
    const robloxToDiscord = linkedUsers.robloxToDiscord || {};
    
    // Find the Roblox ID that maps to this Discord ID
    const robloxIdToDelete = Object.keys(robloxToDiscord).find(
      rId => robloxToDiscord[rId] === selectedDiscordId
    );
    
    // Delete both mappings
    delete mappings[selectedDiscordId];
    if (robloxIdToDelete) {
      delete robloxToDiscord[robloxIdToDelete];
    }
    
    // Update both memory and file
    if (interaction.client.botData.linkedUsers) {
      interaction.client.botData.linkedUsers.discordToRoblox = mappings;
      interaction.client.botData.linkedUsers.robloxToDiscord = robloxToDiscord;
    }
    
    // Save to Discord (primary persistence)
    if (interaction.client.saveBotData) await interaction.client.saveBotData();
    
    // Save to local JSON backup
    saveLinkedUsers({ 
      discordToRoblox: mappings,
      robloxToDiscord: robloxToDiscord
    });

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Link Deleted')
      .setColor(0x00FF00)
      .setDescription(`Successfully unlinked:\n👤 <@${selectedDiscordId}> → **${robloxName}**`);

    await buttonInteraction.update({ 
      embeds: [successEmbed], 
      components: [] 
    });
  } else if (buttonInteraction.customId === 'cancel_delete') {
    const cancelEmbed = new EmbedBuilder()
      .setTitle('❌ Deletion Cancelled')
      .setColor(0x808080)
      .setDescription('No changes were made.');

    await buttonInteraction.update({ 
      embeds: [cancelEmbed], 
      components: [] 
    });
  }

} catch (error) {
  // Timeout or error occurred
  if (error.message.includes('time')) {
    const timeoutEmbed = new EmbedBuilder()
      .setTitle('⏱️ Timed Out')
      .setColor(0x808080)
      .setDescription('Selection timed out. No changes were made.');

    await interaction.editReply({ 
      embeds: [timeoutEmbed], 
      components: [] 
    }).catch(() => {});
  } else {
    console.error('Error in linklist command:', error);
  }
}
```

}
};