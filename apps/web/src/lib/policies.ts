// Privacy, shipping and terms pages of a coffee store (returnsPolicy "coffee": Cairo Roast). Numbers come from
// the store's settings (delivery fee, free-delivery line, deposit, cashback), so the pages follow any change.
// Every statement here matches what the site does (see lib/traffic.ts, lib/abandoned.ts, lib/blocklist.ts,
// lib/eta.ts, components/CheckoutForm.tsx); change them together.
import type { NicheConfig } from '@niche-engine/core';
import type { Lang } from './i18n.ts';

export type PolicySection = { id?: string; h: string; items?: string[]; text?: string };
export type Policy = { title: string; updated: string; lead: string; sections: PolicySection[] };
export type PolicyKind = 'privacy' | 'shipping' | 'terms';

export const hasPolicyPages = (cfg: NicheConfig) => cfg.returnsPolicy === 'coffee';

const egp = (n: number, en: boolean) => (en ? `EGP ${n.toLocaleString('en-US')}` : `${n.toLocaleString('en-US')} ج`);
const phone = (w: string) => w.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3');

export function policy(kind: PolicyKind, cfg: NicheConfig, lang: Lang): Policy {
  const en = lang === 'en';
  const q = en ? '?lang=en' : '';
  const v = {
    brand: en ? cfg.brand.nameEn : cfg.brand.nameAr,
    fee: egp(cfg.shippingEgp, en),
    free: cfg.freeShippingOverEgp ? egp(cfg.freeShippingOverEgp, en) : '',
    above: egp(cfg.risk.depositAboveEgp, en),
    deposit: egp(cfg.risk.depositEgp, en),
    cash: Math.round(cfg.wallet.cashback * 100),
    days: cfg.wallet.expiresDays,
    wa: cfg.brand.whatsapp ? phone(cfg.brand.whatsapp) : '',
    returns: `/returns${q}`, shipping: `/shipping${q}`, privacy: `/privacy${q}`, terms: `/terms${q}`,
  };
  const make = en ? EN : AR;
  return make[kind](v);
}

type V = { brand: string; fee: string; free: string; above: string; deposit: string; cash: number; days: number; wa: string; returns: string; shipping: string; privacy: string; terms: string };
const UPDATED_AR = 'آخر تحديث: 19 نوفمبر 2026';
const UPDATED_EN = 'Last updated: 19 November 2026';

const AR: Record<PolicyKind, (v: V) => Policy> = {
  privacy: (v) => ({
    title: 'سياسة الخصوصية',
    updated: UPDATED_AR,
    lead: `بنجمع أقل بيانات ممكنة عشان نوصّلك طلبك ونخدمك، و**مش بنبيع بياناتك لأي حد**. الصفحة دي بتشرح إيه اللي بنجمعه في ${v.brand} وبنعمل بيه إيه.`,
    sections: [
      { h: '1. البيانات اللي بنجمعها', items: [
        '**عند الطلب:** اسمك ورقم موبايلك والمحافظة والمنطقة والعنوان والعلامة المميزة، والمنتجات اللي طلبتها وطريقة الدفع.',
        '**حسابك (لو عملته):** رقم موبايلك وكلمة سر محفوظة بشكل مشفّر، وطلباتك ورصيد محفظتك.',
        '**طلب ما اكتملش:** لو كتبت رقمك في صفحة إتمام الطلب ومكملتش، بنحفظ السلة ورقمك واسمك ومحافظتك، وممكن حد من فريقنا يبعتلك رسالة تذكير واحدة على واتساب.',
        '**زيارات الموقع:** بنعدّ الزيارات من غير كوكيز تتبّع، برمز بيتغير كل يوم ومينفعش يرجع لعنوان IP. وبنعرف مصدر الزيارة (إعلان، إنستجرام…) عشان نقيس إعلاناتنا.',
        '**لو راسلتنا** على واتساب أو ماسنجر أو إنستجرام: الرسائل نفسها. على ماسنجر وإنستجرام ممكن يرد مساعد آلي بالذكاء الاصطناعي (Claude من Anthropic)، وبنشيل أرقام الموبايل والإيميلات من الرسائل قبل ما تتبعتله.',
      ] },
      { h: '2. بنستخدمها في إيه', items: [
        'نجهّز طلبك ونوصّله ونتواصل معاك بخصوصه، وخدمة العملاء.',
        'حسابك ومحفظتك والكاش باك.',
        'نقيس إعلاناتنا ونحسّنها.',
        'نمنع الطلبات الوهمية: الرقم اللي يرفض استلام طلبين ما بيقدرش يطلب تاني من متاجرنا، إلا بعد ما يتواصل معانا على واتساب.',
      ] },
      { h: '3. مين بيشوف بياناتك', items: [
        '**شركة الشحن (بوسطة):** الاسم والرقم والعنوان عشان التوصيل.',
        '**المحمصة اللي بتجهّز طلبك:** تفاصيل الطلب اللي محتاجاها عشان تجهّزه.',
        '**ميتا (فيسبوك وإنستجرام):** عشان نقيس الإعلانات، بنبعت رقمك واسمك الأول ومحافظتك **بشكل مشفّر بس**، وبكسل ميتا موجود على الموقع.',
        '**مزوّدي الخدمة** اللي بيشغّلوا المتجر (الاستضافة وقاعدة البيانات والمساعد الآلي)، وبيستخدموها لحسابنا بس.',
        'مش بنبيع بياناتك ولا بنأجّرها لأي حد.',
      ] },
      { h: '4. الكوكيز والتخزين في المتصفح', text: 'بنستخدم كوكي للغة وكوكي لتسجيل الدخول بس، والسلة واختياراتك بتتحفظ في متصفحك. بكسل ميتا بيستخدم الكوكيز بتاعته لقياس الإعلانات.' },
      { h: '5. مدة الاحتفاظ', text: 'بنحتفظ بالبيانات طول ما هي لازمة للأغراض دي، أو طول المدة اللي القانون يلزمنا بيها (زي سجلات الطلبات والحسابات).' },
      { id: 'delete', h: '6. حقوقك وحذف بياناتك', items: [
        `تقدر تطلب نسخة من بياناتك أو تعديلها أو **حذفها** في أي وقت برسالة على واتساب ${v.wa} من نفس رقمك.`,
        'بنحذفها خلال 30 يوم، ما عدا اللي القانون يلزمنا نحتفظ بيه.',
        'ولو مش عايز رسائل تذكير، ابعتلنا وهنوقفها.',
      ] },
      { h: '7. التواصل', text: `أي سؤال عن خصوصيتك: واتساب ${v.wa}. وراجع كمان [الشروط والأحكام](${v.terms}).` },
    ],
  }),
  shipping: (v) => ({
    title: 'الشحن والتوصيل',
    updated: UPDATED_AR,
    lead: `بنوصّل لكل محافظات مصر مع بوسطة. الشحن **${v.fee}** لأي محافظة${v.free ? `، و**مجاني** للطلبات من ${v.free}` : ''}.`,
    sections: [
      { h: '1. مدة التوصيل', items: [
        'القاهرة والجيزة والقليوبية: غالبًا خلال يومين عمل.',
        'باقي المحافظات: غالبًا خلال 3 أيام عمل (الجمعة مش يوم عمل).',
        'التاريخ المتوقع لمحافظتك بيظهر في صفحة المنتج وقبل تأكيد الطلب، والمندوب بيكلمك قبل ما يوصل.',
      ] },
      { h: '2. الرسوم', items: [
        `الشحن ${v.fee} لأي محافظة، ومفيش أي رسوم تانية.`,
        ...(v.free ? [`مجاني للطلبات من ${v.free} (على قيمة المنتجات قبل كود الخصم).`] : []),
      ] },
      { h: '3. الدفع', items: [
        '**كاش عند الاستلام** للمندوب، أو **إنستاباي / محفظة موبايل** بعد تأكيد الطلب.',
        `الطلبات فوق ${v.above}: بنطلب ${v.deposit} بس مقدمًا على إنستاباي (قد مصاريف الشحن)، وبيتخصم من الإجمالي، وبيرجعلك كامل لو الطلب اتأخر أو مش مطابق.`,
      ] },
      { h: '4. عند الاستلام', items: [
        'افتح الشحنة وشوف الأكياس قبل ما تدفع، **من غير ما تفتح كيس القهوة نفسه**.',
        'الكيس اللي يتفتح عند الاستلام ما ينفعش يترفض ويُدفع تمنه.',
        'القهوة بتوصل في أكياسها المقفولة من المحمصة.',
      ] },
      { h: '5. لو مش هتكون موجود', text: `ابعتلنا على واتساب ${v.wa} قبلها ونرتّب ميعاد تاني. رفض استلام طلبين من غير سبب بيوقف الطلبات على رقمك، إلا بعد ما تتواصل معانا.` },
      { h: '6. الإلغاء والاسترجاع', text: `تقدر تلغي مجانًا قبل الشحن. وللاسترجاع والاستبدال راجع [سياسة الاسترجاع والاستبدال](${v.returns}).` },
    ],
  }),
  terms: (v) => ({
    title: 'الشروط والأحكام',
    updated: UPDATED_AR,
    lead: `${v.brand} متجر قهوة مختصة أونلاين في مصر، بنبيع قهوة من محامص مصرية مختارة. لما تستخدم الموقع أو تطلب منه، بتوافق على الشروط دي وعلى [سياسة الاسترجاع](${v.returns}) و[الشحن](${v.shipping}) و[الخصوصية](${v.privacy}).`,
    sections: [
      { h: '1. الطلبات', items: [
        'طلبك بيتأكد بعد ما نراجعه، وممكن نتواصل معاك لتأكيده.',
        'من حقنا نلغي طلب لو المنتج خلص، أو السعر ظهر غلط، أو البيانات مش كاملة. ولو كنت دفعت أي مبلغ بيرجعلك كامل.',
      ] },
      { h: '2. الأسعار والمنتجات', items: [
        'الأسعار بالجنيه المصري، والسعر اللي بتدفعه هو اللي ظهر وقت الطلب. الشحن بيظهر قبل التأكيد.',
        'الصور والوصف والنكهات من المحمصة. الطعم ودرجة التحميص تجربة شخصية، ونكهات كل قهوة مكتوبة في صفحتها.',
      ] },
      { h: '3. أكواد الخصم والعروض', items: [
        'كود خصم واحد للطلب، وبالشروط المكتوبة معاه (مثلًا بعض الأكواد ما بتنطبقش على الباقات أو الشحن).',
        `القهوة المشتراة ضمن عرض أو خصم لا تُرجع ولا تُستبدل، زي ما في [سياسة الاسترجاع](${v.returns}).`,
      ] },
      { h: '4. المحفظة والكاش باك', items: [
        `بعد توصيل طلبك بيرجعلك ${v.cash}% من قيمة المنتجات رصيد في محفظتك على المتجر، صالح ${v.days} يوم.`,
        'الرصيد بتستخدمه في طلبات جاية، ومبيدفعش الشحن، ومينفعش يتحول لفلوس.',
      ] },
      { h: '5. حسابك', text: 'انت مسؤول عن سرية كلمة السر بتاعتك وعن الطلبات اللي بتتعمل من حسابك.' },
      { h: '6. المسؤولية', text: 'مسؤوليتنا عن أي طلب ما تزيدش عن قيمته اللي دفعتها. ولا ينتقص ده من حقوقك وفقًا لقانون حماية المستهلك المصري.' },
      { h: '7. القانون', text: 'الشروط دي بتخضع لقوانين جمهورية مصر العربية.' },
      { h: '8. التعديلات', text: `ممكن نحدّث الشروط دي، والنسخة المنشورة وقت طلبك هي اللي بتنطبق عليه. أي سؤال: واتساب ${v.wa}.` },
    ],
  }),
};

const EN: Record<PolicyKind, (v: V) => Policy> = {
  privacy: (v) => ({
    title: 'Privacy policy',
    updated: UPDATED_EN,
    lead: `We collect as little as we can to deliver your order and help you, and **we never sell your data**. This page explains what ${v.brand} collects and what we do with it.`,
    sections: [
      { h: '1. What we collect', items: [
        '**When you order:** your name, phone number, governorate, area, address and landmark, what you ordered and how you pay.',
        '**Your account (if you make one):** your phone number and an encrypted password, your orders and your wallet balance.',
        '**An unfinished checkout:** if you type your number at checkout and don’t finish, we keep the cart, your number, name and governorate, and someone from our team may send you one reminder on WhatsApp.',
        '**Site visits:** we count visits without tracking cookies, using a code that changes every day and can’t be turned back into an IP address. We note where a visit came from (an ad, Instagram…) to measure our ads.',
        '**If you message us** on WhatsApp, Messenger or Instagram: the messages themselves. On Messenger and Instagram an AI assistant (Claude by Anthropic) may reply; phone numbers and emails are removed from the messages before they are sent to it.',
      ] },
      { h: '2. What we use it for', items: [
        'Preparing and delivering your order, contacting you about it, and customer service.',
        'Your account, wallet and cashback.',
        'Measuring and improving our ads.',
        'Stopping fake orders: a number that refuses two deliveries can’t order from our stores again until it contacts us on WhatsApp.',
      ] },
      { h: '3. Who sees your data', items: [
        '**The courier (Bosta):** your name, number and address, to deliver.',
        '**The roaster preparing your order:** the order details it needs to prepare it.',
        '**Meta (Facebook and Instagram):** to measure ads, we send your phone, first name and governorate **in hashed form only**, and the Meta Pixel runs on the site.',
        '**Service providers** that run the store (hosting, database, the AI assistant), only on our behalf.',
        'We never sell or rent your data to anyone.',
      ] },
      { h: '4. Cookies and browser storage', text: 'We use only a language cookie and a sign-in cookie; your cart and choices are kept in your browser. The Meta Pixel uses its own cookies to measure ads.' },
      { h: '5. How long we keep it', text: 'As long as it’s needed for these purposes, or as long as the law requires (such as order and accounting records).' },
      { id: 'delete', h: '6. Your rights and deleting your data', items: [
        `You can ask for a copy of your data, a correction, or for it to be **deleted** at any time by messaging us on WhatsApp ${v.wa} from the same number.`,
        'We delete it within 30 days, except what the law requires us to keep.',
        'If you don’t want reminders, tell us and we’ll stop them.',
      ] },
      { h: '7. Contact', text: `Any question about your privacy: WhatsApp ${v.wa}. See also our [terms](${v.terms}).` },
    ],
  }),
  shipping: (v) => ({
    title: 'Shipping and delivery',
    updated: UPDATED_EN,
    lead: `We deliver to every governorate in Egypt with Bosta. Delivery is **${v.fee}** to any governorate${v.free ? `, **free** on orders from ${v.free}` : ''}.`,
    sections: [
      { h: '1. Delivery times', items: [
        'Cairo, Giza and Qalyubia: usually within 2 business days.',
        'Other governorates: usually within 3 business days (Friday isn’t a business day).',
        'The expected date for your governorate shows on the product page and before you confirm, and the courier calls before arriving.',
      ] },
      { h: '2. Fees', items: [
        `Delivery is ${v.fee} to any governorate, with no other fees.`,
        ...(v.free ? [`Free on orders from ${v.free} (on the goods, before any promo code).`] : []),
      ] },
      { h: '3. Payment', items: [
        '**Cash on delivery** to the courier, or **InstaPay / mobile wallet** after the order is confirmed.',
        `Orders over ${v.above}: we ask for ${v.deposit} only in advance by InstaPay (the size of the delivery fee); it comes off the total and is refunded in full if the order is late or not as ordered.`,
      ] },
      { h: '4. On delivery', items: [
        'Open the parcel and check the bags before you pay, **without opening a coffee bag**.',
        'A bag opened at delivery can’t be refused and must be paid for.',
        'Coffee arrives in its sealed bags from the roaster.',
      ] },
      { h: '5. If you won’t be there', text: `Message us on WhatsApp ${v.wa} beforehand and we’ll arrange another time. Refusing two deliveries without a reason stops orders on your number until you contact us.` },
      { h: '6. Cancelling and returns', text: `You can cancel free of charge before your order ships. For returns and exchanges, see our [returns policy](${v.returns}).` },
    ],
  }),
  terms: (v) => ({
    title: 'Terms and conditions',
    updated: UPDATED_EN,
    lead: `${v.brand} is an online specialty coffee store in Egypt, selling coffee from selected Egyptian roasters. By using the site or ordering from it, you agree to these terms and to our [returns](${v.returns}), [shipping](${v.shipping}) and [privacy](${v.privacy}) policies.`,
    sections: [
      { h: '1. Orders', items: [
        'Your order is confirmed once we’ve reviewed it; we may contact you to confirm it.',
        'We may cancel an order if the product is sold out, a price was shown wrongly, or the details are incomplete. Anything you paid is refunded in full.',
      ] },
      { h: '2. Prices and products', items: [
        'Prices are in Egyptian pounds; you pay the price shown when you order. Delivery shows before you confirm.',
        'Photos, descriptions and tasting notes come from the roaster. Taste and roast level are personal; each coffee’s notes are on its page.',
      ] },
      { h: '3. Promo codes and offers', items: [
        'One promo code per order, on the conditions shown with it (some codes don’t apply to bundles or delivery).',
        `Coffee bought on an offer or discount can’t be returned or exchanged, as our [returns policy](${v.returns}) says.`,
      ] },
      { h: '4. Wallet and cashback', items: [
        `After your order is delivered, ${v.cash}% of the goods comes back as credit in your store wallet, valid for ${v.days} days.`,
        'Credit is for future orders; it doesn’t pay for delivery and can’t be turned into cash.',
      ] },
      { h: '5. Your account', text: 'You’re responsible for keeping your password secret and for orders placed from your account.' },
      { h: '6. Liability', text: 'Our liability for any order is limited to the amount you paid for it. This doesn’t take away your rights under Egypt’s Consumer Protection Law.' },
      { h: '7. Law', text: 'These terms are governed by the laws of the Arab Republic of Egypt.' },
      { h: '8. Changes', text: `We may update these terms; the version published when you order applies to that order. Questions: WhatsApp ${v.wa}.` },
    ],
  }),
};

/** "**bold**" and "[label](/path)" inside a line → parts for rendering. */
export function richParts(s: string): { text: string; bold?: boolean; href?: string }[] {
  const out: { text: string; bold?: boolean; href?: string }[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last) out.push({ text: s.slice(last, m.index) });
    out.push(m[1] !== undefined ? { text: m[1], bold: true } : { text: m[2], href: m[3] });
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}
