---
name: DataBase schema
description: all tables in schama with it's type and constraints
---


## Table `adjustment`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `reason` | `text` |  |
| `adjustment_date` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `adjustment_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `adjustment_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `quantity` | `numeric` |  |
| `cost_price` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `delivery_note`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sales_order_id` | `uuid` |  Unique |
| `delivery_date` | `timestamptz` |  |
| `notes` | `text` |  Nullable |
| `confirmed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `inventory`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `operation_type` | `bpchar` |  |
| `reference_id` | `uuid` |  Nullable |
| `operation_date` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `inventory_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_name` | `varchar` |  |
| `item_english_name` | `varchar` |  Nullable |
| `item_image` | `text` |  Nullable |
| `avg_cost` | `numeric` |  |
| `quantity` | `numeric` |  |
| `orderpoint` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `inventory_record`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `inventory_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `qty_change` | `numeric` |  |
| `cost_at_operation` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_name` | `text` |  |
| `item_english_name` | `text` |  |
| `packaging` | `uuid` |  Nullable |
| `item_code` | `text` |  Unique |
| `item_image` | `text` |  Nullable |

## Table `item_packaging`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `item_id` | `uuid` | Primary |
| `packaging_id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |

## Table `item_stock`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `item_id` | `uuid` |  |
| `packaging_id` | `uuid` |  Nullable |
| `quantity` | `numeric` |  |
| `avg_cost` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `packaging`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `pack_arab` | `text` |  |
| `pack_eng` | `text` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `partner`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `partner_name` | `text` |  |
| `partner_type` | `partner_type_enum` |  |
| `phone_no` | `text` |  Nullable |
| `balance` | `float8` |  |
| `parent_client_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `purchase_invoice`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `invoice_no` | `varchar` |  Unique |
| `invoice_date` | `timestamptz` |  |
| `supplier_id` | `uuid` |  |
| `supplier_inv_no` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `purchase_invoice_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `purchase_invoice_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `packaging_id` | `uuid` |  Nullable |
| `quantity` | `numeric` |  |
| `item_cost` | `numeric` |  |
| `repack_factor` | `float8` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `return`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `return_type` | `varchar` |  |
| `ref_invoice_id` | `uuid` |  |
| `reason` | `text` |  Nullable |
| `return_date` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `return_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `return_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `quantity` | `numeric` |  |
| `cost_price` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `sales_invoice`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sales_order_id` | `uuid` |  Unique |
| `invoice_no` | `varchar` |  Unique |
| `invoice_date` | `timestamptz` |  |
| `total_amount` | `numeric` |  |
| `is_cancelled` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `sales_order`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_date` | `timestamptz` |  |
| `client_id` | `uuid` |  |
| `customer_id` | `uuid` |  |
| `site` | `text` |  Nullable |
| `status` | `text` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `sales_order_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sales_order_id` | `uuid` |  |
| `item_id` | `uuid` |  |
| `packaging_id` | `uuid` |  Nullable |
| `quantity` | `numeric` |  |
| `item_cost` | `numeric` |  |
| `item_price` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

