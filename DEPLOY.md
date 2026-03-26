# StyleVault — Complete Deployment Guide
# Follow these steps in order. Takes ~1 hour total.

##############################################
# STEP 1 — Create accounts (all free)
##############################################

Sign up at these 4 websites (all free):
1. github.com
2. vercel.com  (sign in WITH GitHub)
3. supabase.com
4. cloudinary.com
5. render.com  (sign in WITH GitHub)


##############################################
# STEP 2 — Set up Supabase database
##############################################

1. Go to supabase.com → New Project → name it "stylevault"
2. Once created, go to SQL Editor (left sidebar)
3. Paste the entire contents of schema.sql and click RUN
4. Go to Settings → API → copy these two values:
   - Project URL  → this is your SUPABASE_URL
   - service_role key → this is your SUPABASE_SERVICE_KEY


##############################################
# STEP 3 — Set up Cloudinary
##############################################

1. Go to cloudinary.com → Dashboard
2. Copy your:
   - Cloud name  → CLOUDINARY_CLOUD_NAME
   - API Key     → CLOUDINARY_API_KEY
   - API Secret  → CLOUDINARY_API_SECRET


##############################################
# STEP 4 — Push code to GitHub
##############################################

Open Terminal and run these commands one by one:

# Install Git if you don't have it: https://git-scm.com
git --version

# Go to your project folder
cd path/to/stylevault

# Initialize git
git init
git add .
git commit -m "first commit - StyleVault"

# Create repo on GitHub:
# Go to github.com → click "+" → New repository
# Name it: stylevault
# Keep it PUBLIC
# DO NOT add README or .gitignore
# Copy the repo URL shown (looks like https://github.com/yourname/stylevault.git)

# Link and push
git remote add origin https://github.com/YOURNAME/stylevault.git
git branch -M main
git push -u origin main


##############################################
# STEP 5 — Deploy frontend on Vercel
##############################################

1. Go to vercel.com → Add New Project
2. Click "Import" next to your stylevault repo
3. Set Root Directory to: frontend
4. Click Deploy → wait 1 minute
5. Copy your Vercel URL (e.g. stylevault.vercel.app)


##############################################
# STEP 6 — Deploy backend on Render
##############################################

1. Go to render.com → New → Web Service
2. Connect your stylevault GitHub repo
3. Set:
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: npm start
4. Click "Add Environment Variables" and paste all from .env.example:
   SUPABASE_URL = (from step 2)
   SUPABASE_SERVICE_KEY = (from step 2)
   CLOUDINARY_CLOUD_NAME = (from step 3)
   CLOUDINARY_API_KEY = (from step 3)
   CLOUDINARY_API_SECRET = (from step 3)
   JWT_SECRET = stylevault_super_secret_2024
   FRONTEND_URL = https://stylevault.vercel.app
5. Click Deploy → wait 2-3 minutes
6. Copy your Render URL (e.g. stylevault-api.onrender.com)


##############################################
# STEP 7 — Connect frontend to backend
##############################################

Open frontend/src/StyleVault.jsx
Find this line at the top and add:

  const API = "https://stylevault-api.onrender.com/api";

Then push again:
  git add .
  git commit -m "connect frontend to backend"
  git push

Vercel auto-deploys in ~1 minute.


##############################################
# DONE! 🎉
##############################################

Your live link: https://stylevault.vercel.app

Share this with anyone — they can sign up, upload clothes,
get AI outfit suggestions, and their wardrobe saves forever!

For a custom domain (e.g. stylevault.in):
- Buy on GoDaddy or Namecheap (~₹800/year)
- Add it in Vercel → Settings → Domains
