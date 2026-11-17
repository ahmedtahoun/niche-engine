// The returns page of a store with returnsPolicy "coffee" (/returns). Coffee is food: once a bag is opened it can't
// go back on sale, so the rules are strict and the few real defects are listed one by one. Kept in sync with
// shop.wheretospot.com's refund policy (coffee section).
import type { Lang } from './i18n.ts';

type Section = { h: string; items?: string[]; text?: string };
type Policy = { title: string; updated: string; lead: string; box: Section; sections: Section[]; law: string };

const AR: Policy = {
  title: 'سياسة الاسترجاع والاستبدال',
  updated: 'آخر تحديث: 18 نوفمبر 2026',
  lead: 'القهوة منتج غذائي، وبمجرد فتح الكيس لا يمكن أن تعود لحالتها الأصلية أو تُباع مرة أخرى. عشان كده شروط الاسترجاع للقهوة واضحة ومحددة.',
  box: {
    h: 'القهوة: برجاء القراءة قبل الطلب',
    items: [
      '**الكيس المفتوح لا يُرجع ولا يُستبدل.** بمجرد فتح كيس القهوة، لأي سبب، لا يمكن إرجاعه أو استبداله. الاستثناء الوحيد هو العيوب المذكورة بالأسفل.',
      '**القهوة المشتراة ضمن عرض لا تُرجع ولا تُستبدل**، حتى لو كان الكيس مقفولًا. ويشمل ذلك الخصومات وأكواد الخصم والباقات (مثل بوكس التجربة) وعروض «اشترِ واحصل على».',
      '**القهوة المطحونة حسب طلبك** تُجهَّز خصيصًا لك، فلا تُرجع ولا تُستبدل إلا لعيب من العيوب المذكورة بالأسفل.',
      '**الذوق ليس عيبًا.** درجة التحميص (فاتح أو غامق) والطعم والرائحة والقوة والحموضة ولون الحبوب وحجمها ودرجة الطحن أمور تخص الذوق الشخصي، ولا تُعتبر أبدًا سببًا لإرجاع أو استبدال كيس مفتوح. نكهات كل قهوة مكتوبة في صفحة المنتج، برجاء قراءتها قبل الطلب.',
      '**العيوب المقبولة، وهذه فقط:** أن تكون القهوة منتهية الصلاحية وقت الاستلام، أو بها عفن أو رطوبة أو أجسام غريبة، أو أن يصل الكيس ممزقًا أو بختم مفتوح.',
      '**قهوة أو حجم أو طحنة مختلفة:** إذا وصلك غير ما طلبته، أبلغنا خلال 48 ساعة من الاستلام **وقبل فتح الكيس**.',
      '**عند الاستلام:** يمكنك فتح الشحنة ومعاينة الأكياس قبل الدفع، **من غير فتح كيس القهوة نفسه**. الكيس اللي يتفتح عند الاستلام لا يمكن رفضه ويُدفع ثمنه.',
      'الأكياس المقفولة (حبوب كاملة) المشتراة بالسعر الكامل يمكن إرجاعها خلال 14 يومًا من الاستلام.',
    ],
  },
  sections: [
    { h: '1. إلغاء الطلب', text: 'يمكنك إلغاء طلبك مجانًا **قبل شحنه** بالتواصل معنا مع رقم الطلب. إذا دفعت مقدمًا، نرد المبلغ كاملًا.' },
    { h: '2. القهوة المعيبة', text: 'تُقبل فقط العيوب المذكورة في أول الصفحة. تواصل معنا خلال **30 يومًا** من الاستلام مع رقم الطلب وصور واضحة للكيس وللملصق الذي عليه تاريخ الصلاحية وللقهوة. الكيس الممزق أو الختم المفتوح يجب الإبلاغ عنه خلال **48 ساعة** من الاستلام. قد نطلب استلام الكيس لفحصه، وبعد التأكد من العيب نستبدل القهوة أو نرد قيمتها شاملة رسوم التوصيل، بدون أي تكلفة عليك.' },
    { h: '3. تكلفة توصيل المرتجعات', text: 'عند إرجاع كيس مقفول لتغيير الرأي، لا تُرد رسوم التوصيل الأصلية وقد تُطبق رسوم توصيل للإرجاع. المرتجعات بسبب عيب أو خطأ منا مجانية.' },
    { h: '4. طريقة رد المبالغ', text: 'نرد المبالغ المعتمدة خلال 7 أيام عمل من استلام المرتجع أو الموافقة على طلبك، بتحويل على محفظة إلكترونية أو إنستاباي أو حساب بنكي باسم العميل، أو رصيدًا في محفظتك على المتجر لو حبيت.' },
  ],
  law: 'لا ينتقص أي شيء في هذه السياسة من حقوقك وفقًا لقانون حماية المستهلك المصري.',
};

const EN: Policy = {
  title: 'Returns & exchanges policy',
  updated: 'Last updated: 18 November 2026',
  lead: 'Coffee is a food product: once a bag is opened, it can’t go back to its original condition or be sold again. That’s why our coffee return rules are clear and specific.',
  box: {
    h: 'Coffee: please read before ordering',
    items: [
      '**Opened bags can’t be returned or exchanged.** Once a coffee bag is opened, for any reason, it can’t be returned or exchanged. The only exception is a defect from the list below.',
      '**Coffee bought on an offer can’t be returned or exchanged**, even if the bag is unopened. This covers discounts, promo codes, bundles (like the discovery box) and “buy X, get Y” offers.',
      '**Coffee ground to order** is prepared just for you, so it can’t be returned or exchanged except for a listed defect.',
      '**Taste isn’t a defect.** Roast level (light or dark), taste, aroma, strength, acidity, bean colour and size, and grind are matters of personal taste. They are never a reason to return or exchange an opened bag. Each coffee’s tasting notes are on its product page: please read them before ordering.',
      '**The only defects we accept:** the coffee was past its expiry date when delivered; it has mould, moisture or foreign objects in it; or the bag arrived torn or with its seal broken.',
      '**Wrong coffee, size or grind:** tell us within 48 hours of delivery, **before opening the bag**.',
      '**On delivery:** you can open the parcel and check the bags before you pay, **without opening a coffee bag**. A bag opened at delivery can’t be refused and must be paid for.',
      'Unopened whole-bean bags bought at full price can be returned within 14 days of delivery.',
    ],
  },
  sections: [
    { h: '1. Cancelling an order', text: 'You can cancel free of charge **before your order ships** by contacting us with your order number. If you paid in advance, we refund the full amount.' },
    { h: '2. Defective coffee', text: 'Only the defects listed at the top of this page count. Contact us within **30 days** of delivery with your order number and clear photos of the bag, its label with the expiry date, and the coffee. A torn bag or a broken seal must be reported within **48 hours** of delivery. We may ask for the bag back to check it. Once the defect is confirmed, we replace the coffee or refund its price, including delivery fees, at no cost to you.' },
    { h: '3. Return delivery costs', text: 'For a change-of-mind return of an unopened bag, the original delivery fee isn’t refunded and a return delivery fee may apply. Returns caused by a defect or our mistake are free.' },
    { h: '4. How refunds are paid', text: 'We refund approved returns within 7 business days of receiving the bag or approving your request, by mobile wallet, InstaPay or bank transfer in the customer’s name, or as store wallet credit if you prefer.' },
  ],
  law: 'Nothing in this policy takes away your rights under Egypt’s Consumer Protection Law.',
};

export function coffeeReturns(lang: Lang): Policy {
  return lang === 'en' ? EN : AR;
}

/** "**bold** rest" → parts for rendering: [text, bold] pairs. */
export function boldParts(s: string): { text: string; bold: boolean }[] {
  return s.split(/\*\*/).map((text, i) => ({ text, bold: i % 2 === 1 })).filter((p) => p.text);
}
