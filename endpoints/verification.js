// routes/verification.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../database'); // export supabase from database.js

// Generate code
router.post('/generate-verification-code', async (req, res) => {
    const { robloxUsername } = req.body;
    if (!robloxUsername) return res.status(400).json({ error: 'Missing robloxUsername' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const { error } = await supabase
        .from('verification_codes')
        .upsert({ username: robloxUsername, code, created_at: new Date().toISOString() }, { onConflict: 'username' });

    if (error) return res.status(500).json({ error: 'Failed to generate code' });

    res.json({ success: true, code });
});

// Verify code
router.post('/verify-code', async (req, res) => {
    const { robloxUsername, code } = req.body;
    if (!robloxUsername || !code) return res.status(400).json({ error: 'Missing fields' });

    const { data: codeRow, error: codeErr } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('username', robloxUsername)
        .eq('code', code)
        .single();

    if (codeErr || !codeRow) return res.status(401).json({ error: 'Invalid or expired code' });

    await supabase.from('verification_codes').delete().eq('username', robloxUsername);

    const { data: player, error: playerErr } = await supabase
        .from('players')
        .select('username, password')
        .eq('username', robloxUsername)
        .single();

    if (playerErr || !player) return res.status(404).json({ error: 'User not found' });

    res.json({ username: player.username, password: player.password });
});

module.exports = router;
