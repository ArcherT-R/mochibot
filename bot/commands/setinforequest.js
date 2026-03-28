if (interaction.isButton() && interaction.customId === 'fetch_roblox') {
  await interaction.deferReply({ ephemeral: true });

  const robloxId = await getRobloxId(interaction.user.id);

  if (!robloxId) {
    const failEmbed = new EmbedBuilder()
      .setTitle('❌ Not Found')
      .setDescription('No Roblox account linked. Please verify with Bloxlink first.')
      .setColor(0xFF0000);

    return await interaction.editReply({ embeds: [failEmbed] });
  }

  // Fetch Roblox username + avatar
  const userRes = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
  const userData = await userRes.json();

  const thumbRes = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`
  );
  const thumbData = await thumbRes.json();
  const thumbUrl = thumbData.data[0]?.imageUrl;

  const successEmbed = new EmbedBuilder()
    .setTitle('✅ Roblox Account Found')
    .setColor(0x00FF00)
    .addFields(
      { name: 'Roblox Username', value: userData.name ?? 'Unknown', inline: true },
      { name: 'Roblox ID', value: `${robloxId}`, inline: true }
    )
    .setFooter({ text: 'Powered by Bloxlink cache' });

  if (thumbUrl) successEmbed.setThumbnail(thumbUrl);

  await interaction.editReply({ embeds: [successEmbed] });
}
