// Catalog domain types + formatting.
//
// Phase 4: the catalog DATA (products/collections/categories) lives in
// Supabase — see the Phase 4 seed migration and fetch it via '@/lib/catalog'
// (useCatalog). These types describe the shapes the UI consumes after the
// DB -> UI mapping; slugs and category names are data-driven (Record<string,
// Collection>, string categories), not closed unions.

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  collection: string;
  image: string;
  featured?: boolean;
  isNew?: boolean;
  bestSeller?: boolean;
  details: string;
  /**
   * Units left when stock is tracked (an inventory row exists); null means
   * untracked — always sellable. 0 is sold out. Mirrors the server's
   * `stock_available` (see @workspace/pricing stockState).
   */
  stock: number | null;
};

export type Collection = {
  name: string;
  short: string;
  description: string;
  background: string;
  number: string;
};

export const money = (value: number) => `${value.toLocaleString('fr-DZ')} DA`;
