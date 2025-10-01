// web/loginpage/routes.js
const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("../../endpoints/database"); // your Supabase database functions

const router = express.Router();

// -------------------- Serve HTML pages --------------------
// Make sure your HTML files are in web/loginpage/
router.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// If you have a dashboard redirect after login
router.get("/", (req, res) => {
  res.redirect("/loginpage/login.html");
});

// -------------------- Login POST --------------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Fetch player from Supabase
    const player = await db.getPlayerByUsername(username);
    if (!player || !player.password_hash) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // Compare password
    const match = await bcrypt.compare(password, player.password_hash);
    if (!match) return res.status(400).json({ error: "Invalid username or password" });

    // Successful login
    res.json({ success: true, message: "Logged in successfully", player });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
