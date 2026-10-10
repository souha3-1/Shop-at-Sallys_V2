import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { money, type Product } from '@/data/products';
import { useCatalog } from '@/lib/catalog';
import { EmptyState, ProductArtwork, ProductCard, ProductThumbnail, QuantityControl, ToastStack } from '@/components/store-ui';
import { ArrowRight, Check, ChevronDown, ChevronLeft, Heart, Instagram, Mail, MapPin, Menu, Package, Search, ShieldCheck, ShoppingBag, Sparkles, Truck, UserRound, X } from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiError,
  addCartItem,
  getGetCartQueryKey,
  placeOrder,
  removeCartItem,
  updateCartItem,
  useGetCart,
  type Cart as ServerCart,
  type Order,
  type PlaceOrderRequest,
} from '@workspace/api-client-react';
import { createServerCart, readStoredCartId } from '@/lib/cart';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

type CartLine = { productId: string; quantity: number };
type Toast = { id: number; message: string };
const queryClient = new QueryClient();

function Header({ cart, wishlist, onCart }: { cart: CartLine[]; wishlist: string[]; onCart: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <div className="top-note">Free delivery in Algiers on orders over 5,000 DA · Payment on delivery across Algeria</div>
      <header className={`site-header ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="container-wide header-main">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation" data-testid="button-mobile-menu">
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link href="/" className="brand" onClick={() => setMobileOpen(false)} data-testid="link-home">
            <span className="brand-mark">S</span>
            <span><span className="brand-name">Shop at Sally's</span><span className="brand-sub">museum shop · algiers</span></span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/shop" onClick={() => setMobileOpen(false)} data-testid="link-shop">Shop</Link>
            <Link href="/collection/starry-night" onClick={() => setMobileOpen(false)} data-testid="link-collections">Collections</Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} data-testid="link-about">Our story</Link>
            <Link href="/contact" onClick={() => setMobileOpen(false)} data-testid="link-contact">Contact</Link>
          </nav>
          <div className="header-actions">
            <Link className="icon-btn" href="/shop" aria-label="Search the shop" data-testid="link-search"><Search size={19} /></Link>
            <Link className="icon-btn" href="/wishlist" aria-label={`Wishlist with ${wishlist.length} items`} data-testid="link-wishlist"><Heart size={19} fill={wishlist.length ? 'currentColor' : 'none'} /></Link>
            <Link className="icon-btn" href="/account" aria-label="Your account" data-testid="link-account"><UserRound size={19} /></Link>
            <button className="icon-btn" onClick={onCart} aria-label={`Open bag with ${cart.length} items`} data-testid="button-open-cart" style={{ position:'relative' }}>
              <ShoppingBag size={20} />{cart.length > 0 && <span className="cart-count">{cart.reduce((sum, line) => sum + line.quantity, 0)}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-wide footer-grid">
        <div>
          <Link href="/" className="brand"><span className="brand-mark">S</span><span><span className="brand-name">Shop at Sally's</span><span className="brand-sub">museum shop · algiers</span></span></Link>
          <p style={{ color:'var(--linen)', maxWidth:260, lineHeight:1.7, fontSize:'.85rem', marginTop:20 }}>Art belongs in everyday life. A small creative shop for objects with a point of view.</p>
        </div>
        <div><div className="footer-title">Explore</div><div className="footer-links"><Link href="/shop">All objects</Link><Link href="/collection/sunflowers">Sunflowers</Link><Link href="/collection/irises">Irises</Link><Link href="/collection/wheatfield">Wheatfield</Link></div></div>
        <div><div className="footer-title">Help</div><div className="footer-links"><Link href="/contact">Delivery & contact</Link><Link href="/account">Your account</Link><Link href="/wishlist">Saved pieces</Link><span>Payment on delivery</span></div></div>
        <div><div className="footer-title">Say hello</div><div className="footer-links"><a href="mailto:hello@shopatsallys.dz">hello@shopatsallys.dz</a><a href="https://instagram.com/shopatsallys" target="_blank" rel="noreferrer">@shopatsallys</a><span>Algiers, Algeria</span></div></div>
      </div>
      <div className="container-wide footer-bottom"><span>© 2024 Shop at Sally's · Made for everyday looking</span><span>7–10 day delivery across Algeria</span></div>
    </footer>
  );
}

function HomePage({ onAdd, wishlist, onWish }: { onAdd: (product: Product) => void; wishlist: string[]; onWish: (product: Product) => void }) {
  const { products, collections } = useCatalog();
  const featured = products.filter((product) => product.featured).slice(0, 4);
  return (
    <main>
      <section className="hero">
        <div className="container-wide hero-grid">
          <div className="entrance">
            <span className="eyebrow" style={{ color:'var(--sunflower)' }}>A little museum shop in Algiers</span>
            <h1 className="display">Art, for<br /><em style={{ color:'var(--sunflower)', fontStyle:'normal' }}>every day.</em></h1>
            <p>Art you can carry, wear, use and keep. Discover everyday objects inspired by timeless Van Gogh masterpieces.</p>
            <div className="hero-actions"><Link className="btn btn-secondary" href="/shop" data-testid="button-shop-all">Shop the collection <ArrowRight size={16} /></Link><Link className="btn btn-quiet" href="/about">Read our story</Link></div>
          </div>
          <div className="hero-art entrance">
            <div className="orbit" />
            <div className="art-poster has-image">
              <img src="/hero/starlight-01.png" alt="Starlight 01 artwork in yellow, green, and orange" />
            </div>
            <div className="hero-stamp">OBJECTS<br />WITH A<br />POINT OF VIEW</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-wide">
          <div className="section-head"><div><span className="eyebrow">Five ways to look</span><h2 className="section-title display">Enter a painting.</h2></div><p className="section-intro">Start with a colour, a mood, or the artwork you return to. Each collection is a small world of useful things.</p></div>
          <div className="collection-rail">
            {Object.entries(collections).map(([slug, collection]) => <Link key={slug} href={`/collection/${slug}`} className="collection-card" style={{ '--collection-bg': collection.background } as CSSProperties} data-testid={`card-collection-${slug}`}><span className="eyebrow">{collection.number}</span><h3>{collection.name}</h3><p>{collection.short}</p></Link>)}
          </div>
        </div>
      </section>

      <section className="section soft-section">
        <div className="container-wide">
          <div className="section-head"><div><span className="eyebrow">The edit</span><h2 className="section-title display">Pieces to live with.</h2></div><Link className="btn btn-quiet" href="/shop">See everything <ArrowRight size={15} /></Link></div>
          <div className="product-grid">{featured.map((product) => <ProductCard key={product.id} product={product} wished={wishlist.includes(product.id)} onWish={() => onWish(product)} onAdd={() => onAdd(product)} />)}</div>
        </div>
      </section>

      <section className="quote-band"><div className="container-wide"><blockquote>“The great thing about art is that it makes you feel alive in an ordinary room.”<cite>— Sally, founder & collector of useful things</cite></blockquote></div></section>

      <section className="section"><div className="container-wide newsletter"><div><span className="eyebrow">A note from the studio</span><h2 className="display">Small news.<br />Good objects.</h2></div><form onSubmit={(event) => { event.preventDefault(); alert('You are on the studio list.'); }}><input aria-label="Email address" type="email" placeholder="Your email address" required data-testid="input-newsletter-email" /><button className="btn btn-primary" type="submit" data-testid="button-newsletter">Join the list <ArrowRight size={15} /></button></form></div></section>
    </main>
  );
}

function ShopPage({ onAdd, wishlist, onWish }: { onAdd: (product: Product) => void; wishlist: string[]; onWish: (product: Product) => void }) {
  const { products, collections, categories } = useCatalog();
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [sort, setSort] = useState('featured');
  const [mobileFilters, setMobileFilters] = useState(false);
  const toggle = (list: string[], value: string, setter: (next: string[]) => void) => setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = products.filter((product) => (!query || `${product.name} ${product.description}`.toLowerCase().includes(query)) && (!selectedCategories.length || selectedCategories.includes(product.category)) && (!selectedCollections.length || selectedCollections.includes(product.collection)));
    return [...result].sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : sort === 'new' ? Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) : Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }, [search, selectedCategories, selectedCollections, sort]);
  const FilterContent = () => <div className="filter-panel"><div className="filter-title">Filter <button className="icon-btn" onClick={() => { setSelectedCategories([]); setSelectedCollections([]); }} aria-label="Clear filters" data-testid="button-clear-filters"><X size={16} /></button></div><div className="filter-group"><h4>Object type</h4><div className="filter-options">{categories.map((category) => <label className="filter-option" key={category}><input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggle(selectedCategories, category, setSelectedCategories)} /> {category}</label>)}</div></div><div className="filter-group"><h4>Collection</h4><div className="filter-options">{Object.entries(collections).map(([slug, collection]) => <label className="filter-option" key={slug}><input type="checkbox" checked={selectedCollections.includes(slug)} onChange={() => toggle(selectedCollections, slug, setSelectedCollections)} /> {collection.name}</label>)}</div></div></div>;
  return <main><section className="page-hero"><div className="container-wide"><span className="eyebrow">The object library</span><h1 className="display">Shop the studio.</h1><p>Thirty little invitations to look closer, made to travel from gallery wall to kitchen table, book bag, and bedside.</p></div></section><section className="section"><div className="container-wide"><div className="shop-toolbar"><button className="btn btn-quiet mobile-filter-btn" onClick={() => setMobileFilters((open) => !open)} data-testid="button-mobile-filters">Filter objects <ChevronDown size={15} /></button><span className="mono" style={{ fontSize:'.72rem', color:'var(--ink)' }}>{filtered.length} objects</span><select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products" data-testid="select-sort"><option value="featured">Sort: featured</option><option value="new">Sort: newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search objects..." aria-label="Search products" data-testid="input-search-products" /></div></div>{mobileFilters && <div style={{ marginBottom:25 }}><FilterContent /></div>}<div className="shop-layout"><FilterContent /><div>{filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} wished={wishlist.includes(product.id)} onWish={() => onWish(product)} onAdd={() => onAdd(product)} />)}</div> : <EmptyState title="Nothing on this shelf." text="Try a different colour, collection, or a less specific search." action="Browse every object" />}</div></div></div></section></main>;
}

function ProductPage({ onAdd, wishlist, onWish }: { onAdd: (product: Product, quantity?: number) => void; wishlist: string[]; onWish: (product: Product) => void }) {
  const { id } = useParams<{ id: string }>();
  const { products, collections } = useCatalog();
  const [quantity, setQuantity] = useState(1);
  const product = products.find((item) => item.id === id);
  if (!product) return <main className="section container-wide"><EmptyState title="That object wandered off." text="The piece you were looking for is no longer on this shelf." action="Return to the shop" /></main>;
  const related = products.filter((item) => item.collection === product.collection && item.id !== product.id).slice(0, 4);
  return <main className="detail-wrap"><div className="container-wide"><div className="breadcrumbs"><Link href="/shop">Shop</Link><ChevronLeft size={13} /><Link href={`/collection/${product.collection}`}>{collections[product.collection]?.name ?? product.collection}</Link><ChevronLeft size={13} /><span>{product.name}</span></div><div className="detail-grid"><ProductArtwork product={product} detail /><div className="detail-copy"><span className="eyebrow">{collections[product.collection]?.name ?? product.collection} · {product.category}</span><h1 className="display">{product.name}</h1><p className="price">{money(product.price)}</p><p className="body-copy">{product.description} {product.details}</p><div className="purchase-row"><QuantityControl quantity={quantity} onChange={setQuantity} testId={`quantity-${product.id}`} /><button className="btn btn-primary" onClick={() => onAdd(product, quantity)} data-testid={`button-add-detail-${product.id}`}><ShoppingBag size={16} /> Add to bag</button><button className="icon-btn" onClick={() => onWish(product)} aria-label="Save this object" data-testid={`button-save-detail-${product.id}`}><Heart fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} /></button></div><div className="detail-note"><Truck size={18} /><span>Delivered across Algeria in 7–10 days. Payment on delivery, always.</span></div><div className="detail-note"><ShieldCheck size={18} /><span>Carefully wrapped in our Algiers studio, ready to gift or keep.</span></div></div></div></div><section className="section soft-section"><div className="container-wide"><div className="section-head"><div><span className="eyebrow">More from this room</span><h2 className="section-title display">Keep looking.</h2></div></div><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} wished={wishlist.includes(item.id)} onWish={() => onWish(item)} onAdd={() => onAdd(item)} />)}</div></div></section></main>;
}

function CollectionPage({ onAdd, wishlist, onWish }: { onAdd: (product: Product) => void; wishlist: string[]; onWish: (product: Product) => void }) {
  const { slug } = useParams<{ slug: string }>();
  const { products, collections } = useCatalog();
  const collection = collections[slug];
  const items = products.filter((product) => product.collection === slug);
  if (!collection) return <main className="section container-wide"><EmptyState title="Collection not found." text="There are five rooms in the shop. This is not one of them." action="See all objects" /></main>;
  return <main><section className="collection-banner" style={{ '--collection-bg': collection.background } as CSSProperties}><div className="container-wide"><span className="eyebrow">{collection.number} / Collection</span><h1 className="display">{collection.name}</h1><p>{collection.description}</p></div></section><section className="section"><div className="container-wide"><div className="section-head"><div><span className="eyebrow">{collection.short}</span><h2 className="section-title display">Objects from this room.</h2></div><p className="section-intro">{items.length} pieces, each designed to sit naturally in a life already in progress.</p></div><div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} wished={wishlist.includes(product.id)} onWish={() => onWish(product)} onAdd={() => onAdd(product)} />)}</div></div></section></main>;
}

function AboutPage() {
  return <main><section className="section"><div className="container-wide story-grid"><div className="story-art"><span className="eyebrow" style={{ color:'var(--sunflower)', position:'absolute', top:27, left:35 }}>A small shop with a big wall</span></div><div className="story-copy"><span className="eyebrow">About Sally's</span><h1 className="display">We think art should leave the frame.</h1><p>Shop at Sally's began as a shelf of postcards and a question: what if a masterpiece could be the thing you reach for every morning?</p><p>From our little studio in Algiers, we build small collections around the works that keep us company. A mug, a bookmark, a tote, a puzzle: not souvenirs, but useful objects with a memory inside them.</p><p>Everything is chosen to feel like it belongs to one curious, colourful home.</p><Link className="btn btn-primary" href="/shop">Visit the object library <ArrowRight size={15} /></Link></div></div></section><section className="section soft-section"><div className="container-wide"><div className="section-head"><div><span className="eyebrow">The Sally's way</span><h2 className="section-title display">Look closely.<br />Use generously.</h2></div></div><div className="values-grid"><div className="value-card"><Sparkles size={20} color="var(--ochre)" /><h3>Curated, never crowded.</h3><p>Every object earns its place. We would rather add one good thing than ten forgettable ones.</p></div><div className="value-card"><Package size={20} color="var(--ochre)" /><h3>Made for real life.</h3><p>Paper that can take a busy bag. Canvas that likes a little weather. Ceramics meant for daily use.</p></div><div className="value-card"><MapPin size={20} color="var(--ochre)" /><h3>From Algiers, with care.</h3><p>We pack each order by hand and deliver across Algeria in 7–10 days, with payment on delivery.</p></div></div></div></section></main>;
}

function ContactPage() {
  const [sent, setSent] = useState(false);
  return <main><section className="page-hero"><div className="container-wide"><span className="eyebrow">Come say hello</span><h1 className="display">Let's talk<br />objects.</h1><p>Questions about an order, a gift, or the perfect notebook? Our studio is listening.</p></div></section><section className="section"><div className="container-wide contact-grid"><div className="form-card">{sent ? <div className="empty-state" style={{ padding:'35px 15px', border:0 }}><div className="confirmation-mark"><Check /></div><h2>Message received.</h2><p>We will write back from the studio soon.</p><button className="btn btn-quiet" onClick={() => setSent(false)} data-testid="button-send-another">Send another note</button></div> : <form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><h2>Send a note</h2><div className="field"><label htmlFor="contact-name">Your name</label><input id="contact-name" required placeholder="Amina" data-testid="input-contact-name" /></div><div className="field"><label htmlFor="contact-email">Email address</label><input id="contact-email" type="email" required placeholder="hello@example.com" data-testid="input-contact-email" /></div><div className="field"><label htmlFor="contact-message">Your message</label><textarea id="contact-message" required placeholder="Tell us what is on your mind..." data-testid="input-contact-message" /></div><button type="submit" className="btn btn-primary" data-testid="button-contact-submit">Send to the studio <ArrowRight size={15} /></button></form>}</div><div className="info-stack"><div className="info-block"><MapPin size={18} color="var(--ochre)" /><h3>Find us in Algiers</h3><p>Our online shelves are always open. The studio is tucked away in Algiers, Algeria.</p></div><div className="info-block"><Truck size={18} color="var(--ochre)" /><h3>Delivery, simply</h3><p>Orders arrive in 7–10 days across Algeria. Payment on delivery. If it is a gift, tell us and we will wrap it with care.</p></div><div className="info-block"><Instagram size={18} color="var(--ochre)" /><h3>@shopatsallys</h3><p>New collections, studio notes, and the occasional beautiful desk. Find us on Instagram.</p></div><div className="info-block"><Mail size={18} color="var(--ochre)" /><h3>hello@shopatsallys.dz</h3><p>We usually reply within one working day.</p></div></div></div></section></main>;
}

function CartPage({ cart, onChange, onRemove }: { cart: CartLine[]; onChange: (id: string, quantity: number) => void; onRemove: (id: string) => void }) {
  const { products, collections } = useCatalog();
  const total = cart.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.price ?? 0) * line.quantity, 0);
  if (!cart.length) return <main className="section container-wide"><EmptyState title="Your bag is a quiet place." text="Add a few useful, beautiful things and they will wait here for you." action="Browse the shop" /></main>;
  return <main><section className="page-hero"><div className="container-wide"><span className="eyebrow">Your selection</span><h1 className="display">The bag.</h1></div></section><section className="section"><div className="container-wide cart-layout"><div className="cart-list">{cart.map((line) => { const product = products.find((item) => item.id === line.productId); if (!product) return null; return <div className="cart-item" key={line.productId}><ProductThumbnail product={product} /><div><h3>{product.name}</h3><p>{money(product.price)} · {collections[product.collection]?.name ?? product.collection}</p></div><div className="cart-controls"><QuantityControl quantity={line.quantity} onChange={(quantity) => onChange(line.productId, quantity)} testId={`cart-quantity-${line.productId}`} /><button className="icon-btn" onClick={() => onRemove(line.productId)} aria-label={`Remove ${product.name}`} data-testid={`button-remove-${product.id}`}><X size={17} /></button></div></div>; })}</div><OrderSummary total={total} /></div></section></main>;
}

function OrderSummary({ total, checkout = false }: { total: number; checkout?: boolean }) {
  return <div className="cart-summary"><h2>{checkout ? 'Your order' : 'A good selection.'}</h2><div className="summary-row"><span>Objects</span><span>{money(total)}</span></div><div className="summary-row"><span>Delivery</span><span>{total >= 5000 ? 'Free' : 'Calculated at delivery'}</span></div><div className="summary-row total"><span>Total</span><span>{money(total)}</span></div>{!checkout && <Link className="btn btn-secondary" href="/checkout" data-testid="button-go-checkout">Continue to checkout <ArrowRight size={15} /></Link>}</div>;
}

function CheckoutPage({ cart, onSubmitOrder }: { cart: CartLine[]; onSubmitOrder: (details: Omit<PlaceOrderRequest, 'cart_id'>) => Promise<Order> }) {
  const [placed, setPlaced] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { products } = useCatalog();
  const total = cart.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.price ?? 0) * line.quantity, 0);
  if (placed) return <main className="section container-wide"><div className="confirmation"><div className="confirmation-mark"><Check size={32} /></div><span className="eyebrow">Order confirmed</span><h1>Something lovely is on its way.</h1><p>Thank you for shopping with Sally's. We will call to confirm your order before it leaves Algiers, and it should arrive in 7–10 days.</p><p className="mono" style={{ fontSize:'.75rem', color:'var(--cobalt)' }} data-testid="order-reference">ORDER {placed.reference} · PAYMENT ON DELIVERY · {money(placed.total_da)}</p><Link href="/shop" className="btn btn-primary">Keep looking <ArrowRight size={15} /></Link></div></main>;
  if (!cart.length) return <main className="section container-wide"><EmptyState title="Your checkout is waiting." text="There is nothing in your bag yet." action="Browse the shop" /></main>;
  return <main><section className="page-hero"><div className="container-wide"><span className="eyebrow">Almost yours</span><h1 className="display">Checkout.</h1><p>Just the essentials. We will call before delivery and collect payment at your door.</p></div></section><section className="section"><div className="container-wide checkout-grid"><div className="form-card"><form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; if (!form.checkValidity() || submitting) return; const data = new FormData(form); setError(null); setSubmitting(true); try { const order = await onSubmitOrder({ contact_name: String(data.get('checkout-name') ?? ''), contact_phone: String(data.get('checkout-phone') ?? ''), shipping_address: String(data.get('checkout-address') ?? ''), customer_note: String(data.get('checkout-note') ?? '') || undefined }); setPlaced(order); } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'); } finally { setSubmitting(false); } }}><h2>Delivery details</h2><div className="field"><label htmlFor="checkout-name">Full name</label><input id="checkout-name" name="checkout-name" required placeholder="Amina Belkacem" data-testid="input-checkout-name" /></div><div className="field"><label htmlFor="checkout-phone">Phone number</label><input id="checkout-phone" name="checkout-phone" type="tel" required placeholder="05 50 00 00 00" data-testid="input-checkout-phone" /></div><div className="field"><label htmlFor="checkout-address">Delivery address</label><textarea id="checkout-address" name="checkout-address" required placeholder="Street, neighbourhood, city" data-testid="input-checkout-address" /></div><div className="field"><label htmlFor="checkout-note">Note for the studio (optional)</label><input id="checkout-note" name="checkout-note" placeholder="This is a gift..." data-testid="input-checkout-note" /></div><div style={{ border:'1px solid var(--border)', padding:15, display:'flex', gap:11, alignItems:'start', marginBottom:22 }}><ShieldCheck size={19} color="var(--olive)" /><div><strong style={{ color:'var(--midnight)', fontSize:'.86rem' }}>Payment on delivery</strong><p style={{ margin:'4px 0 0', color:'var(--ink)', fontSize:'.78rem' }}>No card details needed. Pay in cash when your parcel arrives.</p></div></div>{error && <div className="field" role="alert" data-testid="checkout-error"><p style={{ color:'var(--ochre)', margin:0, fontSize:'.82rem' }}>{error}</p></div>}<button className="btn btn-primary" type="submit" disabled={submitting} data-testid="button-place-order">{submitting ? 'Placing your order…' : <>Place order · {money(total)} <ArrowRight size={15} /></>}</button></form></div><OrderSummary total={total} checkout /></div></section></main>;
}

function WishlistPage({ wishlist, onWish, onAdd }: { wishlist: string[]; onWish: (product: Product) => void; onAdd: (product: Product) => void }) {
  const { products } = useCatalog();
  const saved = products.filter((product) => wishlist.includes(product.id));
  return <main><section className="page-hero"><div className="container-wide"><span className="eyebrow">Kept for later</span><h1 className="display">Your saved shelf.</h1><p>A place for the objects that made you pause.</p></div></section><section className="section"><div className="container-wide">{saved.length ? <div className="product-grid">{saved.map((product) => <ProductCard key={product.id} product={product} wished onWish={() => onWish(product)} onAdd={() => onAdd(product)} />)}</div> : <EmptyState title="Nothing saved yet." text="When something catches your eye, tap the heart and it will stay here." action="Find a piece" />}</div></section></main>;
}

function AccountPage() {
  return <main><section className="section"><div className="container-wide"><div className="account-head"><div><span className="eyebrow">Your corner of the shop</span><h1 className="display">Hello, Amina.</h1></div><Link className="btn btn-quiet" href="/shop">Continue browsing <ArrowRight size={15} /></Link></div><div className="account-grid"><div className="profile-card"><div className="profile-mark">A</div><h2>Amina Belkacem</h2><p className="body-copy" style={{ fontSize:'.88rem' }}>amina.belkacem@example.com</p><div className="info-block" style={{ marginTop:24 }}><h3>Delivery note</h3><p>Algiers, Algeria<br />Payment on delivery</p></div><button className="btn btn-quiet" style={{ marginTop:22 }} onClick={() => alert('Profile editing is ready for the next chapter.')} data-testid="button-edit-profile">Edit profile</button></div><div className="orders-card"><h2>Order history</h2><div className="order-row"><div><strong>SS-0428</strong><div style={{ color:'var(--ink)', marginTop:5 }}>2 objects · 18 April 2024</div></div><div style={{ textAlign:'right' }}><span className="status">Delivered</span><div className="mono" style={{ marginTop:8, fontSize:'.73rem' }}>4,250 DA</div></div></div><div className="order-row"><div><strong>SS-0316</strong><div style={{ color:'var(--ink)', marginTop:5 }}>1 object · 02 March 2024</div></div><div style={{ textAlign:'right' }}><span className="status">Delivered</span><div className="mono" style={{ marginTop:8, fontSize:'.73rem' }}>2,400 DA</div></div></div><div className="order-row"><div><strong>SS-0189</strong><div style={{ color:'var(--ink)', marginTop:5 }}>3 objects · 14 January 2024</div></div><div style={{ textAlign:'right' }}><span className="status">Delivered</span><div className="mono" style={{ marginTop:8, fontSize:'.73rem' }}>5,100 DA</div></div></div></div></div></div></section></main>;
}

function CartDrawer({ cart, open, onClose, onChange, onRemove }: { cart: CartLine[]; open: boolean; onClose: () => void; onChange: (id: string, quantity: number) => void; onRemove: (id: string) => void }) {
  const { products, collections } = useCatalog();
  if (!open) return null;
  const total = cart.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.price ?? 0) * line.quantity, 0);
  return <div style={{ position:'fixed', inset:0, zIndex:35, background:'rgba(31,58,95,.36)' }} onClick={onClose}><aside onClick={(event) => event.stopPropagation()} style={{ marginLeft:'auto', height:'100%', width:'min(440px,100%)', background:'var(--cream)', padding:'24px', overflowY:'auto', boxShadow:'-15px 0 35px rgba(31,58,95,.17)' }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border)', paddingBottom:17, marginBottom:20 }}><h2 className="display" style={{ color:'var(--midnight)', fontSize:'2rem', margin:0 }}>Your bag</h2><button className="icon-btn" onClick={onClose} aria-label="Close bag" data-testid="button-close-cart"><X /></button></div>{cart.length ? <><div className="cart-list">{cart.map((line) => { const product = products.find((item) => item.id === line.productId); if (!product) return null; return <div className="cart-item" key={line.productId}><ProductThumbnail product={product} /><div><h3 style={{ fontSize:'1rem' }}>{product.name}</h3><p>{money(product.price)}</p></div><div className="cart-controls"><QuantityControl quantity={line.quantity} onChange={(quantity) => onChange(line.productId, quantity)} testId={`drawer-quantity-${product.id}`} /><button className="icon-btn" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.name}`}><X size={15} /></button></div></div>; })}</div><div style={{ marginTop:28 }}><div className="summary-row total"><span>Total</span><span>{money(total)}</span></div><Link href="/checkout" className="btn btn-primary" style={{ width:'100%', marginTop:15 }} onClick={onClose} data-testid="button-drawer-checkout">Checkout <ArrowRight size={15} /></Link><Link href="/cart" className="btn btn-quiet" style={{ width:'100%', marginTop:9 }} onClick={onClose}>View bag</Link></div></> : <EmptyState title="A quiet bag." text="Add something beautiful and useful from the shop." action="Browse objects" />}</aside></div>;
}

function AppShell() {
  // Phase 5: the bag lives in the api-server; the browser only holds the
  // cart uuid (localStorage). Components still receive plain CartLine[] so
  // the UI is unchanged — only where the data comes from is different.
  const [cartId, setCartId] = useState<string | null>(() => readStoredCartId());
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [location] = useLocation();
  const { isLoading, isError, refetch } = useCatalog();
  const cartQuery = useGetCart(cartId ?? '', {
    query: { queryKey: getGetCartQueryKey(cartId ?? ''), enabled: Boolean(cartId), retry: false },
  });
  // A stored id that no longer exists server-side reads as an empty bag;
  // the next add creates a fresh cart.
  const cartMissing = cartQuery.error instanceof ApiError && cartQuery.error.status === 404;
  const cart: CartLine[] = cartMissing
    ? []
    : (cartQuery.data?.items.map((line) => ({ productId: line.product_id, quantity: line.quantity })) ?? []);
  if (isLoading || isError) {
    return (
      <div className="app-shell paper-noise" role={isError ? 'alert' : 'status'}>
        <Header cart={cart} wishlist={wishlist} onCart={() => setDrawerOpen(true)} />
        <main className="section container-wide" style={{ minHeight: '45vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          {isError ? (
            <div className="empty-state" data-testid="catalog-error">
              <h2>The shelves didn't load.</h2>
              <p>We couldn't reach the catalog from Supabase. Check the connection and try again.</p>
              <button className="btn btn-primary" onClick={() => refetch()}>Try again</button>
            </div>
          ) : (
            <p className="mono" data-testid="catalog-loading">Opening the shop…</p>
          )}
        </main>
      </div>
    );
  }
  const addToast = (message: string) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  };
  const syncCart = (fresh: ServerCart) => {
    queryClient.setQueryData(getGetCartQueryKey(fresh.id), fresh);
  };
  const ensureCartId = async (): Promise<string> => {
    if (cartId && !cartMissing) return cartId;
    const id = await createServerCart();
    setCartId(id);
    return id;
  };
  const addToCart = async (product: Product, quantity = 1) => {
    try {
      const id = await ensureCartId();
      syncCart(await addCartItem(id, { product_id: product.id, quantity }));
      addToast(`${product.name} added to your bag.`);
    } catch (error) {
      addToast(`Couldn't add ${product.name}: ${error instanceof Error ? error.message : 'please try again'}`);
    }
  };
  const toggleWishlist = (product: Product) => {
    setWishlist((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id]);
    addToast(wishlist.includes(product.id) ? `${product.name} removed from saved pieces.` : `${product.name} saved for later.`);
  };
  const updateCart = async (id: string, quantity: number) => {
    if (!cartId || cartMissing) return;
    try {
      syncCart(await updateCartItem(cartId, id, { quantity }));
    } catch (error) {
      addToast(`Couldn't update your bag: ${error instanceof Error ? error.message : 'please try again'}`);
    }
  };
  const removeCart = async (id: string) => {
    if (!cartId || cartMissing) return;
    try {
      syncCart(await removeCartItem(cartId, id));
    } catch (error) {
      addToast(`Couldn't update your bag: ${error instanceof Error ? error.message : 'please try again'}`);
    }
  };
  // Checkout: the server recomputes totals from live prices, snapshots the
  // order and empties the bag; the returned Order drives the confirmation.
  const submitOrder = async (details: Omit<PlaceOrderRequest, 'cart_id'>): Promise<Order> => {
    if (!cartId || cartMissing) throw new Error('Your bag is empty.');
    try {
      const order = await placeOrder({ ...details, cart_id: cartId });
      queryClient.setQueryData(getGetCartQueryKey(cartId), { id: cartId, items: [], item_count: 0, subtotal_da: 0 } satisfies ServerCart);
      return order;
    } catch (error) {
      // 409: some lines left the catalog — drop them so the next attempt is clean.
      if (error instanceof ApiError && error.status === 409) {
        const ids = (error.data as { product_ids?: string[] } | null)?.product_ids ?? [];
        await Promise.all(ids.map((productId) => removeCartItem(cartId, productId).then(syncCart).catch(() => undefined)));
      }
      throw error;
    }
  };
  return <div className="app-shell paper-noise"><Header cart={cart} wishlist={wishlist} onCart={() => setDrawerOpen(true)} /><div className="entrance" key={location}>{/* Routes pass elements (not inline `component` arrows) so page components keep a stable type across AppShell re-renders — React Query cart updates would otherwise remount the page and wipe local state (e.g. the placed-order confirmation). */}<Switch><Route path="/"><HomePage onAdd={addToCart} wishlist={wishlist} onWish={toggleWishlist} /></Route><Route path="/shop"><ShopPage onAdd={addToCart} wishlist={wishlist} onWish={toggleWishlist} /></Route><Route path="/product/:id"><ProductPage onAdd={addToCart} wishlist={wishlist} onWish={toggleWishlist} /></Route><Route path="/collection/:slug"><CollectionPage onAdd={addToCart} wishlist={wishlist} onWish={toggleWishlist} /></Route><Route path="/about"><AboutPage /></Route><Route path="/contact"><ContactPage /></Route><Route path="/wishlist"><WishlistPage wishlist={wishlist} onWish={toggleWishlist} onAdd={addToCart} /></Route><Route path="/account"><AccountPage /></Route><Route path="/cart"><CartPage cart={cart} onChange={updateCart} onRemove={removeCart} /></Route><Route path="/checkout"><CheckoutPage cart={cart} onSubmitOrder={submitOrder} /></Route><Route><NotFound /></Route></Switch></div><Footer /><CartDrawer cart={cart} open={drawerOpen} onClose={() => setDrawerOpen(false)} onChange={updateCart} onRemove={removeCart} /><ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} /></div>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary resetKey={useLocation}><AppShell /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;