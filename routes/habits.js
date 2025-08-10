const express = require('express');
const Habit = require('../models/Habit');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const habit = await Habit.create({ user: req.user.id, name: req.body.name });
    res.json(habit);
  } catch {
    res.status(400).json({ message: 'Failed to create habit' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user.id });
    res.json(habits);
  } catch {
    res.status(400).json({ message: 'Failed to get habits' });
  }
});

module.exports = router;
