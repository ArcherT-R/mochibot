// /web/loginpage/routes/index.js
const express = require('express');
const router = express.Router();
const { getPlayerByUsername, verifyPlayerPassword } = require('../../../endpoints/database');

// GET /loginpage/login - Render login page
router.get('/login', async (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session?.player) {
    return res.redirect('/dashboard');
  }
  
  res.render('login');
});

// POST /loginpage/login - Handle login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password required' 
      });
    }
    
    // Get player from database
    const player = await getPlayerByUsername(username);
    
    if (!player) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }
    
    // Verify password - try both methods for compatibility
    let isValid = false;
    
    // Try bcrypt verification first (more secure)
    try {
      const verification = await verifyPlayerPassword(username, password);
      isValid = verification.success;
    } catch (err) {
      console.log('Bcrypt verification failed, trying plain text');
    }
    
    // Fallback to plain text comparison if bcrypt fails
    if (!isValid && player.password === password) {
      isValid = true;
    }
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }
    
    // Store complete player info in session
    req.session.player = {
      roblox_id: player.roblox_id,
      username: player.username,
      group_rank: player.group_rank,
      avatar_url: player.avatar_url,
      weekly_minutes: player.weekly_minutes
    };
    
    // Ensure session is saved before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          error: 'Failed to save session' 
        });
      }
      
      console.log(`✅ User logged in: ${player.username} (${player.group_rank})`);
      
      // Simple redirect - let middleware handle maintenance checking
      res.json({ 
        success: true, 
        message: 'Logged in successfully',
        redirect: '/dashboard'
      });
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// POST /loginpage/logout - Handle logout
router.post('/logout', (req, res) => {
  const username = req.session?.player?.username || 'Unknown';
  
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        error: 'Failed to logout' 
      });
    }
    
    console.log(`👋 User logged out: ${username}`);
    
    res.clearCookie('connect.sid');
    res.json({ 
      success: true, 
      message: 'Logged out successfully',
      redirect: '/loginpage/login'
    });
  });
});

module.exports = router;
