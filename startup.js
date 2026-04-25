const express = require('express');
const path = require('path');
const session = require('express-session');
const { startBot } = require('./bot/client');
const { checkAuditLogs } = require('./bot/auditMonitor');
const db = require('./endpoints/database');

async function main() {
    // ----------------------------------------------------------------
    // 1. ENVIRONMENT & SECRETS
    // ----------------------------------------------------------------
    require('dotenv').config({ path: '/etc/secrets/.env' });
    if (!process.env.DISCORD_TOKEN) {
        require('dotenv').config({ path: path.join(__dirname, '.env') });
    }

    console.log('─────────────────────────────────────');
    console.log('🔍 Environment Check:');
    console.log('   DISCORD_TOKEN :', process.env.DISCORD_TOKEN ? '✅ Loaded' : '❌ MISSING');
    console.log('   SUPABASE_KEY  :', process.env.SUPABASE_KEY ? '✅ Loaded' : '❌ MISSING');
    console.log('   COOKIE        :', process.env.COOKIE ? '✅ Loaded' : '❌ MISSING');
    console.log('─────────────────────────────────────');

    // ----------------------------------------------------------------
    // 2. EXPRESS BOILERPLATE
    // ----------------------------------------------------------------
    const app = express();

    app.use(session({
        secret: process.env.SESSION_SECRET || 'supersecretkey',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 24 * 60 * 60 * 1000 }
    }));

    app.set('views', path.join(__dirname, 'web/views'));
    app.set('view engine', 'ejs');
    app.use(express.static(path.join(__dirname, 'web/public')));
    
    // CRITICAL: Ensure these come BEFORE routes
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // ----------------------------------------------------------------
    // 3. START SERVER IMMEDIATELY (Fixes 503 Errors)
    // ----------------------------------------------------------------
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Web Server reported LIVE on port ${PORT}`);
        console.log(`🔗 Ranking URL: /ranking/promote`);
    });

    // ----------------------------------------------------------------
    // 4. ROUTES
    // ----------------------------------------------------------------
    app.use('/maintenance', require('./endpoints/maintenance'));
    app.use('/activity', require('./endpoints/activity'));
    app.use('/shifts', require('./endpoints/shifts'));
    app.use('/dashboard', require('./web/routes/dashboard'));
    app.use('/loginpage', require('./web/loginpage/routes'));
    app.use('/settings', require('./endpoints/settings'));
    app.use('/verification', require('./endpoints/verification'));
    app.use('/ranking', require('./endpoints/ranking')); // Your Roblox Logic

    app.get('/', (req, res) => res.redirect('/dashboard'));
    
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'healthy', 
            db: global.dbConnected ? 'online' : 'connecting',
            uptime: process.uptime() 
        });
    });

    // ----------------------------------------------------------------
    // 5. ASYNC BACKGROUND SERVICES (Non-blocking)
    // ----------------------------------------------------------------
    
    // Database Connection Task
    (async () => {
        let dbAwake = false;
        let dbRetries = 5;
        while (!dbAwake && dbRetries > 0) {
            try {
                console.log(`📡 Testing Supabase connection... (${6 - dbRetries}/5)`);
                await db.getPlayerByRobloxId(1);
                dbAwake = true;
                global.dbConnected = true;
                console.log('✅ Database is Awake');
            } catch (err) {
                dbRetries--;
                if (dbRetries === 0) console.error('❌ DB connection failed, but server remains live.');
                else {
                    console.log('⏳ Supabase warming up... waiting 10s...');
                    await new Promise(res => setTimeout(res, 10000));
                }
            }
        }
    })();

    // Discord Bot Task
    async function connectBot(attempt = 1) {
        try {
            console.log(`🤖 Discord login attempt #${attempt}...`);
            const botClient = await startBot();
            
            // Inject dynamic routes
            app.use('/sessions', require('./endpoints/sessions')(botClient));
            app.use('/sotw-role', require('./endpoints/sotw-role')(botClient));
            
            global.discordClient = botClient;
            console.log('✅ Discord bot successfully connected');
            
            startBackgroundMonitors(botClient);
        } catch (err) {
            console.error(`❌ Bot failed (Attempt ${attempt}):`, err.message);
            const delay = attempt * 30000;
            await new Promise(r => setTimeout(r, delay));
            return connectBot(attempt + 1);
        }
    }

    function startBackgroundMonitors(client) {
        console.log('🚀 Starting Background Monitors...');
        
        // DM Notification Polling
        setInterval(async () => {
            if (!client?.isReady()) return;
            try {
                const pending = await db.getPendingNotifications();
                for (const row of pending) {
                    const user = await client.users.fetch(row.discord_id).catch(() => null);
                    if (user) {
                        await user.send({
                            embeds: [{
                                title: '✅ Verification Complete',
                                description: `User **${row.claimed_by_username}** claimed your code.`,
                                color: 0x3498db,
                                fields: [
                                    { name: '🔑 Password', value: `\`${row.one_time_token}\`` },
                                    { name: '🌐 Login', value: '[Mochi Bar](https://mochibar.onrender.com/loginpage/login)' }
                                ]
                            }]
                        }).catch(() => {});
                        await db.markRequestNotified(row.id);
                    }
                }
            } catch (err) { console.error('Poll error:', err.message); }
        }, 60000);

        // Audit Log Monitoring
        setInterval(() => {
            if (client?.isReady()) checkAuditLogs(client, '35807738');
        }, 120000);
    }

    connectBot();

    // ----------------------------------------------------------------
    // 6. GRACEFUL SHUTDOWN
    // ----------------------------------------------------------------
    const shutdown = () => {
        console.log('🛑 Shutting down...');
        if (global.discordClient) global.discordClient.destroy();
        server.close(() => {
            console.log('✅ Server closed.');
            process.exit(0);
        });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main().catch(err => {
    console.error('❌ Fatal startup error:', err);
    setTimeout(() => process.exit(1), 5000);
});
