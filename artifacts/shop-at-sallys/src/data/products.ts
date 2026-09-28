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
  { id:'sn-bookmark', name:'Blue Hour Bookmark', description:'A midnight-blue page marker with a golden paper edge.', price:480, category:'Paper goods', collection:'starry-night', image:'starry-night-bookmark', bestSeller:true, details:'Printed on 350gsm cotton paper and finished with a rounded corner. 5 × 17 cm.' },
  { id:'sn-tote', name:'Café Terrace Tote', description:'A sturdy everyday tote for books, bread, and a sketchbook.', price:2100, category:'Totes', collection:'starry-night', image:'starry-night-tote', isNew:true, details:'Heavy natural canvas with a cobalt screen print. 38 × 42 cm with a comfortable shoulder strap.' },
  { id:'sn-stickers', name:'Tiny Stars Sticker Sheet', description:'A sheet of miniature stars, moons, and hand-drawn windows.', price:650, category:'Paper goods', collection:'starry-night', image:'starry-night-stickers', details:baseDetails },
  { id:'sf-mug', name:'Golden Vase Mug', description:'A sunny yellow mug for coffee, paint water, or a desk full of flowers.', price:1850, category:'Mugs', collection:'sunflowers', featured:true, bestSeller:true, image:'sunflowers-mug', details:baseDetails },
  { id:'sf-poster', name:'Sunflower Study Print', description:'A tactile art print with the generous warmth of a late summer room.', price:2400, category:'Posters', collection:'sunflowers', featured:true, image:'sunflowers-poster', details:'A3 archival art print on warm, textured paper. Unframed, ready for your own wall and its next story.' },
  { id:'sf-note', name:'Ochre Field Notebook', description:'A linen-textured notebook for lists, letters, and small plans.', price:1350, category:'Notebooks', collection:'sunflowers', image:'/products/sunflowers-notebook.png', isNew:true, details:baseDetails },
  { id:'sf-spiral-note', name:'Sunflowers Spiral Notebook', description:'A wire-bound notebook with a bright sunflower cover for sketches and notes.', price:1350, category:'Notebooks', collection:'sunflowers', image:'/products/sunflowers-spiral-notebook.png', details:baseDetails },
  { id:'sf-puzzle', name:'12 Sunflowers Mini Puzzle', description:'A 150-piece pocket puzzle for an unhurried afternoon.', price:1750, category:'Puzzles', collection:'sunflowers', image:'sunflowers-puzzle', bestSeller:true, details:'150 pieces, packed in a keepsake box. Finished puzzle measures 24 × 18 cm.' },
  { id:'sf-postcards', name:'Postcards from August', description:'Four postcards for notes that deserve more than a message thread.', price:900, category:'Paper goods', collection:'sunflowers', image:'sunflowers-postcards', details:baseDetails },
  { id:'sf-tote', name:'The Yellow Room Tote', description:'A bright, useful tote with a hand-brushed botanical print.', price:2200, category:'Totes', collection:'sunflowers', image:'sunflowers-tote', details:'Heavy natural canvas with a golden screen print. 38 × 42 cm with a comfortable shoulder strap.' },
  { id:'ir-mug', name:'Indigo Irises Mug', description:'A blue-and-olive stoneware mug with a painterly floral wrap.', price:1850, category:'Mugs', collection:'irises', image:'irises-mug', bestSeller:true, details:baseDetails },
  { id:'ir-poster', name:'Irises in the Garden Print', description:'A botanical print with wild blue edges and room to breathe.', price:2400, category:'Posters', collection:'irises', featured:true, image:'irises-poster', details:'A3 archival art print on warm, textured paper. Unframed, ready for your own wall and its next story.' },
  { id:'ir-note', name:'Blue Stem Notebook', description:'A quiet notebook with a deep blue cover and olive spine.', price:1350, category:'Notebooks', collection:'irises', image:'/products/irises-notebook.png', isNew:true, details:baseDetails },
  { id:'ir-bookmark', name:'Garden Gate Bookmark', description:'A slim bookmark with a saturated indigo garden on one side.', price:480, category:'Paper goods', collection:'irises', image:'irises-bookmark', details:baseDetails },
  { id:'ir-tote', name:'Wild Iris Tote', description:'A botanical canvas bag that carries the day with a little colour.', price:2200, category:'Totes', collection:'irises', image:'irises-tote', details:'Heavy natural canvas with a deep blue screen print. 38 × 42 cm with a comfortable shoulder strap.' },
  { id:'ir-stickers', name:'Garden Notes Sticker Sheet', description:'Loose petals and stems for the margins of your everyday.', price:650, category:'Paper goods', collection:'irises', image:'irises-stickers', details:baseDetails },
  { id:'wf-mug', name:'Wheatfield Morning Mug', description:'A warm ochre mug for a long breakfast and an open window.', price:1850, category:'Mugs', collection:'wheatfield', image:'wheatfield-mug', featured:true, details:baseDetails },
  { id:'wf-poster', name:'Road Through Wheatfield Print', description:'A horizon-led print about taking the scenic route.', price:2400, category:'Posters', collection:'wheatfield', image:'wheatfield-poster', details:'A3 archival art print on warm, textured paper. Unframed, ready for your own wall and its next story.' },
  { id:'wf-note', name:'Long Way Home Notebook', description:'A substantial notebook for the thoughts that take their time.', price:1350, category:'Notebooks', collection:'wheatfield', image:'/products/wheatfield-notebook.png', bestSeller:true, details:baseDetails },
  { id:'wf-puzzle', name:'Summer Road Mini Puzzle', description:'A pocket-sized landscape to piece together slowly.', price:1750, category:'Puzzles', collection:'wheatfield', image:'wheatfield-puzzle', isNew:true, details:'150 pieces, packed in a keepsake box. Finished puzzle measures 24 × 18 cm.' },
  { id:'wf-tote', name:'Golden Path Tote', description:'A generous canvas tote printed with a loose summer landscape.', price:2200, category:'Totes', collection:'wheatfield', image:'wheatfield-tote', bestSeller:true, details:'Heavy natural canvas with an ochre screen print. 38 × 42 cm with a comfortable shoulder strap.' },
  { id:'wf-postcards', name:'Letters from the Field', description:'A set of four landscape postcards for faraway hellos.', price:900, category:'Paper goods', collection:'wheatfield', image:'wheatfield-postcards', details:baseDetails },
  { id:'ab-mug', name:'Blossom Branch Mug', description:'A powder-blue mug for new ideas and second cups of tea.', price:1850, category:'Mugs', collection:'almond-blossoms', image:'/products/almond-blossoms-mug.png', isNew:true, details:baseDetails },
  { id:'ab-poster', name:'Almond Branch Print', description:'A quiet blue branch print for a softer corner of your home.', price:2400, category:'Posters', collection:'almond-blossoms', featured:true, image:'almond-blossoms-poster', details:'A3 archival art print on warm, textured paper. Unframed, ready for your own wall and its next story.' },
  { id:'ab-note', name:'Spring Branch Notebook', description:'A pale linen notebook with a small blue blossom on the cover.', price:1350, category:'Notebooks', collection:'almond-blossoms', image:'almond-blossoms-notebook', bestSeller:true, details:baseDetails },
  { id:'ab-bookmark', name:'Blossom Page Marker', description:'A little branch to find your place and keep it.', price:480, category:'Paper goods', collection:'almond-blossoms', image:'almond-blossoms-bookmark', details:baseDetails },
  { id:'ab-postcards', name:'A Note in Spring', description:'Four airy postcards with space for a proper letter.', price:900, category:'Paper goods', collection:'almond-blossoms', image:'almond-blossoms-postcards', isNew:true, details:baseDetails },
  { id:'ab-stickers', name:'Blossom Margins Sticker Sheet', description:'Small blossoms and blue branches for a gentler kind of annotation.', price:650, category:'Paper goods', collection:'almond-blossoms', image:'almond-blossoms-stickers', details:baseDetails },
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