import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Collection, Product } from '@/data/products';

// Raw Supabase row shapes (snake_case columns mirror the Phase 2 schema).
// The workspace has no generated Database types yet, so rows are cast once
// here, at the single boundary between DB and UI.
type CategoryRow = {
  slug: string;
  name: string;
  sort_order: number;
};

type CollectionRow = {
  slug: string;
  name: string;
  short_description: string;
  description: string;
  background_css: string;
  display_number: string;
  is_published: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  description: string;
  details: string;
  price_da: number;
  category_slug: string;
  collection_slug: string;
  image_path: string | null;
  status: string;
  is_featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  sort_order: number;
};

export type Catalog = {
  products: Product[];
  collections: Record<string, Collection>;
  categories: string[];
};

const EMPTY_CATALOG: Catalog = { products: [], collections: {}, categories: [] };

async function fetchCatalog(): Promise<Catalog> {
  // Read-only anon selects; Phase 3 RLS filters drafts/unpublished server-side.
  const [categoriesRes, collectionsRes, productsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('slug, name, sort_order')
      .order('sort_order'),
    supabase
      .from('collections')
      .select(
        'slug, name, short_description, description, background_css, display_number, is_published',
      )
      .eq('is_published', true)
      .order('display_number'),
    supabase
      .from('products')
      .select(
        'id, name, description, details, price_da, category_slug, collection_slug, image_path, status, is_featured, is_new, is_best_seller, sort_order',
      )
      .eq('status', 'active')
      .order('sort_order'),
  ]);

  const error = categoriesRes.error ?? collectionsRes.error ?? productsRes.error;
  if (error) throw error;

  const categoryRows = (categoriesRes.data ?? []) as CategoryRow[];
  const collectionRows = (collectionsRes.data ?? []) as CollectionRow[];
  const productRows = (productsRes.data ?? []) as ProductRow[];

  const categoryNames = new Map(categoryRows.map((row) => [row.slug, row.name]));

  const collections: Record<string, Collection> = {};
  for (const row of collectionRows) {
    collections[row.slug] = {
      name: row.name,
      short: row.short_description,
      description: row.description,
      background: row.background_css,
      number: row.display_number,
    };
  }

  const products: Product[] = productRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    details: row.details,
    price: row.price_da,
    // display names come from categories; fall back to the slug if a row ever
    // references a category the UI has not seen yet (never for seeded data).
    category: categoryNames.get(row.category_slug) ?? row.category_slug,
    collection: row.collection_slug,
    image: row.image_path ?? '',
    featured: row.is_featured,
    isNew: row.is_new,
    bestSeller: row.is_best_seller,
  }));

  return {
    products,
    collections,
    categories: categoryRows.map((row) => row.name),
  };
}

/**
 * Single catalog query shared by every consumer (React Query dedupes by key).
 * AppShell gates routing on isLoading/isError, so page components can treat
 * the returned arrays as ready-to-render.
 */
export function useCatalog() {
  const query = useQuery({
    queryKey: ['catalog', 'v1'],
    queryFn: fetchCatalog,
    staleTime: 60_000,
    retry: 1,
  });

  return {
    products: query.data?.products ?? EMPTY_CATALOG.products,
    collections: query.data?.collections ?? EMPTY_CATALOG.collections,
    categories: query.data?.categories ?? EMPTY_CATALOG.categories,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
