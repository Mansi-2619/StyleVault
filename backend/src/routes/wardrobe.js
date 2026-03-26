const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../supabase');

// Get all wardrobe items for user
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Add item
router.post('/', auth, async (req, res) => {
  const { name, color, cat, style, tags, emoji, image_url } = req.body;
  if (!name || !cat) return res.status(400).json({ error: 'Name and category required' });

  const { data, error } = await supabase
    .from('wardrobe_items')
    .insert({ user_id: req.user.id, name, color, cat, style, tags, emoji, image_url })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete item
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('wardrobe_items')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
