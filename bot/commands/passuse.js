const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('passuse')
        .setDescription('Use a free pass to restore the count after a fail.'),

    async execute(interaction) {
        try {
            const client = interaction.client;
            const game = client.botData?.countingGame;

            // ── Game not set up ───────────────────────────────────────────────
            if (!game?.channelId) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription('❌ The counting game is not set up yet.')
                    ],
                    ephemeral: true
                });
            }

            const userId = interaction.user.id;
            game.freePasses     = game.freePasses     ?? {};
            game.lastFailNumber = game.lastFailNumber ?? null;

            const passes = game.freePasses[userId] ?? 0;

            // ── No passes ─────────────────────────────────────────────────────
            if (passes <= 0) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ No Free Passes!')
                        .setDescription(
                            `You don't have any free passes.\n\n` +
                            `Count **${game.currentNumber === 0
                                ? 'back up from 1'
                                : `to ${game.currentNumber}`}** ` +
                            `to earn one — every **100 correct numbers** earns you a pass!`
                        )
                    ],
                    ephemeral: true
                });
            }

            // ── No fail to restore ────────────────────────────────────────────
            if (game.lastFailNumber === null || game.lastFailNumber === undefined) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription('❌ There\'s no recent fail to restore. Save your pass for when you need it!')
                    ],
                    ephemeral: true
                });
            }

            // ── Use the pass ──────────────────────────────────────────────────
            const restoredTo = game.lastFailNumber;

            game.freePasses[userId]  = passes - 1;
            game.currentNumber       = restoredTo;
            game.lastUserId          = null;      // allow anyone to continue
            game.lastFailNumber      = null;      // consume the restore point

            client.saveBotData().catch(err => console.error("Save error:", err));

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0x00C853)
                    .setTitle('🛡️ Free Pass Used!')
                    .setDescription(
                        `<@${userId}> used a free pass!\n\n` +
                        `The count has been **restored to ${restoredTo}**.\n` +
                        `The next number is **${restoredTo + 1}**.\n\n` +
                        `*Passes remaining: **${passes - 1}***`
                    )
                ],
                allowedMentions: { users: [userId] }
            });

        } catch (error) {
            console.error('passuse command error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
            }
        }
    }
};
