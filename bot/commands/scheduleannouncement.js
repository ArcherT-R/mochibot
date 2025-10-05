const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sendannouncement')
    .setDescription('Send announcement messages immediately'),
  
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const client = interaction.client;
      
      // Corporate announcement
      try {
        const corporateGuild = await client.guilds.fetch('1362322934794031104');
        const corporateChannel = await corporateGuild.channels.fetch('1375775901261893755');
        
        const corporateEmbed = new EmbedBuilder()
          .setDescription('👋 *Konchiwa corporate team,*\n\nA new system is out.. I wonder what! Well here\'s the website, its the Mochi Bar Staff Dashboard! To access **your account** please make your way to https://discord.com/channels/1355538260608155698/1363826458828734564 and use the command **/getdetails**, you will be guided on what to do step by step, the process is simple!\n\n❓ **Questions? Feel free to ask Archer and you\'ll be guided through your questions smoothly.**')
          .setColor('#42b4ff');
        
        await corporateChannel.send({ 
          embeds: [corporateEmbed],
          content: '<@&1375778001567875173>'
        });
        
        console.log('✅ Sent corporate announcement');
      } catch (err) {
        console.error('Error sending corporate announcement:', err);
        return interaction.editReply({ content: 'Failed to send corporate announcement: ' + err.message });
      }
      
      // Management announcement
      try {
        const managementGuild = await client.guilds.fetch('1355538260608155698');
        const managementChannel = await managementGuild.channels.fetch('1363512342372942005');
        
        const managementEmbed = new EmbedBuilder()
          .setDescription('👋 *Konchiwa management and supervision team,*\n\nA new system is out.. I wonder what! Well here\'s the website, its the Mochi Bar Staff Dashboard! To access **your account** please make your way to https://discord.com/channels/1355538260608155698/1363826458828734564 and use the command **/getdetails**, you will be guided on what to do step by step, the process is simple!\n\n❓ **Questions? Feel free to ask Archer and you\'ll be guided through your questions smoothly.**')
          .setColor('#42b4ff');
        
        await managementChannel.send({ 
          embeds: [managementEmbed],
          content: '<@&1363484692707282944> <@&1363484778443051241>'
        });
        
        console.log('✅ Sent management announcement');
      } catch (err) {
        console.error('Error sending management announcement:', err);
        return interaction.editReply({ content: 'Failed to send management announcement: ' + err.message });
      }
      
      await interaction.editReply({ content: '✅ Announcements sent successfully to both channels!' });
      
    } catch (err) {
      console.error('Error sending announcements:', err);
      await interaction.editReply({ content: 'Error sending announcements: ' + err.message });
    }
  },
};
