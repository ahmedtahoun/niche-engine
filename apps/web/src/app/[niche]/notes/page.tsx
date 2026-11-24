// /notes: the tasting-notes dictionary (قاموس نكهات القهوة). Every note on our bags: what it means,
// when you notice it, a familiar taste, and the coffees that have it; plus how to taste like a pro.
// Written to answer "what does apricot / floral mean in coffee?" for Google and AI answer engines.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { FAMILY, NOTES, noteInfo, type NoteFamily } from '@/lib/notes';
import { jsonLd, pageMeta, siteUrl } from '@/lib/site';

type P = { params: Promise<{ niche: string }> };

const TITLE = { ar: 'قاموس نكهات القهوة: يعني إيه مشمش أو زهر البرتقال في القهوة؟', en: 'Coffee tasting notes explained: what does apricot or orange blossom mean in coffee?' };
const DESC = { ar: 'كل نكهة مكتوبة على أكياس القهوة المختصة يعني إيه، وتحس بيها إمتى، وطعمها شبه إيه، وأنهي قهوة فيها.', en: 'What each tasting note on a specialty coffee bag means, when you notice it, what it is like, and which coffees have it.' };
const STEPS = [
  { ar: 'شمّ البن وهو مطحون: الزهور والمكسرات بتبان في الريحة الأول.', en: 'Smell the fresh grounds: floral and nutty notes show in the aroma first.' },
  { ar: 'اشرب بقة صغيرة وهي سخنة: هتحس بالشوكولاتة والقوام.', en: 'Take a small sip while hot: you will feel chocolate and body.' },
  { ar: 'استنى 5 دقايق وهي بتبرد: الفواكه والموالح بتبان أكتر.', en: 'Wait 5 minutes as it cools: fruit and citrus come forward.' },
  { ar: 'بعد ما تبلع، ركّز في آخر البقة: الكراميل والمكسرات والشاي بيفضلوا.', en: 'After you swallow, notice the finish: caramel, nuts and tea linger.' },
];

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const cfg = getNiche((await params).niche);
  if (!cfg) return {};
  const s = await speaker(cfg);
  return pageMeta(cfg, s.lang, '/notes', { title: s.en ? TITLE.en : TITLE.ar, description: s.en ? DESC.en : DESC.ar, type: 'article' });
}

export default async function NotesPage({ params }: P) {
  const cfg = getNiche((await params).niche);
  if (!cfg || !cfg.tasteFamilies) notFound();
  const s = await speaker(cfg);
  const L = (x: { ar: string; en: string }) => (s.en ? x.en : x.ar);
  const products = (await catalog()).search(cfg, { sort: 'best' });
  const withNote = (id: string) => products.filter((p) => (p.profile?.notes ?? []).some((n) => noteInfo(n)?.id === id));
  const families = (Object.keys(FAMILY) as NoteFamily[]).map((f) => ({ f, notes: NOTES.filter((n) => n.family === f) })).filter((x) => x.notes.length);
  const url = siteUrl(cfg, '/notes', s.lang);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: L(TITLE), url, inLanguage: s.lang,
      hasDefinedTerm: NOTES.map((n) => ({ '@type': 'DefinedTerm', name: L(n.name), description: `${L(n.what)} ${L(n.like)}` })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: s.lang, mainEntity: [
      { q: { ar: 'هي النكهات دي مضافة للقهوة؟', en: 'Are tasting notes added flavours?' }, a: { ar: 'لأ. النكهات وصف لطعم البن نفسه حسب المنشأ وطريقة المعالجة والتحميص. القهوة المختصة مفيهاش أي إضافات.', en: 'No. Notes describe how the coffee itself tastes, from its origin, processing and roast. Specialty coffee has nothing added.' } },
      { q: { ar: 'ليه مش بحس بالنكهات المكتوبة؟', en: 'Why can’t I taste the notes on the bag?' }, a: { ar: 'جرّب تشرب القهوة سادة وهي دافية مش بتغلي، وركّز وهي بتبرد. الفواكه بتبان أكتر في الـ V60، والشوكولاتة في الاسبريسو والكنكة.', en: 'Drink it black and warm rather than very hot, and notice it as it cools. Fruit shows more in a V60, chocolate in espresso and the kanaka.' } },
    ].map((x) => ({ '@type': 'Question', name: L(x.q), acceptedAnswer: { '@type': 'Answer', text: L(x.a) } })) },
  ];
  return (
    <main className="page narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <article className="article">
        <Link className="small muted" href={s.href('/guide')}>{s.t('guides')}</Link>
        <h1 className="title" style={{ margin: 0 }}>{L(TITLE)}</h1>
        <div className="short"><b>{s.t('inShort')}</b>{s.en
          ? 'Tasting notes describe how a coffee naturally tastes (nothing is added). Fruit and citrus show as the cup cools; chocolate and nuts while it is hot and in the finish.'
          : 'النكهات وصف لطعم القهوة الطبيعي (مفيش حاجة مضافة). الفواكه والموالح بتبان لما الكوباية تبرد شوية، والشوكولاتة والمكسرات وهي سخنة وفي آخر البقة.'}</div>
        <section>
          <h2>{s.en ? 'Taste like a pro in 4 steps' : 'دوّق زي المحترفين في 4 خطوات'}</h2>
          <ol className="notes-steps">{STEPS.map((x) => <li key={x.en}>{L(x)}</li>)}</ol>
        </section>
        {families.map(({ f, notes }) => (
          <section key={f}>
            <h2>{FAMILY[f].emoji} {L(FAMILY[f])}</h2>
            <div className="note-cards">
              {notes.map((n) => {
                const ps = withNote(n.id);
                return (
                  <div key={n.id} className="note-card" id={n.id}>
                    <b><span aria-hidden="true">{n.emoji}</span> {L(n.name)}</b>
                    <p>{L(n.what)}</p>
                    <p className="small"><span className="muted">{s.t('nd.when')} </span>{L(n.when)}</p>
                    <p className="small"><span className="muted">{s.t('nd.like')} </span>{L(n.like)}</p>
                    {ps.length > 0 && <div className="note-in">{ps.map((p) => <Link key={p.id} href={s.href(`/p/${p.slug}`)}>{s.product(p)}</Link>)}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
