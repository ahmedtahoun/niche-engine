'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { placeOrder, type CheckoutForm as Form } from '@/app/actions';
import { writeCart } from './cart-store';
import { Summary, useQuote } from './CartView';

export interface Me { name: string; phone: string; governorate: string; area: string; address: string; landmark: string }

export interface WalletView { balance: number; nextExpiry: { amount: number; at: string } | null }

export function CheckoutForm({ niche, governorates, initialPromo, openBeforePay, depositAbove, deposit, eta, me, wallet }: {
  niche: string; governorates: string[]; initialPromo: string; openBeforePay: boolean; depositAbove: number; deposit: number; eta: Record<string, string>; me: Me | null; wallet: WalletView | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>({ phone: me?.phone ?? '', name: me?.name ?? '', governorate: me?.governorate || 'القاهرة', area: me?.area ?? '', address: me?.address ?? '', landmark: me?.landmark ?? '', payment: 'cod', promoCode: initialPromo, password: '', useWallet: Boolean(wallet && wallet.balance > 0) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const { lines, ready, q } = useQuote(niche, form.promoCode, form.useWallet);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  if (ready && !lines.length) return <div className="box" style={{ textAlign: 'center' }}><b>السلة فاضية</b><Link className="btn primary" href={`/${niche}`}>ابدأ تسوق</Link></div>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await placeOrder(niche, lines, form);
      if (r.ok) {
        writeCart(niche, []);
        router.push(`/${niche}/order/${r.id}`);
      } else setErrors(r.errors as Record<string, string>);
    });
  };
  const err = (k: string) => errors[k] && <span className="ferr" id={`${k}-err`}>{errors[k]}</span>;
  const inv = (k: string) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `${k}-err` : undefined });

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }} noValidate>
      <div><h1 className="title">خطوة واحدة وتخلص</h1><p className="muted" style={{ margin: '4px 0 0' }}>{me ? `أهلاً ${me.name.split(' ')[0]}، بياناتك محفوظة.` : 'حسابك بيتعمل مع أول طلب، وبياناتك بتتحفظ للمرة الجاية.'}</p></div>
      <label className="field">رقم الموبايل<input value={form.phone} onChange={set('phone')} readOnly={Boolean(me)} inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'right' }} placeholder="01xxxxxxxxx" {...inv('phone')} />{err('phone')}</label>
      {!me && (
        <label className="field">كلمة السر
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" {...inv('password')} />
          <span className="muted small">أول مرة؟ اختار كلمة سر 6 حروف أو أرقام على الأقل. عندك حساب؟ اكتب كلمة السر بتاعتك.</span>
          {err('password')}
        </label>
      )}
      <label className="field">الاسم<input value={form.name} onChange={set('name')} autoComplete="name" {...inv('name')} />{err('name')}</label>
      <div className="two">
        <label className="field">المحافظة<select value={form.governorate} onChange={set('governorate')}>{governorates.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label className="field">المنطقة<input value={form.area} onChange={set('area')} {...inv('area')} />{err('area')}</label>
      </div>
      <label className="field">الشارع ورقم العمارة<input value={form.address} onChange={set('address')} autoComplete="street-address" {...inv('address')} />{err('address')}</label>
      <label className="field">علامة مميزة (اختياري، بتساعد المندوب)<input value={form.landmark} onChange={set('landmark')} placeholder="مثلاً: جنب صيدلية …" /></label>
      <div className="note info">يوصلك <b>{eta[form.governorate]}</b>، والمندوب هيكلمك قبل ما يوصل.</div>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend className="h4">الدفع</legend>
        <label className="radio"><input type="radio" name="pay" checked={form.payment === 'cod'} onChange={() => setForm({ ...form, payment: 'cod' })} /><div><b>كاش عند الاستلام</b><span className="muted">{openBeforePay ? 'افتح الشحنة وشوفها قبل ما تدفع' : 'ادفع للمندوب'}</span></div></label>
        <label className="radio"><input type="radio" name="pay" checked={form.payment === 'instapay'} onChange={() => setForm({ ...form, payment: 'instapay' })} /><div><b>إنستاباي / محفظة موبايل</b><span className="muted">ادفع دلوقتي بعد تأكيد الطلب</span></div></label>
      </fieldset>
      {q?.depositRequired && form.payment === 'cod' && <div className="note warn">علشان الطلب فوق {depositAbove.toLocaleString('en-US')} ج، بنطلب مصاريف الشحن بس مقدماً ({deposit} ج) على إنستاباي، وبتتخصم من الإجمالي. لو الطلب اتأخر أو مش مطابق بترجعلك كاملة.</div>}
      {wallet && wallet.balance > 0 && (
        <label className="radio" style={{ alignItems: 'center' }}>
          <input type="checkbox" checked={form.useWallet} onChange={(e) => setForm({ ...form, useWallet: e.target.checked })} />
          <div><b>استخدم رصيد محفظتك ({wallet.balance.toLocaleString('en-US')} ج)</b><span className="muted">{wallet.nextExpiry ? `${wallet.nextExpiry.amount.toLocaleString('en-US')} ج منه بينتهي ${new Date(wallet.nextExpiry.at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' })} · ` : ''}الرصيد مبيدفعش الشحن</span></div>
        </label>
      )}
      {q && <Summary q={q} />}
      {err('cart')}
      <p className="muted" style={{ margin: 0 }}>بياناتك بتتبعت لشركة الشحن والبائع للتوصيل بس، وممنوع استخدامها في أي حاجة تانية.</p>
      <button className="btn primary block" type="submit" disabled={pending || !q}>{pending ? 'جاري الطلب…' : `اطلب · ${q ? Math.round(q.total).toLocaleString('en-US') + ' ج' : ''}`}</button>
    </form>
  );
}
