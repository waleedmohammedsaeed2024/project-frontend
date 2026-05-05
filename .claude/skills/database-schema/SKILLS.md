| full_schema_markdown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
 ---
name: DataBase schema
description: all tables in schema with its type and constraints
---

## Table `adjustment`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `reason` | `text` |  |
| `adjustment_date` | `timestamp with time zone` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `adjustment_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `adjustment_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `quantity` | `numeric` |  |
| `cost_price` | `numeric` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |
| `packaging_id` | `uuid` | Nullable |

## Table `delivery_note`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sales_order_id` | `uuid` | Unique |
| `delivery_date` | `timestamp with time zone` |  |
| `notes` | `text` | Nullable |
| `confirmed_at` | `timestamp with time zone` | Nullable |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `inventory`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `operation_type` | `character` |  |
| `reference_id` | `uuid` | Nullable |
| `operation_date` | `timestamp with time zone` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `inventory_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_name` | `character varying` |  |
| `item_english_name` | `character varying` | Nullable |
| `item_image` | `text` | Nullable |
| `avg_cost` | `numeric` |  |
| `quantity` | `numeric` |  |
| `orderpoint` | `numeric` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `inventory_record`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `inventory_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `qty_change` | `numeric` |  |
| `cost_at_operation` | `numeric` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_name` | `text` |  |
| `item_english_name` | `text` |  |
| `packaging` | `uuid` | Nullable |
| `item_code` | `text` | Unique |
| `item_image` | `text` | Nullable |

## Table `item_packaging`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `item_id` | `uuid` | Primary |
| `packaging_id` | `uuid` | Primary |
| `created_at` | `timestamp with time zone` |  |

## Table `item_stock`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_id` | `uuid` |  |
| `packaging_id` | `uuid` | Nullable |
| `quantity` | `numeric` |  |
| `avg_cost` | `numeric` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |

## Table `packaging`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pack_arab` | `text` |  |
| `pack_eng` | `text` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |

## Table `partner`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `partner_name` | `text` |  |
| `partner_type` | `USER-DEFINED` |  |
| `phone_no` | `text` | Nullable |
| `balance` | `double precision` |  |
| `parent_client_id` | `uuid` | Nullable |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `paydate` | `date` |  |
| `payamt` | `numeric` |  |
| `paytype` | `USER-DEFINED` |  |
| `partner_id` | `uuid` |  |
| `paymemo` | `text` | Nullable |
| `created_at` | `timestamp with time zone` | Nullable |
| `updated_at` | `timestamp with time zone` | Nullable |

## Table `purchase_invoice`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `invoice_no` | `character varying` | Unique |
| `invoice_date` | `timestamp with time zone` |  |
| `supplier_id` | `uuid` |  |
| `supplier_inv_no` | `character varying` | Nullable |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `purchase_invoice_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `purchase_invoice_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `packaging_id` | `uuid` | Nullable |
| `quantity` | `numeric` |  |
| `item_cost` | `numeric` |  |
| `repack_factor` | `double precision` |  |
| `description` | `text` | Nullable |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `return`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `return_type` | `character varying` |  |
| `ref_invoice_id` | `uuid` |  |
| `reason` | `text` | Nullable |
| `return_date` | `timestamp with time zone` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `return_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `return_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `quantity` | `numeric` |  |
| `cost_price` | `numeric` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |
| `packaging_id` | `uuid` | Nullable |

## Table `sales_invoice`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sales_order_id` | `uuid` | Unique |
| `invoice_no` | `character varying` | Unique |
| `invoice_date` | `timestamp with time zone` |  |
| `total_amount` | `numeric` |  |
| `is_cancelled` | `boolean` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `sales_order`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_date` | `timestamp with time zone` |  |
| `client_id` | `uuid` |  |
| `customer_id` | `uuid` |  |
| `site` | `text` | Nullable |
| `status` | `text` |  |
| `description` | `text` | Nullable |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable |

## Table `sales_order_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sales_order_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `packaging_id` | `uuid` | Nullable |
| `quantity` | `numeric` |  |
| `item_cost` | `numeric` |  |
| `item_price` | `numeric` |  |
| `created_at` | `timestamp with time zone` |  |
| `updated_at` | `timestamp with time zone` |  |
| `deleted_at` | `timestamp with time zone` | Nullable | |