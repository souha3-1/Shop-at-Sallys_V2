-- Phase 4 — catalog seed data
--
-- GENERATED FILE (one-time, at Phase 4) from the storefront's original
-- hard-coded catalog (artifacts/shop-at-sallys/src/data/products.ts before
-- Phase 4; types-only from then on, data lives HERE). Do not regenerate:
-- future catalog changes are admin edits (Phase 9) or new migrations.
--
-- * Order: categories by display order, collections by slug, products by
--   curated shop order (products.sort_order).
-- * status=active / is_published=true: every row is publicly visible today,
--   matching the hard-coded storefront exactly (RLS from Phase 3 applies).
-- * ON CONFLICT DO NOTHING: re-running never clobbers admin edits.
-- * inventory is intentionally NOT seeded: no stock source exists yet and
--   fabricating quantities would invent sellable stock. Phase 8/9 own that.

begin;

-- 7 categories (slug derived from display name, sort_order = display order)
insert into public.categories (slug, name, sort_order) values
  ('mugs', 'Mugs', 1),
  ('posters', 'Posters', 2),
  ('notebooks', 'Notebooks', 3),
  ('paper-goods', 'Paper goods', 4),
  ('totes', 'Totes', 5),
  ('puzzles', 'Puzzles', 6),
  ('accessories', 'Accessories', 7)
on conflict (slug) do nothing;

-- 5 collections (all published; display_number carries the UI number)
insert into public.collections (slug, name, short_description, description, background_css, display_number, is_published) values
  ('starry-night', 'Starry Night', 'The blue hour', 'Cobalt skies, tiny galaxies, and the little objects that make an ordinary desk feel like midnight in Saint-Rémy.', 'linear-gradient(135deg, #243B5A 0%, #3F6691 42%, #B9A4D6 100%)', '01', true),
  ('sunflowers', 'Sunflowers', 'A room in August', 'Warm ochres and unapologetic yellow, translated into bright companions for slow mornings and generous tables.', 'linear-gradient(135deg, #D69A32 0%, #F3C84B 60%, #899A68 100%)', '02', true),
  ('irises', 'Irises', 'Wild blue edges', 'A little untamed, a little botanical: indigo petals, olive stems, and paper goods with room to breathe.', 'linear-gradient(135deg, #3F6691 0%, #B9A4D6 48%, #899A68 100%)', '03', true),
  ('wheatfield', 'Wheatfield', 'The long way home', 'Ochre paths and summer greens for notebooks, totes, and everything you carry toward somewhere new.', 'linear-gradient(135deg, #899A68 0%, #D69A32 50%, #F3C84B 100%)', '04', true),
  ('almond-blossoms', 'Almond Blossoms', 'A gentler spring', 'Powder-blue branches and quiet optimism, made for sending notes, marking pages, and keeping close.', 'linear-gradient(135deg, #3F6691 0%, #B9A4D6 52%, #E6D4B8 100%)', '05', true)
on conflict (slug) do nothing;

-- 32 products (all active; flags mirror featured/isNew/bestSeller)
insert into public.products (id, name, description, details, price_da, category_slug, collection_slug, image_path, status, is_featured, is_new, is_best_seller, sort_order) values
  ('sn-mug', 'Midnight Garden Mug', 'A generous stoneware mug for late starts and blue-hour tea.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1850, 'mugs', 'starry-night', '/products/starry-night-mug.png', 'active', true, false, true, 0),
  ('sn-poster', 'Night Window Art Print', 'A small-format print that brings a cobalt sky to quiet corners.', 'A3 archival art print on warm, textured paper. Unframed, ready for your own wall and its next story.', 2400, 'posters', 'starry-night', '/products/starry-night-framed-print.png', 'active', true, false, false, 1),
  ('sn-note', 'Constellation Notebook', 'A soft-cover notebook with 64 pages for ideas under construction.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1250, 'notebooks', 'starry-night', '/products/starry-night-notebook.png', 'active', false, true, false, 2),
  ('sf-note', 'Ochre Field Notebook', 'A linen-textured notebook for lists, letters, and small plans.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1350, 'notebooks', 'sunflowers', '/products/sunflowers-notebook.png', 'active', false, true, false, 3),
  ('sf-spiral-note', 'Sunflowers Spiral Notebook', 'A wire-bound notebook with a bright sunflower cover for sketches and notes.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1350, 'notebooks', 'sunflowers', '/products/sunflowers-spiral-notebook.png', 'active', false, false, false, 4),
  ('ir-note', 'Blue Stem Notebook', 'A quiet notebook with a deep blue cover and olive spine.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1350, 'notebooks', 'irises', '/products/irises-notebook.png', 'active', false, true, false, 5),
  ('wf-note', 'Long Way Home Notebook', 'A substantial notebook for the thoughts that take their time.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1350, 'notebooks', 'wheatfield', '/products/wheatfield-notebook.png', 'active', false, false, true, 6),
  ('ab-mug', 'Blossom Branch Mug', 'A powder-blue mug for new ideas and second cups of tea.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1850, 'mugs', 'almond-blossoms', '/products/almond-blossoms-mug.png', 'active', false, true, false, 7),
  ('sn-glass-candle', 'Starry Night Glass Candle', 'A clear glass candle wrapped with a small Starry Night museum-shop label.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1850, 'accessories', 'starry-night', '/products/starry-night-glass-candle.png', 'active', false, false, false, 8),
  ('sn-stargazers-candle', 'Stargazer''s Dream Candle', 'A lavender-scented candle for a quiet evening under a swirling sky.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 2200, 'accessories', 'starry-night', '/products/stargazers-dream-candle.png', 'active', false, false, false, 9),
  ('sn-notebook-collection', 'Van Gogh Notebook Collection', 'A collection of Van Gogh-inspired notebooks in several familiar night-time scenes.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 2400, 'notebooks', 'starry-night', '/products/van-gogh-notebook-collection.png', 'active', false, false, false, 10),
  ('sn-self-portrait-puzzle', 'Van Gogh Self-Portrait Puzzle', 'A small puzzle featuring Van Gogh’s self-portrait for an unhurried afternoon.', 'A pocket puzzle packed in a keepsake box. A good fit for a slow table and a little concentration.', 1750, 'puzzles', 'starry-night', '/products/van-gogh-self-portrait-puzzle.png', 'active', false, false, false, 11),
  ('sn-keychain-set', 'Van Gogh Art Keychain Set', 'Clear art keychains featuring a mix of Van Gogh-inspired paintings.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1200, 'accessories', 'starry-night', '/products/van-gogh-keychain-set.png', 'active', false, false, false, 12),
  ('sn-clipboard-collection', 'Van Gogh Clipboard Collection', 'Useful clipboards printed with bright, swirling Van Gogh-inspired scenes.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 2400, 'accessories', 'starry-night', '/products/van-gogh-clipboard-collection.png', 'active', false, false, false, 13),
  ('sn-gift-box', 'Van Gogh Gift Box', 'A curated box of small museum-shop objects for someone who likes to look closely.', 'A ready-to-gift assortment selected from the shop and packed with care.', 5000, 'accessories', 'starry-night', '/products/van-gogh-gift-box.png', 'active', false, false, false, 14),
  ('sn-watercolor-sketchbook', 'Starry Night Watercolor Sketchbook', 'A spiral watercolor sketchbook with a Starry Night-inspired cover and room to paint.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 2200, 'notebooks', 'starry-night', '/products/starry-night-watercolor-sketchbook.png', 'active', false, false, false, 15),
  ('sn-bookmark-set', 'Van Gogh Bookmark Set', 'A set of colourful painted bookmarks with matching little art tabs.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 900, 'paper-goods', 'starry-night', '/products/van-gogh-bookmark-set.png', 'active', false, false, false, 16),
  ('sn-retro-oil-painting-kit', 'Starry Night Retro Oil Painting Kit', 'A boxed painting kit for making a small, swirling night of your own.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 2800, 'accessories', 'starry-night', '/products/starry-night-retro-oil-painting-kit.png', 'active', false, false, false, 17),
  ('sn-self-portrait-mug', 'Self-Portrait Mug', 'A bright yellow mug featuring Van Gogh’s self-portrait and a matching gift box.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1850, 'mugs', 'starry-night', '/products/van-gogh-self-portrait-mug.png', 'active', false, true, false, 18),
  ('sn-blue-ornate-frame', 'Starry Night Blue Ornate Frame', 'A blue-and-gold decorative frame holding a hand-painted Starry Night scene.', 'A decorative framed artwork for a small wall, shelf, or thoughtful gift.', 4200, 'posters', 'starry-night', '/products/starry-night-blue-ornate-frame.png', 'active', false, false, false, 19),
  ('sn-masterworks-mug', 'Van Gogh Masterworks Mug', 'A gallery-wrap mug covered in small scenes from Van Gogh’s most-loved paintings.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1850, 'mugs', 'starry-night', '/products/van-gogh-masterworks-mug.png', 'active', false, false, false, 20),
  ('sn-self-portrait-tote', 'Self-Portrait Canvas Tote', 'A natural canvas tote printed with Van Gogh’s self-portrait and title lettering.', 'A sturdy canvas carryall for books, errands, and a little art history on the move.', 2200, 'totes', 'starry-night', '/products/van-gogh-self-portrait-tote.png', 'active', false, false, false, 21),
  ('sn-rhone-tote', 'Starry Night Over the Rhône Tote', 'A natural canvas tote featuring Starry Night Over the Rhône in deep blue and gold.', 'A sturdy canvas carryall with a painterly museum-shop print.', 2200, 'totes', 'starry-night', '/products/starry-night-rhone-tote.png', 'active', false, false, false, 22),
  ('sn-button-set', 'Beyond Van Gogh Button Set', 'A set of painted art buttons featuring night skies, portraits, and warm studio scenes.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 900, 'accessories', 'starry-night', '/products/beyond-van-gogh-button-set.png', 'active', false, false, false, 23),
  ('sn-tassel-bookmarks', 'Van Gogh Tassel Bookmark Set', 'Decorative art bookmarks finished with long gold tassels and painted details.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1200, 'paper-goods', 'starry-night', '/products/van-gogh-tassel-bookmark-set.png', 'active', false, false, false, 24),
  ('sn-folder-collection', 'Van Gogh Art Folder Collection', 'A collection of clear art folders printed with Starry Night, Sunflowers, and other Van Gogh scenes.', 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.', 1600, 'paper-goods', 'starry-night', '/products/van-gogh-folder-collection.png', 'active', false, false, false, 25),
  ('sn-bedroom-frame', 'The Bedroom Ornate Frame', 'A gold decorative frame featuring Van Gogh’s warm, graphic bedroom scene.', 'A decorative framed artwork for a small wall, shelf, or thoughtful gift.', 4200, 'posters', 'starry-night', '/products/the-bedroom-ornate-frame.png', 'active', false, false, false, 26),
  ('ir-ornate-frame', 'Irises Ornate Frame', 'An oval gold frame featuring a vivid blue-and-green study of irises.', 'A decorative framed artwork for a small wall, shelf, or thoughtful gift.', 4200, 'posters', 'irises', '/products/irises-ornate-frame.png', 'active', false, false, false, 27),
  ('sn-roses-frame', 'Roses Ornate Frame', 'A gold decorative frame featuring a colourful bouquet of garden roses.', 'A decorative framed artwork for a small wall, shelf, or thoughtful gift.', 4200, 'posters', 'starry-night', '/products/roses-ornate-frame.png', 'active', false, false, false, 28),
  ('sn-self-portrait-frame', 'Self-Portrait Ornate Frame', 'A gold decorative frame featuring Van Gogh’s expressive self-portrait.', 'A decorative framed artwork for a small wall, shelf, or thoughtful gift.', 4200, 'posters', 'starry-night', '/products/van-gogh-self-portrait-ornate-frame.png', 'active', false, false, false, 29),
  ('wf-cypress-frame', 'Cypress Road Ornate Frame', 'A gold decorative frame featuring a cypress-lined road beneath a swirling blue sky.', 'A decorative framed artwork for a small wall, shelf, or thoughtful gift.', 4200, 'posters', 'wheatfield', '/products/wheatfield-cypress-ornate-frame.png', 'active', false, false, false, 30),
  ('sf-flowers-frame', 'Flowers in a Vase Ornate Frame', 'A white-and-gold oval frame featuring a richly coloured floral still life.', 'A decorative framed artwork for a small wall, shelf, or thoughtful gift.', 4200, 'posters', 'sunflowers', '/products/flowers-vase-ornate-frame.png', 'active', false, false, false, 31)
on conflict (id) do nothing;

commit;
