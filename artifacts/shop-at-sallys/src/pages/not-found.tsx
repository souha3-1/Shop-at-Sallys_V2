import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="section container-wide" style={{ minHeight: '60vh', display:'grid', placeItems:'center' }}>
      <div className="empty-state" style={{ maxWidth: 560, width:'100%' }}>
        <Compass size={36} />
        <span className="eyebrow">A missing page</span>
        <h2>That shelf is empty.</h2>
        <p>We could not find the page you were looking for. The good news: there are plenty of other things to discover.</p>
        <Link href="/" className="btn btn-primary"><ArrowLeft size={15} /> Return home</Link>
      </div>
    </div>
  );
}
