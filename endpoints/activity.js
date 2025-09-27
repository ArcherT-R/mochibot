router.post('/log-session', async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;
  if (!roblox_id || !minutes_played || !session_start || !session_end) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    const session = await logPlayerSession(
      roblox_id,
      minutes_played,
      new Date(session_start * 1000),
      new Date(session_end * 1000)
    );
    res.json(session);
  } catch (err) {
    console.error('Failed to log session:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Test route
router.get('/log-session', (req, res) => {
  res.send('✅ /activity/log-session route is mounted and working (GET test)');
});

module.exports = router;
