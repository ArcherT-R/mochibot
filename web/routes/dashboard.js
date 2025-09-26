// web/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../../endpoints/database');

// Dashboard home
router.get('/', async (req, res) => {
  try {
    // Get top 3 active players (based on total_activity)
    const { data: topPlayers, error: topErr } = await supabase
      .from('players')
      .select('*')
      .order('total_activity', { ascending: false })
      .limit(3);

    if (topErr) throw topErr;

    // Get next 3 scheduled shifts (mock for now, we’ll wire later)
    const upcomingShifts = [
      { host: 'ArcherTheProFYT', time: 'Tomorrow 5PM' },
      { host: 'MochiBarStaff', time: 'Saturday 3PM' },
      { host: 'AnotherHost', time: 'Sunday 7PM' }
    ];

    res.render('dashboard', {
      topPlayers,
      upcomingShifts
    });
  } catch (err) {
    console.error('❌ Error loading dashboard:', err.message);
    res.status(500).send('Error loading dashboard');
  }
});

// Search players
router.get('/search', async (req, res) => {
  const query = req.query.username;
  if (!query) return res.json([]);

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(5);

  if (error) {
    console.error('❌ Search error:', error.message);
    return res.status(500).json([]);
  }

  res.json(data);
});

// Player profile page
router.get('/player/:username', async (req, res) => {
  const username = req.params.username;

  const { data: player, error } = await supabase
    .from('players')
    .s
