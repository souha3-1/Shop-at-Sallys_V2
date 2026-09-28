export type CollectionSlug =
  | 'starry-night'
  | 'sunflowers'
  | 'irises'
  | 'wheatfield'
  | 'almond-blossoms';

export type Category =
  | 'Mugs'
  | 'Posters'
  | 'Notebooks'
  | 'Paper goods'
  | 'Totes'
  | 'Puzzles'
  | 'Accessories';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  collection: CollectionSlug;
  image: string;
  featured?: boolean;
  isNew?: boolean;
  bestSeller?: boolean;
  details: string;
};

export const collections: Record<CollectionSlug, {
  name: string;
  short: string;
  description: string;
  background: string;
  number: string;
}> = {
  'starry-night': {
    name: 'Starry Night',
    short: 'The blue hour',
    description: 'Cobalt skies, tiny galaxies, and the little objects that make an ordinary desk feel like midnight in Saint-Rémy.',
    background: 'linear-gradient(135deg, #243B5A 0%, #3F6691 42%, #B9A4D6 100%)',
    number: '01',
  },
  sunflowers: {
    name: 'Sunflowers',
    short: 'A room in August',
    description: 'Warm ochres and unapologetic yellow, translated into bright companions for slow mornings and generous tables.',
    background: 'linear-gradient(135deg, #D69A32 0%, #F3C84B 60%, #899A68 100%)',
    number: '02',
  },
  irises: {
    name: 'Irises',
    short: 'Wild blue edges',
    description: 'A little untamed, a little botanical: indigo petals, olive stems, and paper goods with room to breathe.',
    background: 'linear-gradient(135deg, #3F6691 0%, #B9A4D6 48%, #899A68 100%)',
    number: '03',
  },
  wheatfield: {
    name: 'Wheatfield',
    short: 'The long way home',
    description: 'Ochre paths and summer greens for notebooks, totes, and everything you carry toward somewhere new.',
    background: 'linear-gradient(135deg, #899A68 0%, #D69A32 50%, #F3C84B 100%)',
    number: '04',
  },
  'almond-blossoms': {
    name: 'Almond Blossoms',
    short: 'A gentler spring',
    description: 'Powder-blue branches and quiet optimism, made for sending notes, marking pages, and keeping close.',
    background: 'linear-gradient(135deg, #3F6691 0%, #B9A4D6 52%, #E6D4B8 100%)',
    number: '05',
  },
};

const baseDetails = 'Printed in small batches and packed in our Algiers studio. Designed to be used daily, kept for years, and gifted with good intentions.';

export const products: Product[] = [
  { id:'sn-mug', name:'Midnight Garden Mug', description:'A generous stoneware mug for late starts and blue-hour tea.', price:1850, category:'Mugs', collection:'starry-night', image:'/products/starry-night-mug.png', featured:true, bestSeller:true, details:baseDetails },
  { id:'sn-poster', name:'Night Window Art Print', description:'A small-format print that brings a cobalt sky to quiet corners.', price:2400, category:'Posters', collection:'starry-night', image:'/products/starry-night-framed-print.png', featured:true, details:'A3 archival art print on warm, textured paper. Unframed, ready for your own wall and its next story.' },
  { id:'sn-note', name:'Constellation Notebook', description:'A soft-cover notebook with 64 pages for ideas under construction.', price:1250, category:'Notebooks', collection:'starry-night', image:'/products/starry-night-notebook.png', isNew:true, details:baseDetails },
  { id:'sf-note', name:'Ochre Field Notebook', description:'A linen-textured notebook for lists, letters, and small plans.', price:1350, category:'Notebooks', collection:'sunflowers', image:'/products/sunflowers-notebook.png', isNew:true, details:baseDetails },
  { id:'sf-spiral-note', name:'Sunflowers Spiral Notebook', description:'A wire-bound notebook with a bright sunflower cover for sketches and notes.', price:1350, category:'Notebooks', collection:'sunflowers', image:'/products/sunflowers-spiral-notebook.png', details:baseDetails },
  { id:'ir-note', name:'Blue Stem Notebook', description:'A quiet notebook with a deep blue cover and olive spine.', price:1350, category:'Notebooks', collection:'irises', image:'/products/irises-notebook.png', isNew:true, details:baseDetails },
  { id:'wf-note', name:'Long Way Home Notebook', description:'A substantial notebook for the thoughts that take their time.', price:1350, category:'Notebooks', collection:'wheatfield', image:'/products/wheatfield-notebook.png', bestSeller:true, details:baseDetails },
  { id:'ab-mug', name:'Blossom Branch Mug', description:'A powder-blue mug for new ideas and second cups of tea.', price:1850, category:'Mugs', collection:'almond-blossoms', image:'/products/almond-blossoms-mug.png', isNew:true, details:baseDetails },
  { id:'sn-glass-candle', name:'Starry Night Glass Candle', description:'A clear glass candle wrapped with a small Starry Night museum-shop label.', price:1850, category:'Accessories', collection:'starry-night', image:'/products/starry-night-glass-candle.png', details:baseDetails },
  { id:'sn-stargazers-candle', name:"Stargazer's Dream Candle", description:'A lavender-scented candle for a quiet evening under a swirling sky.', price:2200, category:'Accessories', collection:'starry-night', image:'/products/stargazers-dream-candle.png', details:baseDetails },
  { id:'sn-notebook-collection', name:'Van Gogh Notebook Collection', description:'A collection of Van Gogh-inspired notebooks in several familiar night-time scenes.', price:2400, category:'Notebooks', collection:'starry-night', image:'/products/van-gogh-notebook-collection.png', details:baseDetails },
  { id:'sn-self-portrait-puzzle', name:'Van Gogh Self-Portrait Puzzle', description:'A small puzzle featuring Van Gogh’s self-portrait for an unhurried afternoon.', price:1750, category:'Puzzles', collection:'starry-night', image:'/products/van-gogh-self-portrait-puzzle.png', details:'A pocket puzzle packed in a keepsake box. A good fit for a slow table and a little concentration.' },
  { id:'sn-keychain-set', name:'Van Gogh Art Keychain Set', description:'Clear art keychains featuring a mix of Van Gogh-inspired paintings.', price:1200, category:'Accessories', collection:'starry-night', image:'/products/van-gogh-keychain-set.png', details:baseDetails },
  { id:'sn-clipboard-collection', name:'Van Gogh Clipboard Collection', description:'Useful clipboards printed with bright, swirling Van Gogh-inspired scenes.', price:2400, category:'Accessories', collection:'starry-night', image:'/products/van-gogh-clipboard-collection.png', details:baseDetails },
  { id:'sn-gift-box', name:'Van Gogh Gift Box', description:'A curated box of small museum-shop objects for someone who likes to look closely.', price:5000, category:'Accessories', collection:'starry-night', image:'/products/van-gogh-gift-box.png', details:'A ready-to-gift assortment selected from the shop and packed with care.' },
  { id:'sn-watercolor-sketchbook', name:'Starry Night Watercolor Sketchbook', description:'A spiral watercolor sketchbook with a Starry Night-inspired cover and room to paint.', price:2200, category:'Notebooks', collection:'starry-night', image:'/products/starry-night-watercolor-sketchbook.png', details:baseDetails },
  { id:'sn-bookmark-set', name:'Van Gogh Bookmark Set', description:'A set of colourful painted bookmarks with matching little art tabs.', price:900, category:'Paper goods', collection:'starry-night', image:'/products/van-gogh-bookmark-set.png', details:baseDetails },
  { id:'sn-retro-oil-painting-kit', name:'Starry Night Retro Oil Painting Kit', description:'A boxed painting kit for making a small, swirling night of your own.', price:2800, category:'Accessories', collection:'starry-night', image:'/products/starry-night-retro-oil-painting-kit.png', details:baseDetails },
  { id:'sn-self-portrait-mug', name:'Self-Portrait Mug', description:'A bright yellow mug featuring Van Gogh’s self-portrait and a matching gift box.', price:1850, category:'Mugs', collection:'starry-night', image:'/products/van-gogh-self-portrait-mug.png', isNew:true, details:baseDetails },
  { id:'sn-blue-ornate-frame', name:'Starry Night Blue Ornate Frame', description:'A blue-and-gold decorative frame holding a hand-painted Starry Night scene.', price:4200, category:'Posters', collection:'starry-night', image:'/products/starry-night-blue-ornate-frame.png', details:'A decorative framed artwork for a small wall, shelf, or thoughtful gift.' },
  { id:'sn-masterworks-mug', name:'Van Gogh Masterworks Mug', description:'A gallery-wrap mug covered in small scenes from Van Gogh’s most-loved paintings.', price:1850, category:'Mugs', collection:'starry-night', image:'/products/van-gogh-masterworks-mug.png', details:baseDetails },
  { id:'sn-self-portrait-tote', name:'Self-Portrait Canvas Tote', description:'A natural canvas tote printed with Van Gogh’s self-portrait and title lettering.', price:2200, category:'Totes', collection:'starry-night', image:'/products/van-gogh-self-portrait-tote.png', details:'A sturdy canvas carryall for books, errands, and a little art history on the move.' },
  { id:'sn-rhone-tote', name:'Starry Night Over the Rhône Tote', description:'A natural canvas tote featuring Starry Night Over the Rhône in deep blue and gold.', price:2200, category:'Totes', collection:'starry-night', image:'/products/starry-night-rhone-tote.png', details:'A sturdy canvas carryall with a painterly museum-shop print.' },
  { id:'sn-button-set', name:'Beyond Van Gogh Button Set', description:'A set of painted art buttons featuring night skies, portraits, and warm studio scenes.', price:900, category:'Accessories', collection:'starry-night', image:'/products/beyond-van-gogh-button-set.png', details:baseDetails },
  { id:'sn-tassel-bookmarks', name:'Van Gogh Tassel Bookmark Set', description:'Decorative art bookmarks finished with long gold tassels and painted details.', price:1200, category:'Paper goods', collection:'starry-night', image:'/products/van-gogh-tassel-bookmark-set.png', details:baseDetails },
  { id:'sn-folder-collection', name:'Van Gogh Art Folder Collection', description:'A collection of clear art folders printed with Starry Night, Sunflowers, and other Van Gogh scenes.', price:1600, category:'Paper goods', collection:'starry-night', image:'/products/van-gogh-folder-collection.png', details:baseDetails },
  { id:'sn-bedroom-frame', name:'The Bedroom Ornate Frame', description:'A gold decorative frame featuring Van Gogh’s warm, graphic bedroom scene.', price:4200, category:'Posters', collection:'starry-night', image:'/products/the-bedroom-ornate-frame.png', details:'A decorative framed artwork for a small wall, shelf, or thoughtful gift.' },
  { id:'ir-ornate-frame', name:'Irises Ornate Frame', description:'An oval gold frame featuring a vivid blue-and-green study of irises.', price:4200, category:'Posters', collection:'irises', image:'/products/irises-ornate-frame.png', details:'A decorative framed artwork for a small wall, shelf, or thoughtful gift.' },
  { id:'sn-roses-frame', name:'Roses Ornate Frame', description:'A gold decorative frame featuring a colourful bouquet of garden roses.', price:4200, category:'Posters', collection:'starry-night', image:'/products/roses-ornate-frame.png', details:'A decorative framed artwork for a small wall, shelf, or thoughtful gift.' },
  { id:'sn-self-portrait-frame', name:'Self-Portrait Ornate Frame', description:'A gold decorative frame featuring Van Gogh’s expressive self-portrait.', price:4200, category:'Posters', collection:'starry-night', image:'/products/van-gogh-self-portrait-ornate-frame.png', details:'A decorative framed artwork for a small wall, shelf, or thoughtful gift.' },
  { id:'wf-cypress-frame', name:'Cypress Road Ornate Frame', description:'A gold decorative frame featuring a cypress-lined road beneath a swirling blue sky.', price:4200, category:'Posters', collection:'wheatfield', image:'/products/wheatfield-cypress-ornate-frame.png', details:'A decorative framed artwork for a small wall, shelf, or thoughtful gift.' },
  { id:'sf-flowers-frame', name:'Flowers in a Vase Ornate Frame', description:'A white-and-gold oval frame featuring a richly coloured floral still life.', price:4200, category:'Posters', collection:'sunflowers', image:'/products/flowers-vase-ornate-frame.png', details:'A decorative framed artwork for a small wall, shelf, or thoughtful gift.' },
];

export const categories: Category[] = ['Mugs', 'Posters', 'Notebooks', 'Paper goods', 'Totes', 'Puzzles', 'Accessories'];

export const money = (value: number) => `${value.toLocaleString('fr-DZ')} DA`;