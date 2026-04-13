const { EmbedBuilder } = require('discord.js');
const FREE_PASS_MILESTONE = 50;

module.exports = (client) => {
    const lastResponseSent = { messageId: null, timestamp: 0 };

    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;
        
        // Look for the specific game for THIS server
        const guildId = message.guild.id;
        const game = client.botData?.countingGames?.[guildId];

        if (!game || !game.channelId || message.channel.id !== game.channelId) return;

        const now = Date.now();
        if (lastResponseSent.messageId === message.id && (now - lastResponseSent.timestamp) < 2000) return;

        const expectedNumber = game.currentNumber + 1;
        const userNumber = parseInt(message.content.trim());
        const userId = message.author.id;

        const handleFailure = async () => {
            lastResponseSent.messageId = message.id;
            lastResponseSent.timestamp = now;
            await message.react('❌').catch(() => {});

            const failedAt = expectedNumber;
            game.currentNumber = 0;
            game.lastUserId = null;
            game.milestoneCount[userId] = 0;

            if (client.saveBotData) client.saveBotData();

            const failEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Fail!')
                .setDescription(`Next number was **${failedAt}**! <@${userId}> messed up.`);

            await message.channel.send({ embeds: [failEmbed] });
        };

        // Logic check
        if (isNaN(userNumber) || userNumber !== expectedNumber || userId === game.lastUserId) {
            return handleFailure();
        }

        // Correct count
        lastResponseSent.messageId = message.id;
        lastResponseSent.timestamp = now;
        game.currentNumber = userNumber;
        game.lastUserId = userId;

        if (userNumber > (game.highestNumber || 0)) game.highestNumber = userNumber;
        
        game.topPlayers[userId] = (game.topPlayers[userId] ?? 0) + 1;
        game.milestoneCount[userId] = (game.milestoneCount[userId] ?? 0) + 1;

        if (game.milestoneCount[userId] % FREE_PASS_MILESTONE === 0) {
            game.freePasses[userId] = (game.freePasses[userId] ?? 0) + 1;
            await message.channel.send({ content: `🎉 <@${userId}> earned a free pass!` });
        }

        await message.react('✅').catch(() => {});
        if (client.saveBotData) client.saveBotData();
    });
};
