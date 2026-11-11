import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BundleArt } from '@/components/Art';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { bundleView, search } from '@/lib/catalog';
import { egp } from '@/lib/eta';
import { getNiche } from '@/lib/niches';

const HERO_EYEBROW: Record<string, string> = { umrah: 'موسم عمرة رمضان 2027', coffee: 'كل شهر 3 محامص جديدة' };
const SECTION: Record<string, string> = { umrah: 'الأكثر طلباً قبل رمضان', coffee: 'الأكثر طلباً الأسبوع ده' };

export default async function Home({ params }: { params: Promise<{ niche: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const hero = bundleView(cfg, cfg.bundles[0].id);
  const products = search(cfg, { sort: 'best' });
  return (
    <main className="page">
      {hero && (
        <section className="hero">
          <div className="art"><BundleArt parts={hero.parts.map((p) => p.product)} /></div>
          <div>
            <span className="small" style={{ opacity: 0.85 }}>{HERO_EYEBROW[cfg.id]}</span>
            <h2>{hero.bundle.nameAr}</h2>
            <p>{hero.parts.map((p) => p.product.nameAr.split(' — ')[0]).join(' + ')}</p>
            <div className="price num"><b>{egp(hero.price)}</b><s>{egp(hero.fullPrice)}</s></div>
            <Link className="btn" href={`/${cfg.id}/b/${hero.bundle.id}`} style={{ marginTop: 8 }}>شوف التفاصيل</Link>
          </div>
        </section>
      )}
      <div className="how">
        <div><b>1. اطلب</b>من غير حساب، في دقيقة</div>
        <div><b>2. أكد على واتساب</b>ضغطة واحدة</div>
        <div><b>3. استلم في 2–4 أيام</b>والدفع كاش عند الباب</div>
      </div>
      <nav className="chips" aria-label="الأقسام">
        {cfg.categories.map((c) => <Link key={c.id} className="chip" href={`/${cfg.id}/search?cat=${c.id}`}>{c.labelAr}</Link>)}
      </nav>
      <h2 className="sec">{SECTION[cfg.id]}</h2>
      <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      <Footer cfg={cfg} />
    </main>
  );
}
