require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const wardrobeRoutes = require('./routes/wardrobe');
const outfitRoutes = require('./routes/outfits');
const uploadRoutes = require('./routes/upload');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'StyleVault API running ✨' }));

app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/upload', uploadRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`StyleVault backend running on port ${PORT}`));
