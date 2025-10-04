const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scheduleannouncement')
    .setDescription('Schedule announcement messages')
    .addStringOption(option =>
      option.setName('datetime')
        .setDescription('Date and time in AEST (e.g., "2025-10-05 14:30")')
        .setRequired(true)),
  
  async execute(interaction) {
    const datetimeStr = interaction.options.getString('datetime');
    
    try {
      // Parse AEST datetime
      const aestOffset = 10 * 60; // AEST is UTC+10
      const [datePart, timePart] = datetimeStr.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Create date in AEST
      const scheduledDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
      scheduledDate.setMinutes(scheduledDate.getMinutes() - aestOffset);
      
      const now = new Date();
      const delay = scheduledDate.getTime() - now.getTime();
      
      if (delay < 0) {
        return interaction.reply({ content: 'That time is in the past!', ephemeral: true });
      }
      
      await interaction.reply({ 
        content: `Announcements scheduled for ${datetimeStr} AEST (in ${Math.round(delay / 1000 / 60)} minutes)`, 
        ephemeral: true 
      });
      
      setTimeout(async () => {
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
        }
      }, delay);
      
    } catch (err) {
      console.error('Error scheduling announcement:', err);
      await interaction.reply({ 
        content: 'Invalid datetime format. Use: YYYY-MM-DD HH:MM (e.g., "2025-10-05 14:30")', 
        ephemeral: true 
      });
    }
  },
};
