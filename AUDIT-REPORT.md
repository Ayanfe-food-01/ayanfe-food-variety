# Phase 1 Audit Report — Inventory System Architecture

## Current Architecture

### Database Schema (Prisma/PostgreSQL)

**Product** (`products` table)
- `stockQuantity: Int @default(0)` — product-level stock count
- `unit: String` — descriptive label (e.g., "kg", "bag")
- Relations: `options ProductOption[]`, `stockAdjustments ProductStockAdjustment[]`

**ProductOption** (`product_options` table) — serves as variant/unit/size
- `stockQuantity: Int @default(0)` — option-level stock count
- `label: String` — e.g., "1kg", "5kg", "25kg"
- `price: Decimal` — per-option retail price
- `wholesaleMoq: Int?` — legacy minimum order quantity (deprecated)

**WholesalePackage** (`wholesale_packages` table) — carton/case
- `unitsPerPackage: Int` — how many individual units in one carton
- `price: Decimal` — cost of one complete carton
- `productOptionId: String?` — links to ProductOption (unit/size)

**OrderItem** (`order_items` table)
- `quantity: Int` — for retail: number of units; for wholesale: number of cartons
- `wholesaleUnitsPerPackage: Int?` — snapshotted units per carton
- `productOptionId: String?` — snapshotted option reference

**ProductStockAdjustment** (`product_stock_adjustments` table) — audit ledger
- `quantityDelta: Int` — change amount (+/-)
- `previousQuantity: Int` — stock before change
- `newQuantity: Int` — stock after change
- `reason: String` — free-text reason
- `orderId: String?` — linked order if applicable
- `createdAt: DateTime`

**Order** (`orders` table)
- `stockDeductedAt: DateTime?` — when stock was deducted
- `stockRestoredAt: DateTime?` — when stock was restored (cancellation)

### Existing Inventory Service

**File:** `server/src/modules/inventory/inventory.service.ts` (198 lines)

| Function | Purpose |
|----------|---------|
| `recordStockAdjustment()` | Writes audit entry to `ProductStockAdjustment` |
| `createLowStockNotificationIfNeeded()` | Creates admin LOW_STOCK notification when stock ≤ 5 |
| `deductStock()` | Decrements stock with `FOR UPDATE` row locking |
| `restoreStock()` | Increments stock (used on cancellation) |
| `lockProduct()` | Raw SQL `SELECT ... FOR UPDATE` on products |
| `lockProductOption()` | Raw SQL `SELECT ... FOR UPDATE` on product_options |

**Constant:** `LOW_STOCK_THRESHOLD = 5` (hardcoded, not configurable per product)

### Stock Deduction Flow

1. **Checkout validation** (`checkout.cart.ts`): validates all cart items have sufficient stock
2. **Order creation** (`checkout.service.ts`): creates order within transaction
3. **Stock deduction** (`checkout.completion.ts`): calls `deductStock()` per line item
4. **Quote conversion** (`quote-to-order.create.ts`): same pattern as checkout

### Stock Restoration Flow

1. **Customer cancellation** (`customer-order.service.ts`): checks `stockDeductedAt && !stockRestoredAt`, calls `restoreStock()`
2. **Admin cancellation** (`admin-order.status.service.ts`): same pattern

### Cart Stock Validation

- **Add to cart** (`cart.mutations.service.ts`): validates quantity ≤ stock via `assertProductCanFulfill()`
- **Wholesale cart** (`cart.fulfillment.ts`): validates `floor(stock / unitsPerPackage) >= quantity`
- **Cart serialization** (`cart.serializer.ts`): computes `isAvailable`, `availableQuantity`, `canCheckout`

### Frontend Stock Logic

- **ProductDetails.tsx**: computes `availableStock`, `maxSelectableQuantity`
- **CartContext.tsx**: validates quantities against stock on add/increase
- **ProductCard.tsx**: disables add-to-cart when `!product.isAvailable`
- **ProductOptionSelector.tsx**: shows "Out of stock" for zero-stock options

## Where Stock Is Currently Stored

| Location | Level | Used For |
|----------|-------|----------|
| `products.stockQuantity` | Product | Simple products (no options) |
| `product_options.stockQuantity` | Option/Variant | Products with size variants |

**Stock belongs to the variant (ProductOption) when variants exist, otherwise to the Product directly.**

## How Stock Is Reduced After Orders

1. Cart items sorted by `productId` (deadlock prevention)
2. `deductStock()` called per line with `FOR UPDATE` row lock
3. For option products: decrements `product_options.stock_quantity`
4. For simple products: decrements `products.stock_quantity`
5. Audit entry written with order number as reason
6. Low-stock notification triggered if threshold breached

## Stock Restoration After Cancellation

- **Yes**, stock is restored on both customer and admin cancellation
- Guard: `stockDeductedAt && !stockRestoredAt` prevents double-restore
- `stockRestoredAt` timestamp recorded to prevent re-restoration

## Stock Movement History

- **Yes**, `ProductStockAdjustment` model serves as the audit ledger
- Records: delta, previous/new quantity, reason, linked order, timestamps
- **No movement type enum** — reasons are free-text strings
- **No `createdBy` field** — admin user not tracked for adjustments

## Problems with Current Architecture

### 1. No Dedicated Inventory Model
Stock lives directly on Product/ProductOption as a plain integer field. There is no concept of:
- Available stock vs. on-hand stock
- Reserved stock (for pending orders)
- Per-product low-stock thresholds
- Inventory metadata (reorder points, lead times)

### 2. Hardcoded Low-Stock Threshold
`LOW_STOCK_THRESHOLD = 5` is a constant used across all products. Different products may need different thresholds.

### 3. No Admin Inventory Management UI
The sidebar says "Products & inventory" but there is no dedicated inventory page. Stock can only be changed through:
- Product create/edit form (admin sets initial stock)
- Order deduction/restoration (automatic)
- There is no way to:
  - View a consolidated stock overview
  - Manually adjust stock with a reason
  - View stock movement history per product
  - Set low-stock thresholds per product
  - Search/filter/sort inventory

### 4. Stock Adjustment Reasons Are Unstructured
The `reason` field on `ProductStockAdjustment` is free-text. There is no enum for movement types (e.g., "Stock received", "Damaged goods", "Manual adjustment").

### 5. No Created-By Tracking
Stock adjustments don't record which admin performed the adjustment (except the reason string may mention it).

### 6. Product-Level Stock Can Be Misleading
For products with options, `products.stockQuantity` is computed as `sum(option.stockQuantity)`. This derived value can drift if option stock is modified directly.

## Files/Components Involved

### Server
| File | Role |
|------|------|
| `server/prisma/schema.prisma` | Database schema |
| `server/src/modules/inventory/inventory.service.ts` | Core stock logic |
| `server/src/modules/orders/checkout.cart.ts` | Checkout validation |
| `server/src/modules/orders/checkout.completion.ts` | Stock deduction |
| `server/src/modules/orders/customer-order.service.ts` | Cancellation restore |
| `server/src/modules/admin/admin-order.status.service.ts` | Admin cancel restore |
| `server/src/modules/cart/cart.fulfillment.ts` | Cart stock validation |
| `server/src/modules/cart/cart.mutations.service.ts` | Cart CRUD |
| `server/src/modules/cart/cart.serializer.ts` | Cart response |
| `server/src/modules/products/admin-product.service.ts` | Admin product list |
| `server/src/modules/products/admin-product.write.service.ts` | Product create/update |
| `server/src/modules/products/product.mapper.ts` | Product availability |
| `server/src/modules/products/wholesale.package.ts` | Wholesale availability |
| `server/src/modules/admin/admin.routes.ts` | Admin API routes |
| `server/src/modules/admin/admin.middleware.ts` | Admin auth |
| `server/src/modules/admin/admin.service.ts` | Dashboard stats |

### Client
| File | Role |
|------|------|
| `client/src/App.tsx` | Routing |
| `client/src/components/admin/Sidebar.tsx` | Admin navigation |
| `client/src/pages/Admin/Dashboard.tsx` | Admin dashboard |
| `client/src/pages/Admin/Products.tsx` | Admin products |
| `client/src/pages/Admin/ProductForm.tsx` | Product create/edit |
| `client/src/pages/Admin/ProductView.tsx` | Product detail |
| `client/src/components/admin/ProductsTable.tsx` | Product list table |
| `client/src/components/admin/ProductsFilterPanel.tsx` | Product filters |
| `client/src/services/adminService.ts` | Admin API client |
| `client/src/types/product.ts` | Product types |
| `client/src/context/CartContext.tsx` | Cart state |
| `client/src/pages/ProductDetails.tsx` | Product page |
| `client/src/pages/Cart.tsx` | Cart page |
| `client/src/pages/Checkout.tsx` | Checkout page |

## Database Changes Required

### New Fields on Product
- `lowStockThreshold: Int @default(5)` — configurable per-product threshold

### New Fields on ProductOption
- `lowStockThreshold: Int?` — optional per-option threshold (nullable = use product default)

### New Model: Inventory
Separate inventory tracking per product/option with:
- `stockOnHand: Int` — physical count
- `reservedStock: Int @default(0)` — committed to pending orders
- `availableStock` (computed) — `stockOnHand - reservedStock`

### Enhanced ProductStockAdjustment
- `movementType` enum field (STOCK_RECEIVED, ORDER_DEDUCTION, CANCELLATION_RESTORATION, RETURN, DAMAGED, EXPIRED, MANUAL_ADJUSTMENT, OTHER)
- `performedBy: String?` — admin user ID
- `notes: String?` — optional detailed notes

### New Indexes
- Inventory product/option lookup indexes
- Movement history pagination indexes

## Recommended Product → Variant → Inventory Relationship

```
Product
├── name, description, price, category, images, etc.
├── lowStockThreshold: 5
│
├── ProductOption (1kg)
│   ├── label, price, sortOrder, isActive
│   ├── lowStockThreshold: null (inherits from product)
│   └── Inventory: { stockOnHand: 500, reservedStock: 0 }
│
├── ProductOption (5kg)
│   ├── label, price, sortOrder, isActive
│   ├── lowStockThreshold: 3 (overrides product default)
│   └── Inventory: { stockOnHand: 150, reservedStock: 5 }
│
└── WholesalePackage (Carton of 20 × 5kg)
    └── unitsPerPackage: 20, price: ₦40,000
```

For simple products (no options), Inventory belongs directly to the Product.

## Migration Risks

1. **Backward compatibility**: Existing `stockQuantity` fields must continue to work during migration
2. **Data integrity**: Current stock values must seed the new inventory records
3. **Order system**: `deductStock`/`restoreStock` must be updated atomically
4. **Cart system**: Fulfillment checks must use new inventory model
5. **Concurrent access**: Row-level locking must be preserved
6. **Historical data**: `ProductStockAdjustment` records must not be lost

## Order/Stock Integration Considerations

1. **Retail purchase**: 3 units → deduct 3 from inventory
2. **Wholesale purchase**: 2 cartons × 20 units = 40 units → deduct 40 from inventory
3. **Concurrent purchases**: `FOR UPDATE` locking prevents race conditions
4. **Cancellation restoration**: restore exact base-unit quantity
5. **Reserved stock**: Pending orders should reserve stock until confirmed/cancelled
6. **Validation**: Server-side checks must never rely on client-provided quantities

## Implementation Status (all seven phases)

1. **Audit** — this report; commit `c8c1b6d`.
2. **Inventory data model + services** (`5103860`): `MovementType` enum; `Product.lowStockThreshold` (default 5); `ProductOption.lowStockThreshold`; `ProductStockAdjustment.movementType`/`performedBy`/`notes`; `inventory` server module (types, threshold checks, deduct/restore services with `FOR UPDATE`, adjust, history, validator, controller, routes).
3. **Admin inventory UI** (`4e0295e`): stock overview, movement log, low-stock views with badges, filters, and stock-adjust modal; inventory routes in admin sidebar.
4. **Stock movement history** (`8b0bef9`): per-product movement history page; wholesale deduction fix (cartons × `unitsPerPackage`) also landed here.
5. **Order integration**: `checkout.completion.ts`, `customer-order.service.ts`, `admin-order.status.service.ts` deduct/restore through inventory services using resolved base-units.
6. **Storefront availability**: product cards show low/out-of-stock badges (client `StoreStockBadge`); detail page shows "Only N left" and stock-aware add-to-cart; option selectors/cart already limit to available stock.
7. **Dashboard + report + QA**: dashboard inventory restock cards deep-link into inventory tabs (`3d1eea0`).

**Refactor after review**: inventory consolidated to a single `/admin/inventory` page with `All stock / Low stock / Out of stock / Movements` tabs (query params `?tab=`/`?status=`); separate `low-stock` page and standalone movements route removed; sidebar reorganized into Operations / Catalog / Inventory / Store management / Finance / Communication / System.

**Pending**: migration SQL (`server/prisma/migrations/20260915000000_enhance_inventory_model/migration.sql`) is authored but **not applied** (no `DATABASE_URL` in local env). Smoke tests require a database. Only pre-existing lint issue: `client/src/context/CustomerAuthContext.tsx:84` (unrelated).
