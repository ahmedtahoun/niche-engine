// Answer pages per niche ("knowledge hub" in the niche standard): short, factual,
// answer first, so Google and AI answer engines can quote them. Arabic and English.
// Keep claims general and true; no health claims, no "best in Egypt".

export interface Guide {
  slug: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  /** One- or two-sentence answer shown first. */
  short: { ar: string; en: string };
  sections: { h: { ar: string; en: string }; p: { ar: string; en: string } }[];
  faq: { q: { ar: string; en: string }; a: { ar: string; en: string } }[];
  /** Products to suggest under the guide. */
  related?: { family?: string; category?: string };
  updated: string;
}

const COFFEE: Guide[] = [
  {
    slug: 'choose-specialty-coffee',
    title: { ar: 'إزاي تختار القهوة المختصة المناسبة ليك؟', en: 'How to choose the right specialty coffee for you' },
    description: { ar: 'دليل بسيط لاختيار حبوب القهوة المختصة في مصر حسب الطعم وطريقة التحضير.', en: 'A simple guide to choosing specialty coffee beans in Egypt by taste and brewing method.' },
    short: {
      ar: 'ابدأ بالطعم اللي بتحبه: لو بتحب القهوة ناعمة وبتشربها باللبن اختار نكهات الشوكولاتة والمكسرات. لو بتحب الطعم الأخف والمختلف جرّب القهوة أحادية المصدر بنكهات الفواكه.',
      en: 'Start with the taste you enjoy: if you like smooth coffee, often with milk, pick chocolate and nut notes. If you like a lighter, more distinctive cup, try a single-origin coffee with fruity notes.',
    },
    sections: [
      { h: { ar: 'اقرأ النكهات المكتوبة', en: 'Read the tasting notes' }, p: { ar: 'المحمصة بتكتب 2–4 نكهات زي "كراميل، شوكولاتة، مكسرات". دي مش إضافات، دي الطعم الطبيعي للبن بعد التحميص. اختار النكهات اللي بتحبها في الأكل.', en: 'Roasters list 2–4 notes such as "caramel, chocolate, nuts". These are not added flavours; they describe how the roasted coffee naturally tastes. Pick notes you enjoy in food.' } },
      { h: { ar: 'القوام والحموضة', en: 'Body and acidity' }, p: { ar: 'القوام التقيل بيدي إحساس غني في البق ويمشي كويس مع اللبن. الحموضة العالية مش "حمضان"، دي إحساس منعش زي الفاكهة. لو جديد على القهوة المختصة ابدأ بقوام متوسط لتقيل وحموضة منخفضة.', en: 'A full body feels rich and pairs well with milk. High acidity is not sourness; it is a bright, fruit-like freshness. New to specialty coffee? Start with a medium-to-full body and low acidity.' } },
      { h: { ar: 'طريقة التحضير', en: 'Your brewing method' }, p: { ar: 'مكنة الاسبريسو والموكا بوت بيحبوا البلندات بقوام غني. الفلتر و V60 بيبينوا تفاصيل القهوة أحادية المصدر. لو هتطحن في البيت اشتري حبوب كاملة، هتفضل طازة أكتر.', en: 'Espresso machines and moka pots suit rich-bodied blends. Filter and V60 bring out the detail of single origins. If you grind at home, buy whole beans: they stay fresh longer.' } },
      { h: { ar: 'جرّب قبل ما تكبر الكمية', en: 'Try before buying big' }, p: { ar: 'اشتري 250 جم الأول من أكتر من نوع، أو صندوق اكتشاف فيه 3 قهوات، وبعدين خد الكيلو من اللي حبيته.', en: 'Buy 250 g of a few coffees first, or a discovery box with three, then get the kilo of the one you love.' } },
    ],
    faq: [
      { q: { ar: 'إيه الفرق بين القهوة المختصة والعادية؟', en: 'What is the difference between specialty and regular coffee?' }, a: { ar: 'القهوة المختصة بن عالي الجودة معروف مصدره وبيتحمص بعناية علشان يظهر طعمه الطبيعي، بدل التحميص الغامق جداً اللي بيخفي العيوب.', en: 'Specialty coffee is high-grade coffee with a known origin, roasted carefully to show its natural flavour, rather than very dark roasting that hides defects.' } },
      { q: { ar: 'أبدأ بإيه لو أول مرة؟', en: 'What should I start with as a beginner?' }, a: { ar: 'بلند بنكهات الشوكولاتة والكراميل وقوام غني. سهل يتحب سادة أو باللبن.', en: 'A blend with chocolate and caramel notes and a rich body. Easy to enjoy black or with milk.' } },
    ],
    related: { family: 'chocolate' },
    updated: '2026-11-11',
  },
  {
    slug: 'blend-vs-single-origin',
    title: { ar: 'الفرق بين البلند والقهوة أحادية المصدر', en: 'Blend vs single-origin coffee: what is the difference?' },
    description: { ar: 'امتى تختار بلند وامتى تختار قهوة أحادية المصدر، وإيه اللي بيفرق في الطعم.', en: 'When to choose a blend and when to choose a single origin, and how they taste different.' },
    short: {
      ar: 'البلند خلطة من أكتر من مصدر معمولة علشان طعم متوازن وثابت، ومناسب جداً للاسبريسو واللبن. أحادية المصدر من بلد أو منطقة واحدة، وبتبين طعم المكان ده بوضوح.',
      en: 'A blend mixes coffees from several origins for a balanced, consistent taste, great for espresso and milk drinks. A single origin comes from one country or region and shows that place’s character clearly.',
    },
    sections: [
      { h: { ar: 'البلند', en: 'Blends' }, p: { ar: 'المحمصة بتختار كذا بن يكملوا بعض: واحد للقوام، وواحد للحلاوة، وواحد للنكهة. النتيجة طعم مريح كل يوم.', en: 'The roaster combines coffees that complement each other, one for body, one for sweetness, one for flavour, for an easy everyday cup.' } },
      { h: { ar: 'أحادية المصدر', en: 'Single origin' }, p: { ar: 'بن من منطقة واحدة زي ليمو في إثيوبيا أو سيرادو في البرازيل. كل منطقة ليها طعم: إثيوبيا غالباً فواكه وشاي، البرازيل غالباً شوكولاتة ومكسرات وحلاوة.', en: 'Coffee from one region, such as Limu in Ethiopia or Cerrado in Brazil. Each region has its character: Ethiopia often fruity and tea-like, Brazil often chocolatey, nutty and sweet.' } },
      { h: { ar: 'طريقة المعالجة', en: 'Processing method' }, p: { ar: 'المعالجة الطبيعية (ناشف بالكرز) بتدي حلاوة ونكهات فواكه أوضح. المغسولة بتدي طعم أنضف وأوضح.', en: 'Natural processing (dried in the cherry) gives more sweetness and fruit. Washed coffees taste cleaner and crisper.' } },
    ],
    faq: [
      { q: { ar: 'أيهم أحسن للاسبريسو؟', en: 'Which is better for espresso?' }, a: { ar: 'البلندات غالباً أسهل وأثبت في الاسبريسو. أحادية المصدر ممكن تبقى حلوة جداً بس بتحتاج ضبط أكتر.', en: 'Blends are usually easier and more consistent for espresso. Single origins can be wonderful but need more dialling in.' } },
    ],
    related: { category: 'single-origin' },
    updated: '2026-11-11',
  },
  {
    slug: 'grind-size-guide',
    title: { ar: 'الطحنة الصح لكل طريقة تحضير', en: 'The right grind size for every brewing method' },
    description: { ar: 'جدول بسيط للطحنة المناسبة للكنكة والاسبريسو والموكا والفلتر والفرنش بريس.', en: 'A simple chart of grind sizes for Turkish coffee, espresso, moka pot, filter and French press.' },
    short: {
      ar: 'كل ما وقت التحضير يقل، الطحنة لازم تبقى أنعم: الكنكة ناعم جداً زي البودرة، الاسبريسو ناعم، الموكا ناعم متوسط، الفلتر متوسط، والفرنش بريس خشن.',
      en: 'The shorter the brew, the finer the grind: Turkish coffee is powder-fine, espresso fine, moka pot fine-medium, filter medium, and French press coarse.',
    },
    sections: [
      { h: { ar: 'ليه الطحنة مهمة؟', en: 'Why grind size matters' }, p: { ar: 'الطحنة الناعمة زيادة عن اللزوم بتطلع قهوة مرة. الخشنة زيادة بتطلع قهوة خفيفة وحامضة. الطحنة المظبوطة بتطلع الحلاوة والنكهات.', en: 'Too fine tastes bitter; too coarse tastes weak and sour. The right grind brings out sweetness and flavour.' } },
      { h: { ar: 'الجدول', en: 'The chart' }, p: { ar: 'كنكة: ناعم جداً · اسبريسو: ناعم · موكا بوت: ناعم متوسط · V60 وفلتر: متوسط · مكنة تقطير: متوسط · فرنش بريس: خشن · كولد برو: خشن جداً.', en: 'Turkish: extra fine · Espresso: fine · Moka pot: fine-medium · V60 and filter: medium · Drip machine: medium · French press: coarse · Cold brew: extra coarse.' } },
      { h: { ar: 'اطحن قبل التحضير', en: 'Grind just before brewing' }, p: { ar: 'القهوة المطحونة بتفقد ريحتها أسرع من الحبوب. لو عندك مطحنة اشتري حبوب كاملة واطحن على قد الكوباية. لو مفيش، اطلبها مطحونة على طريقة تحضيرك بعد الطلب على طول، واشربها في أول أسبوعين.', en: 'Ground coffee loses aroma faster than beans. With a grinder, buy whole beans and grind per cup. Without one, order it ground for your brewing method right after you order, and drink it within two weeks.' } },
    ],
    faq: [
      { q: { ar: 'ينفع أعمل قهوة تركي من بن مختص؟', en: 'Can I make Turkish coffee from specialty beans?' }, a: { ar: 'أيوه، لو اتطحن ناعم جداً. الطعم هيبقى أوضح وأحلى من البن العادي.', en: 'Yes, if it is ground extra fine. It will taste clearer and sweeter than regular coffee.' } },
    ],
    updated: '2026-11-11',
  },
  {
    slug: 'keep-coffee-fresh',
    title: { ar: 'إزاي تحفظ حبوب القهوة طازة؟', en: 'How to keep coffee beans fresh' },
    description: { ar: 'خطوات بسيطة لحفظ القهوة في البيت في جو مصر، وإمتى تشربها علشان أحلى طعم.', en: 'Simple steps to store coffee at home in Egypt’s climate, and when to drink it for the best taste.' },
    short: {
      ar: 'احفظ القهوة في الكيس الأصلي مقفول كويس، في مكان ناشف وضلمة بعيد عن البوتاجاز والشمس. متحطهاش في التلاجة. أحلى طعم غالباً في أول 2–4 أسابيع بعد الفتح.',
      en: 'Keep coffee in its original bag, sealed well, somewhere dry and dark, away from the stove and sunlight. Don’t keep it in the fridge. It usually tastes best within 2–4 weeks of opening.',
    },
    sections: [
      { h: { ar: 'أعداء القهوة الأربعة', en: 'Coffee’s four enemies' }, p: { ar: 'الهوا، والرطوبة، والحرارة، والنور. الكيس اللي فيه صمام وسوستة معمول علشان يحميها منهم.', en: 'Air, moisture, heat and light. A bag with a valve and zip is designed to protect against them.' } },
      { h: { ar: 'ليه مش التلاجة؟', en: 'Why not the fridge?' }, p: { ar: 'كل ما تطلعها وترجعها بيتكون بخار ماية على الحبوب، وده بيبوظ الطعم وبيخليها تشرب روايح الأكل.', en: 'Taking it in and out creates condensation on the beans, which spoils the taste and makes them absorb food smells.' } },
      { h: { ar: 'اشتري على قد استهلاكك', en: 'Buy what you’ll use' }, p: { ar: 'لو بتشرب كوباية في اليوم (حوالي 15 جم)، كيس 250 جم بيكفي حوالي 16 يوم، والكيلو حوالي شهرين.', en: 'At one cup a day (about 15 g), a 250 g bag lasts about 16 days and a kilo about two months.' } },
    ],
    faq: [
      { q: { ar: 'القهوة بتبوظ؟', en: 'Does coffee go off?' }, a: { ar: 'مش بتبوظ بمعنى إنها تضر، بس بتفقد ريحتها وطعمها مع الوقت، خصوصاً بعد الطحن.', en: 'It doesn’t become unsafe, but it loses aroma and flavour over time, especially once ground.' } },
    ],
    updated: '2026-11-11',
  },
];

const BY_NICHE: Record<string, Guide[]> = { coffee: COFFEE };

export const guidesFor = (niche: string): Guide[] => BY_NICHE[niche] ?? [];
export const guideBySlug = (niche: string, slug: string) => guidesFor(niche).find((g) => g.slug === slug) ?? null;
