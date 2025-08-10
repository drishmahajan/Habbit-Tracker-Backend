const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const router = express.Router();

// =============================
// 🔐 Register Route
// =============================
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ user: { email: user.email, id: user._id }, token });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============================
// 🔐 Login Route (with Debug Logs)
// =============================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    console.log("🔐 Login attempt:", { email, password }); // Debug

    const user = await User.findOne({ email });
    console.log("📦 User found:", user); // Debug

    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    console.log("🔍 Password match:", match); // Debug

    if (!match)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ user: { email: user.email, id: user._id }, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});


// =============================
// 🔑 Forgot Password
// =============================
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    console.log("📨 Forgot password request for:", email);
    const user = await User.findOne({ email });

    if (!user) {
      console.log("❗ User not found for email:", email);
      return res.status(400).json({ message: 'User not found' });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset.\nClick here to reset your password:\n\n${resetLink}`,
    });

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============================
// 🔁 Reset Password
// =============================
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ message: 'Password is required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Reset token expired' });
    }
    res.status(400).json({ message: 'Invalid reset token' });
  }
});

module.exports = router;