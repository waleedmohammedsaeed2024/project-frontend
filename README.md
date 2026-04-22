# Inventory-Centric ERP System

A complete inventory-centric ERP system for managing purchasing, inventory tracking, sales, and financial operations. Built with React, TypeScript, Supabase, and shadcn UI.

## 🎯 Features

### Core Modules
- **Partner Management**: Clients, suppliers, and customers with hierarchical relationships
- **Items & Packaging**: Catalog with packaging types and stock tracking
- **Purchase Invoices**: Supplier purchases with repackaging support
- **Sales Orders**: Full order lifecycle (Ordered → Shipped → Completed → Cancelled)
- **Delivery Notes**: Create and confirm deliveries with auto-invoice generation
- **Inventory Tracking**: Real-time stock with average cost calculation
- **Returns**: Sales and purchase returns with inventory restoration
- **Adjustments**: Manual corrections with mandatory reason
- **Sales Invoices**: Auto-generated with cancellation/reversal support
- **Reports**: Client/supplier statements, inventory, sales/purchase summaries

### Business Logic
- **Average Cost**: `(old_qty × old_cost + new_qty × new_cost) / total_qty`
- **Pricing**: Fixed 15% markup (`item_price = item_cost × 1.15`)
- **Repackaging**: Unit conversion during purchase (e.g., 1 box → 5 kg)
- **Order Status**: One-way transitions only
- **Constraints**: Prevents negative stock and overselling
- **Soft Delete**: Uses `deleted_at` instead of hard delete
- **Audit Logging**: Tracks all financial/inventory changes

### Security
- **RBAC**: Admin, Purchase Manager, Salesman, Manager roles
- **RLS**: Supabase Row Level Security policies
- **JWT Auth**: Secure session management

### Notifications
- **WhatsApp**: Auto-notify suppliers on purchase invoice via Twilio
- **Non-blocking**: Failures don't block operations
- **Logging**: All attempts tracked in `notification_log`

## 🚀 Tech Stack

- React 19 + TypeScript + Vite
- shadcn UI + Tailwind CSS 4.2
- Supabase (PostgreSQL + Auth + Edge Functions)
- Recharts, Lucide React, React Router DOM 7

## 📦 Setup

```bash
# Install
npm install

# Configure .env
cp .env.example .env
# Edit: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# Setup Supabase
supabase link --project-ref <your-project-id>
supabase db push

# Deploy Edge Function (optional)
supabase functions deploy send-whatsapp

# Run
npm run dev
```

Visit `http://localhost:5173`

## 📊 Schema

16 tables: partner, packaging, inventory_item, purchase_invoice, sales_order, delivery_note, sales_invoice, inventory, return, adjustment, audit_log, notification_log

See `supabase/migrations/001_initial_schema.sql`

## 🔧 Configuration

- **Pricing**: Edit `src/lib/utils.ts → calcItemPrice()`
- **WhatsApp**: Edit `src/lib/whatsapp.ts → formatPurchaseInvoiceMessage()`

## 📖 Usage

1. Create packaging, items, partners
2. Purchase invoice → auto-updates inventory
3. Sales order → validates stock
4. Delivery → generates invoice, updates balances
5. View reports

## 🐛 Troubleshooting

- **Login fails**: Check user `app_metadata.role`
- **WhatsApp**: Verify `VITE_ENABLE_WHATSAPP=true` and Twilio secrets
- **Negative stock**: Check triggers/validation

---

**Built with ❤️ using React, TypeScript, and Supabase**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
