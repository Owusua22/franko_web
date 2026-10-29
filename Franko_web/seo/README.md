# Offline SEO snapshot

The production generator now reads the **existing product and brand APIs by default**. This directory is an explicit offline fallback, not the automatic product source.

The snapshot was imported from the owner-authorized spreadsheet export `products_export_2026-10-23`:

- `data/products-2026-10-23.csv`: complete authorized export, 361 rows.
- `data/products.json`: 356 unique, validated product IDs/names for offline previews.
- `data/product-invalid.json`: one malformed UUID, withheld rather than guessing the intended ID.
- `data/product-conflicts.json`: four records in two conflicting name-only slugs, withheld to avoid choosing an arbitrary UUID or inventing variant names.

The sheet provides names and IDs, not backend status, stock, modification times, or brand data. `status: 1` in this snapshot is an inclusion marker for the approved offline list, not a verified live availability assertion. Live API data controls production display and sitemap generation.

Use the snapshot only for an offline preview:

```bash
SEO_SOURCE=snapshot npm run build
```

Or provide complete JSON exports:

```bash
SEO_PRODUCTS_FILE=/path/products.json SEO_BRANDS_FILE=/path/brands.json npm run build
```

Do not silently correct a product name in the sitemap alone. The storefront and sitemap must use the same shared slug function. Resolve duplicate public names in the backend catalogue with meaningful variant names before publishing.

`seo/previous-index.json` retains public ID-to-slug mappings so renames keep old aliases. The scheduled GitHub Actions workflow caches and uploads this archive. Keep it across releases; do not replace it with empty preview output.
