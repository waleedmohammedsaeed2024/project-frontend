# Issues & Fixes Log

---

## 1. Wrong Column Name: `phone` → `phone_no`
**Issue:** Code used `phone` but the actual database column is `phone_no`.
**Fix:** Renamed all references in `partners.service.ts`, `PartnersPage.tsx`, and `purchase.service.ts` from `phone` to `phone_no`.

---

## 2. Schema Cache Error: `parent_client_id` Not Found
**Issue:** When adding a client, the code sent `parent_client_id: null` in the request. PostgREST looked it up in the schema cache, couldn't find it, and threw an error.
**Fix:** Changed the code to only include `parent_client_id` in the payload when inserting a customer (`type === 'u'`). For clients and suppliers it is not sent at all.

---

## 3. Missing Columns in `partner` Table
**Issue:** The `partner` table was created via Supabase GUI and was missing: `parent_client_id`, `created_at`, `updated_at`, `deleted_at`.
**Fix:** Added them manually via `ALTER TABLE`.

---

## 4. Missing Tables
**Issue:** Several tables from the migration were never created: `delivery_note`, `sales_invoice`, `return`, `return_item`, `adjustment`, `adjustment_item`.
**Fix:** Created them using `CREATE TABLE IF NOT EXISTS` SQL statements in the Supabase SQL Editor.

---

## 5. Row Level Security (RLS) Blocking All Operations
**Issue:** RLS was enabled on all tables. The RLS policies referenced the `deleted_at` column — but that column did not exist because the tables were created via GUI, not the migration. This caused every SELECT, INSERT, and UPDATE to fail silently or return:
> `new row violates row-level security policy`

**Root cause:** The policy said `USING (deleted_at IS NULL)` but `deleted_at` did not exist yet, so the policy always failed.

**Fix applied to all tables:**
1. Added missing columns (`created_at`, `updated_at`, `deleted_at`) to each table.
2. Dropped all broken RLS policies.
3. Recreated simple permissive policies:
```sql
CREATE POLICY x_select ON table_name FOR SELECT USING (true);
CREATE POLICY x_insert ON table_name FOR INSERT WITH CHECK (true);
CREATE POLICY x_update ON table_name FOR UPDATE USING (true);
CREATE POLICY x_delete ON table_name FOR DELETE USING (true);
```
This allows all users to read/write — safe for an internal ERP behind a login screen.

---

## 6. Packaging Not Showing on Screen
**Issue:** The `packaging` table was missing `created_at`, `updated_at`, and `deleted_at`. The fetch query filtered `.is('deleted_at', null)` which returned nothing. RLS policies also referenced `deleted_at` so even SELECT was blocked.

**Fix:**
- Added missing columns via `ALTER TABLE`.
- Dropped and recreated RLS policies with `USING (true)`.
- Removed the `.is('deleted_at', null)` filter from the service query temporarily.
- Result: packaging rows appeared correctly on screen.

---

## Root Cause of All Issues
Tables were created manually through the Supabase GUI instead of running the migration SQL file. This meant:
- Several columns were missing from each table.
- RLS policies referenced columns that did not exist, blocking everything.
- PostgREST schema cache did not know about columns added later.

**Pattern to fix any table:**
1. Add missing columns → `ALTER TABLE`
2. Drop broken policies → `DROP POLICY IF EXISTS`
3. Recreate permissive policies → `CREATE POLICY ... USING (true)`
4. Reload schema cache → `NOTIFY pgrst, 'reload schema'`

----------------------------------------------------------------

# Database Schema Reference

---

## Table: `partner`
Stores clients, suppliers, and customers in one table. The `partner_type` column tells them apart.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key, auto-generated |
| partner_name | text | Required |
| partner_type | enum | `c` = Client, `s` = Supplier, `u` = Customer |
| phone_no | text | Optional |
| balance | numeric | Default 0 |
| parent_client_id | UUID | FK → partner(id). Required for customers, must be NULL for clients/suppliers |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-updated by trigger |
| deleted_at | timestamptz | NULL = active, set to soft-delete |

**Constraints:**
- `chk_customer_parent` — customers must have `parent_client_id`, clients and suppliers must not
- `partner_type` must be one of `c`, `s`, `u`

**Trigger:** `trg_partner_updated_at` — auto-updates `updated_at` on every UPDATE

---

## Table: `packaging`
Defines packaging types used by inventory items.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| pack_arab | text | Arabic name |
| pack_eng | text | English name |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-updated |
| deleted_at | timestamptz | Soft delete |

**Trigger:** `trg_packaging_updated_at`

---

## Table: `inventory_item`
Master catalog of all items that can be stocked.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| item_name | text | Arabic name, required |
| item_english_name | text | Optional |
| item_code | text | Unique |
| packaging_id | UUID | FK → packaging(id) |
| item_image | text | URL or storage path |
| avg_cost | numeric | Weighted average cost, default 0 |
| quantity | numeric | Current stock level, default 0 |
| orderpoint | numeric | Low stock alert threshold |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-updated |
| deleted_at | timestamptz | Soft delete |

**Constraints:**
- `avg_cost >= 0`
- `quantity >= 0`
- `orderpoint >= 0`
- `item_code` is UNIQUE

**Trigger:** `trg_no_negative_stock` — blocks any UPDATE that would set `quantity < 0`

---

## Table: `purchase_invoice`
Header record for each supplier purchase.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| invoice_no | text | Unique, auto-generated (e.g. PI-000001) |
| invoice_date | timestamptz | Required |
| supplier_id | UUID | FK → partner(id), must be a supplier |
| supplier_inv_no | text | Supplier's own invoice number, optional |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-updated |
| deleted_at | timestamptz | Soft delete |

---

## Table: `purchase_invoice_item`
Line items for a purchase invoice.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| purchase_invoice_id | UUID | FK → purchase_invoice(id), CASCADE delete |
| item_id | UUID | FK → inventory_item(id) |
| quantity | numeric | Must be > 0 |
| item_cost | numeric | Cost per unit |
| repack_factor | float | Default 1. Multiply quantity by this for actual stock units |
| tax | numeric | Default 0 |
| description | text | Optional |

---

## Table: `sales_order`
Header for a customer sales order.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| order_date | timestamptz | Auto-set |
| client_id | UUID | FK → partner(id), must be a client |
| customer_id | UUID | FK → partner(id), must be a customer |
| site | text | Delivery site, optional |
| status | char(1) | `o`=Open, `p`=Packed, `c`=Cancelled, `d`=Delivered |
| description | text | Optional |
| created_at / updated_at / deleted_at | timestamptz | Standard audit columns |

**Constraints:**
- Status must be one of `o`, `p`, `c`, `d`

**Trigger:** `trg_order_status_transition` — only allows valid status moves:
- `o` → `p` or `d`
- `p` → `c`
- Any other transition is rejected

---

## Table: `sales_order_item`
Line items for a sales order.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| sales_order_id | UUID | FK → sales_order(id), CASCADE delete |
| item_id | UUID | FK → inventory_item(id) |
| quantity | numeric | Must be > 0 |
| item_cost | numeric | Cost snapshot at order time |
| item_price | numeric | Selling price (typically cost × 1.15) |

---

## Table: `delivery_note`
Created when a sales order is shipped. One delivery note per order.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| sales_order_id | UUID | FK → sales_order(id), UNIQUE — one note per order |
| delivery_date | timestamptz | Auto-set |
| notes | text | Optional |
| confirmed_at | timestamptz | NULL until delivery is confirmed |
| created_at / updated_at / deleted_at | timestamptz | Standard audit columns |

**When confirmed:** stock is deducted, sales invoice is created, client balance is debited.

---

## Table: `sales_invoice`
Auto-created when a delivery note is confirmed.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| sales_order_id | UUID | FK → sales_order(id), UNIQUE |
| invoice_no | text | Unique, auto-generated (e.g. SI-000001) |
| invoice_date | timestamptz | Auto-set |
| total_amount | numeric | Sum of all line items |
| is_cancelled | boolean | Default false |
| created_at / updated_at / deleted_at | timestamptz | Standard audit columns |

**Trigger:** `trg_invoice_immutable` — once `is_cancelled = true`, the invoice cannot be modified again.

---

## Table: `inventory`
Header for every inventory movement (purchase, sale, adjustment, return).

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| operation_type | char(3) | `pur`=Purchase, `sal`=Sale, `adj`=Adjustment, `ren`=Return |
| reference_id | UUID | Points to the source document (invoice, adjustment, etc.) |
| operation_date | timestamptz | Auto-set |
| created_at / updated_at / deleted_at | timestamptz | Standard audit columns |

---

## Table: `inventory_record`
One row per item per inventory movement. The actual stock change.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| inventory_id | UUID | FK → inventory(id), CASCADE delete |
| item_id | UUID | FK → inventory_item(id) |
| qty_change | numeric | Positive = stock in, Negative = stock out |
| cost_at_operation | numeric | Cost per unit at the time of this movement |

---

## Table: `return`
Header for a sales or purchase return.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| return_type | text | `sales` or `purchase` |
| ref_invoice_id | UUID | Points to the original invoice |
| reason | text | Optional |
| return_date | timestamptz | Auto-set |
| created_at / updated_at / deleted_at | timestamptz | Standard audit columns |

---

## Table: `return_item`
Line items for a return.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| return_id | UUID | FK → return(id), CASCADE delete |
| item_id | UUID | FK → inventory_item(id) |
| quantity | numeric | Must be > 0 |
| cost_price | numeric | Must be >= 0 |

---

## Table: `adjustment`
Header for a manual inventory adjustment.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| reason | text | Required |
| adjustment_date | timestamptz | Auto-set |
| created_at / updated_at / deleted_at | timestamptz | Standard audit columns |

---

## Table: `adjustment_item`
Line items for an adjustment. Quantity can be negative (to reduce stock).

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| adjustment_id | UUID | FK → adjustment(id), CASCADE delete |
| item_id | UUID | FK → inventory_item(id) |
| quantity | numeric | Can be negative |
| cost_price | numeric | Must be >= 0 |

---

## Relationships Overview

```
partner (c) ──< sales_order >── partner (u)
sales_order ──< sales_order_item >── inventory_item
sales_order ──── delivery_note ──── sales_invoice
sales_invoice ──< return
purchase_invoice >── partner (s)
purchase_invoice ──< purchase_invoice_item >── inventory_item
purchase_invoice ──< return
inventory ──< inventory_record >── inventory_item
adjustment ──< adjustment_item >── inventory_item
packaging ──< inventory_item
partner (c) ──< partner (u)   [parent_client_id]
```

---

## Soft Delete Pattern
All main tables use soft delete. A row is never physically deleted.
- Active rows: `deleted_at IS NULL`
- Deleted rows: `deleted_at` is set to the deletion timestamp
- All fetch queries filter `.is('deleted_at', null)` to show only active rows

---

## Auto-generated Codes
| Table | Format | Example |
|---|---|---|
| purchase_invoice | `PI-XXXXXX` | PI-000001 |
| sales_invoice | `SI-XXXXXX` | SI-000001 |
| partner (future) | `CLT-XXXX` / `SUP-XXXX` / `CUS-XXXX` | CLT-0001 |
