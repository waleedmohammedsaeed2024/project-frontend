# 🚀 Quick Database Setup

Your Supabase credentials are **already configured** in `.env`! Now you just need to run the database migration.

## ✅ What's Done
- ✅ `.env` file updated with your Supabase credentials
- ✅ Dev server running at `http://localhost:5175`
- ✅ Migration file ready at `supabase/migrations/001_initial_schema.sql`

## 📋 Run the Migration (Choose ONE method)

### Method 1: Supabase Dashboard (Easiest - 2 minutes)

1. **Open Supabase Dashboard:**
   👉 https://supabase.com/dashboard/project/avuedapgjitwnimkrjlp

2. **Go to SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New query"

3. **Copy & Run the Migration:**
   - Open `supabase/migrations/001_initial_schema.sql` in your project
   - Copy ALL the SQL (Ctrl+A, Ctrl+C)
   - Paste it into the SQL Editor
   - Click "Run" button (or press Ctrl+Enter)

4. **Wait for Success:**
   - You should see "Success. No rows returned" message
   - This means all tables, triggers, and policies are created!

### Method 2: Using Supabase CLI (If you prefer terminal)

```bash
# 1. Login to Supabase
npx supabase login

# 2. Link to your project
npx supabase link --project-ref avuedapgjitwnimkrjlp

# 3. Push the migration
npx supabase db push
```

## 🎉 After Migration is Complete

### Create Your Admin User

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - Email: `admin@example.com` (or your email)
   - Password: Choose a strong password
   - ✅ Check "Auto Confirm User"
4. Click **"Create user"**

5. **Set Admin Role** (IMPORTANT!):
   - Click on the user you just created
   - Scroll to **"User Metadata"** section
   - Click **"Edit"** next to `app_metadata`
   - Replace the content with:
     ```json
     {
       "role": "admin"
     }
     ```
   - Click **"Save"**

### Test Your App

1. Go to: `http://localhost:5175`
2. You should see the **Login Page** (not setup page anymore!)
3. Login with your admin credentials
4. You're in! 🎊

## 🧪 What You Get

After login, you'll have access to:
- **Dashboard**: Stats, charts, recent operations
- **Partners**: Manage clients, suppliers, customers
- **Items & Packaging**: Product catalog
- **Purchase Invoices**: Record purchases, auto-update inventory
- **Sales Orders**: Create orders, track lifecycle
- **Delivery Notes**: Confirm deliveries, auto-generate invoices
- **Inventory**: Real-time stock levels with alerts
- **Returns**: Process sales/purchase returns
- **Adjustments**: Manual stock corrections
- **Reports**: Client/supplier statements, summaries

## 🐛 Troubleshooting

### "Permission denied" or "RLS policy" errors
- Make sure you ran the **entire** migration SQL
- Verify the user has `app_metadata.role` = `"admin"`
- Check browser console (F12) for detailed errors

### "Table already exists" errors
- This means migration partially ran
- You can either:
  - Drop all tables and re-run
  - Or just run the parts that failed

### Still seeing Setup Page?
- Clear browser cache (Ctrl+Shift+R)
- Check `.env` file has the correct URL (no `placeholder`)
- Restart dev server: `npm run dev`

## 📚 Next Steps

Once logged in:
1. Create packaging types (Box, Kg, Piece, etc.)
2. Add items to inventory
3. Create clients, customers, and suppliers
4. Start processing purchase invoices
5. Create sales orders and deliveries

See `README.md` for detailed usage guide!

---

**Need help?** Open an issue or check the console for error messages.
