# Create Admin User

## User Credentials
- **Email:** waleed.mohammed2008@gmail.com
- **Password:** invBydar333
- **Role:** admin

## How to Create the User

### Method 1: Using SQL Script (Recommended)

1. **Open Supabase Dashboard:**
   👉 https://supabase.com/dashboard/project/avuedapgjitwnimkrjlp

2. **Go to SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query"

3. **Run the SQL Script:**
   - Open `supabase/create_admin_user.sql` in your project
   - Copy ALL the SQL
   - Paste into SQL Editor
   - Click **"Run"** button

4. **Verify Success:**
   - You should see a table showing the created user
   - Email: waleed.mohammed2008@gmail.com
   - Role: admin
   - Created at: (current timestamp)

### Method 2: Using Dashboard UI

1. **Open Supabase Dashboard:**
   👉 https://supabase.com/dashboard/project/avuedapgjitwnimkrjlp

2. **Go to Authentication → Users**

3. **Click "Add user" → "Create new user"**

4. **Enter Details:**
   - Email: `waleed.mohammed2008@gmail.com`
   - Password: `invBydar333`
   - ✅ Check "Auto Confirm User"

5. **Click "Create user"**

6. **Set Admin Role:**
   - Click on the newly created user
   - Scroll to "User Metadata" section
   - Click "Edit" next to `app_metadata`
   - Replace with:
     ```json
     {
       "role": "admin"
     }
     ```
   - Click "Save"

## Test Login

1. Go to: http://localhost:5175
2. Enter:
   - Email: `waleed.mohammed2008@gmail.com`
   - Password: `invBydar333`
3. Click "Sign In"
4. You're logged in as Admin! 🎉

## What You Can Do as Admin

✅ Full access to all features:
- Partner Management (Clients, Suppliers, Customers)
- Items & Packaging
- Purchase Invoices
- Sales Orders & Deliveries
- Inventory Management
- Returns & Adjustments
- Reports
- User Management

---

**Note:** This user has full admin privileges. Keep the credentials secure!
