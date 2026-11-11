import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BundleArt } from '@/components/Art';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { catalog } from '@/lib/catalog';
import { egp } from '@/lib/eta';
import { getNiche } from '@/lib/niches';

const HERO_EYEBROW: Record<string, string> = { umrah: 'موسم عمرة رمضان 2027', coffee: 'كل شهر 3 محامص جديدة' };
const SECTION: Record<string, string> = { umrah: 'الأكثر طلباً قبل رمضان', coffee: 'الأكثر طلباً الأسبوع ده' };

export default async function Home({ params }: { params: Promise<{ niche: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const cat = await catalog();
  const hero = cfg.bundles[0] ? cat.bundleView(cfg, cfg.bundles[0].id) : null;
  const products = cat.search(cfg, { sort: 'best' });
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
        <div><b>1. اطلب في دقيقة</b>وحسابك بيتعمل برقم موبايلك</div>
        <div><b>2. يوصلك تأكيد</b>رسالة من بوسطة فيها رقم التتبع</div>
        <div><b>3. استلم في 2–4 أيام</b>والدفع كاش عند الباب</div>
      </div>
      {products.length ? (
        <>
          <nav className="chips" aria-label="الأقسام">
            {cfg.categories.map((c) => <Link key={c.id} className="chip" href={`/${cfg.id}/search?cat=${c.id}`}>{c.labelAr}</Link>)}
          </nav>
          <h2 className="sec">{SECTION[cfg.id]}</h2>
          <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} seller={cat.sellerOf(p)} />)}</div>
        </>
      ) : (
        <section className="box soon">
          <b>{cfg.brand.nameAr} بتفتح قريب</b>
          <span className="muted">بنجهز أول مجموعة من أحسن البائعين في مصر. ارجعولنا قريب، أو تابعونا عشان تعرفوا أول ما نفتح.</span>
          <div className="chips" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {cfg.categories.map((c) => <span key={c.id} className="chip">{c.labelAr}</span>)}
          </div>
        </section>
      )}
      <Footer cfg={cfg} />
    </main>
  );
}
