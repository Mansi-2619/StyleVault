const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

// Sign up
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields required' });

  const { data: existing } = await supabase
    .from('users').select('id').eq('email', email).single();
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('users').insert({ name, email, password: hashed }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  const token = jwt.sign({ id: data.id, email: data.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: data.id, name: data.name, email: data.email } });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: user } = await supabase
    .from('users').select('*').eq('email', email).single();
  if (!user) return res.status(400).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

module.exports = router;
