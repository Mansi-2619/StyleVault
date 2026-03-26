const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../supabase');

// Get saved outfits
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('saved_outfits')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Save an outfit
router.post('/', auth, async (req, res) => {
  const { pieces, note, occasion } = req.body;
  const { data, error } = await supabase
    .from('saved_outfits')
    .insert({ user_id: req.user.id, pieces, note, occasion })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete outfit
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('saved_outfits')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
