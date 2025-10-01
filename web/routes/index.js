// /web/loginpage/routes/index.js
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const player = await getPlayerByUsername(username);
    if (!player || player.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // ✅ Store player in session
    req.session.player = {
      roblox_id: player.roblox_id,
      username: player.username
    };

    res.json({ success: true, message: 'Logged in successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
