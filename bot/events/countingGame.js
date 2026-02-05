module.exports = (client) => {
    const lastResponseSent = { messageId: null, timestamp: 0 };

    client.on('messageCreate', async message => {
        if (message.author.bot) return;
        
        if (!client.botData?.countingGame) return;
        
        const game = client.botData.countingGame;
        if (!game.channelId || message.channel.id !== game.channelId) return;

        const now = Date.now();
        
        // Prevent duplicates
        if (lastResponseSent.messageId === message.id && (now - lastResponseSent.timestamp) < 2000) {
            console.log('🚫 Blocked duplicate for:', message.id);
            return;
        }

        const expectedNumber = game.currentNumber + 1;
        const userNumber = parseInt(message.content.trim());
        
        const handleFailure = async (reason) => {
            lastResponseSent.messageId = message.id;
            lastResponseSent.timestamp = now;
            
            await message.react('❌').catch(() => {});
            
            const failedNumber = expectedNumber;
            game.currentNumber = 0;
            game.lastUserId = null;
            
            client.saveBotData().catch(err => console.error("Save error:", err));

            await message.channel.send({
                content: `🛑 **FAIL!** ${message.author} ${reason}. The next number was **${failedNumber}**. The count has been reset to **0**. The next number must be **1**.`,
                allowedMentions: { users: [message.author.id] }
            });
        };

        if (isNaN(userNumber) || userNumber !== expectedNumber) {
            return handleFailure("ruined the count with an incorrect number or format");
        }

        if (message.author.id === game.lastUserId) {
            return handleFailure("tried to count twice in a row");
        }
        
        lastResponseSent.messageId = message.id;
        lastResponseSent.timestamp = now;
        
        game.currentNumber = userNumber;
        game.lastUserId = message.author.id;
        
        client.saveBotData().catch(err => console.error("Save error:", err));
        
        await message.react('✅').catch(() => {});
    });
};
