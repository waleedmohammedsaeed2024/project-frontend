# Quick Setup Guide

## You're seeing a white screen? Here's why and how to fix it:

### The Issue
The app needs to connect to Supabase (your database), but it's not configured yet.

### The Fix (5 minutes)

#### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up (it's free)
2. Click "New Project"
3. Choose a name and password (save the password!)
4. Wait 2 minutes for setup to complete

#### Step 2: Get Your Credentials
1. In your Supabase project, go to **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

#### Step 3: Configure Your App
1. Open the `.env` file in your project root (D:\bydar\project\.env)
2. Replace the placeholder values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_ENABLE_WHATSAPP=false
   ```
3. Save the file

#### Step 4: Setup Database
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link to your project:
   ```bash
   supabase link --project-ref <your-project-id>
   ```
   (Find your project ID in Supabase Dashboard URL or Settings → General)

3. Run the database migration:
   ```bash
   supabase db push
   ```

#### Step 5: Create Admin User
1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **Add User**
3. Enter email and password
4. After creating, click on the user
5. Find **User Metadata** section
6. Click **Edit** and set `app_metadata`:
   ```json
   {
     "role": "admin"
   }
   ```
7. Save

#### Step 6: Start the App
```bash
npm run dev
```

Visit `http://localhost:5173` and login with your admin credentials!

---

## What You'll See Now

Instead of a white screen, you'll see:
- **If Supabase not configured**: A helpful setup page with instructions
- **If configured but not logged in**: Login page
- **If logged in**: Dashboard with full ERP features

---

## Troubleshooting

### "Invalid login credentials"
- Make sure you created the user in Supabase Dashboard
- Check you set the `app_metadata.role` to `"admin"`
- Verify email/password are correct

### "Network error" or "Failed to fetch"
- Check your `VITE_SUPABASE_URL` is correct
- Make sure your Supabase project is running (check dashboard)
- Verify your internet connection

### "Row Level Security" errors
- Make sure you ran `supabase db push` to apply RLS policies
- Verify the user has `app_metadata.role` set

### Still seeing white screen?
1. Open browser DevTools (F12)
2. Check the **Console** tab for errors
3. Look for red error messages
4. Share the error message for help

---

## Next Steps

Once logged in, you can:
1. Create packaging types (Settings → Items & Packaging)
2. Add items to your inventory
3. Create clients, customers, and suppliers
4. Start creating purchase invoices
5. Process sales orders and deliveries

See `README.md` for detailed usage guide.

---

**Need help?** Check the full README.md or open an issue on GitHub.
