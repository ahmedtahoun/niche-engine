// Answer pages per niche ("knowledge hub" in the niche standard): short, factual,
// answer first, so Google and AI answer engines can quote them. Arabic and English.
// Keep claims general and true; no health claims, no "best in Egypt".

export interface Guide {
  slug: string;
  /** Shown on guide cards. */
  emoji?: string;
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
    emoji: '🎯',
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
    emoji: '🫘',
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
    emoji: '⚙️',
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
    emoji: '🫙',
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
  {
    slug: 'turkish-coffee-kanaka',
    emoji: '🫖',
    title: { ar: 'طريقة عمل القهوة التركي في الكنكة خطوة بخطوة', en: 'How to make Turkish coffee in a kanaka, step by step' },
    description: { ar: 'الطريقة المظبوطة لقهوة تركي بوش في الكنكة: الكمية، الطحنة، والنار، وأنهي بن ينفع.', en: 'How to make Turkish coffee with a good foam in a kanaka: amounts, grind, heat, and which beans suit it.' },
    short: {
      ar: 'لكل فنجان: معلقة صغيرة مليانة (حوالي 7 جم) بن مطحون ناعم جداً، وفنجان مية ساقعة، وسكر حسب ذوقك. قلّب قبل النار بس، وسيبها على نار هادية لحد ما الوش يعلى، وشيلها قبل ما تفور.',
      en: 'For each cup: one heaped small spoon (about 7 g) of extra-fine coffee, one cup of cold water, and sugar to taste. Stir only before heating, keep the heat low until the foam rises, and take it off before it boils.',
    },
    sections: [
      { h: { ar: 'الطحنة أهم حاجة', en: 'The grind matters most' }, p: { ar: 'القهوة التركي محتاجة طحنة ناعمة جداً زي البودرة. لو الطحنة أخشن، الوش مش هيطلع والطعم هيبقى خفيف. لو بتشتري بن مختص اطلبه مطحون "كنكة"، أو اطحنه في البيت بمطحنة بتوصل للنعومة دي.', en: 'Turkish coffee needs an extra-fine, powder-like grind. Coarser coffee gives little foam and a thin taste. Order specialty coffee ground for the kanaka, or grind it at home with a grinder that goes that fine.' } },
      { h: { ar: 'المقادير', en: 'Amounts' }, p: { ar: 'فنجان القهوة التركي حوالي 70–80 مل. حط معلقة صغيرة مليانة بن لكل فنجان، وزوّد شوية لو بتحبها أتقل. استخدم مية ساقعة، والسكر يتحط مع المية قبل النار.', en: 'A Turkish coffee cup holds about 70–80 ml. Use one heaped small spoon of coffee per cup, a little more if you like it stronger. Start with cold water and add any sugar before heating.' } },
      { h: { ar: 'على النار', en: 'On the heat' }, p: { ar: 'قلّب المية والبن والسكر كويس قبل ما تحط الكنكة على النار، وبعد كده متقلبش تاني. خلي النار هادية: الوش بيتكوّن على مهله. أول ما الوش يبدأ يعلى ناحية الحرف، شيل الكنكة وصب الوش الأول في الفناجين وبعدين القهوة.', en: 'Stir the water, coffee and sugar well before the kanaka goes on the heat, then do not stir again. Keep the heat low so the foam builds slowly. As soon as the foam starts climbing to the rim, take it off, spoon the foam into the cups first, then pour the coffee.' } },
      { h: { ar: 'أنهي بن ينفع للتركي؟', en: 'Which beans suit Turkish coffee?' }, p: { ar: 'البلندات بنكهات الشوكولاتة والمكسرات وقوام غني بتدي فنجان تركي تقيل ومريح، وده الطعم اللي أغلب الناس متعودة عليه. القهوة أحادية المصدر بنكهات الفواكه بتدي فنجان أخف وطعم مختلف لو حابب تجرب.', en: 'Blends with chocolate and nut notes and a rich body make a full, comforting Turkish cup, the taste most people know. Fruity single origins give a lighter, different cup if you want to experiment.' } },
    ],
    faq: [
      { q: { ar: 'ليه القهوة التركي مش بتعمل وش؟', en: 'Why does my Turkish coffee have no foam?' }, a: { ar: 'غالباً الطحنة مش ناعمة كفاية، أو النار عالية، أو بتقلب بعد ما الكنكة تسخن، أو البن قديم. البن الطازة المطحون ناعم جداً على نار هادية بيعمل أحسن وش.', en: 'Usually the grind is not fine enough, the heat is too high, you stir after it warms, or the coffee is old. Fresh, extra-fine coffee on low heat makes the best foam.' } },
      { q: { ar: 'ينفع أعمل تركي ببن مختص؟', en: 'Can I use specialty coffee for Turkish coffee?' }, a: { ar: 'أيوه، طالما مطحون ناعم جداً. هتلاحظ إن طعم النكهات أوضح من البن العادي.', en: 'Yes, as long as it is ground extra fine. You will taste the coffee’s notes more clearly than with regular coffee.' } },
      { q: { ar: 'البن المطحون للكنكة يفضل طازة قد إيه؟', en: 'How long does coffee ground for the kanaka stay fresh?' }, a: { ar: 'أحلى طعم في أول أسبوعين بعد الطحن، في كيس مقفول بعيد عن الشمس والرطوبة.', en: 'It tastes best within about two weeks of grinding, kept sealed away from sunlight and moisture.' } },
    ],
    related: { family: 'chocolate' },
    updated: '2026-11-12',
  },
  {
    slug: 'buy-specialty-coffee-online-egypt',
    emoji: '🛒',
    title: { ar: 'إزاي تشتري بن مختص أونلاين في مصر؟', en: 'How to buy specialty coffee online in Egypt' },
    description: { ar: 'تعرف البن المختص الكويس من الوصف قبل ما تطلبه: المحمصة، المنشأ، النكهات، الطحنة، والتغليف.', en: 'How to judge specialty coffee from its listing before you order: roaster, origin, tasting notes, grind and packaging.' },
    short: {
      ar: 'دوّر على اسم المحمصة، ومنشأ البن أو نوع البلند، والنكهات المكتوبة، واطلبه مطحون على طريقة تحضيرك أو حبوب لو عندك مطحنة. ابدأ بـ 250 جم، وفضّل الدفع عند الاستلام لو أول مرة تطلب من المكان.',
      en: 'Look for the roaster’s name, the origin or blend type, and the tasting notes, and order it ground for your brewing method, or as beans if you have a grinder. Start with 250 g, and prefer cash on delivery the first time you order from a shop.',
    },
    sections: [
      { h: { ar: 'اسم المحمصة والمنشأ', en: 'Roaster and origin' }, p: { ar: 'البن المختص بيبقى معروف مين حمّصه ومنين جه: بلد زي إثيوبيا أو البرازيل أو كولومبيا، وأحياناً المنطقة والسلالة وطريقة المعالجة. كل ما المعلومات أوضح، كل ما ده علامة على جودة واهتمام.', en: 'Specialty coffee states who roasted it and where it comes from: a country such as Ethiopia, Brazil or Colombia, sometimes the region, variety and process. Clearer information is a good sign of quality and care.' } },
      { h: { ar: 'النكهات والقوام', en: 'Tasting notes and body' }, p: { ar: 'الوصف الكويس بيقولك الطعم: شوكولاتة ومكسرات، كراميل، أو فواكه وزهور، ومعاه القوام والحموضة. اختار حسب الطعم اللي بتحبه مش حسب الاسم.', en: 'A good listing tells you the taste: chocolate and nuts, caramel, or fruit and florals, plus body and acidity. Choose by the taste you enjoy, not by the name.' } },
      { h: { ar: 'الطحنة والتغليف', en: 'Grind and packaging' }, p: { ar: 'اطلب الطحنة المناسبة لطريقتك: كنكة، اسبريسو، موكا، فلتر أو فرنش بريس. البن بيتحفظ أحسن في كيس مقفول بصمام، والحبوب الكاملة بتفضل طازة أطول من المطحونة.', en: 'Ask for the grind that fits your method: kanaka, espresso, moka pot, filter or French press. Coffee keeps best in a sealed bag with a valve, and whole beans stay fresh longer than ground coffee.' } },
      { h: { ar: 'الكمية والدفع', en: 'Quantity and payment' }, p: { ar: 'جرّب 250 جم من أكتر من نوع، أو صندوق اكتشاف، وبعدين خد الكيلو من اللي حبيته. الدفع عند الاستلام بيديك ثقة في أول طلب، واعرف مصاريف الشحن قبل ما تأكد.', en: 'Try 250 g of a few coffees, or a discovery box, then buy the kilo of your favourite. Cash on delivery gives you confidence on a first order; check the delivery fee before you confirm.' } },
    ],
    faq: [
      { q: { ar: 'سعر البن المختص في مصر بيتحدد بإيه؟', en: 'What sets the price of specialty coffee in Egypt?' }, a: { ar: 'المنشأ والجودة وندرة البن، والقهوة أحادية المصدر غالباً أغلى من البلندات. قارن السعر لكل 100 جم بين الأحجام.', en: 'Origin, grade and rarity; single origins usually cost more than blends. Compare the price per 100 g across sizes.' } },
      { q: { ar: 'أطلب حبوب ولا مطحون؟', en: 'Should I order beans or ground coffee?' }, a: { ar: 'حبوب لو عندك مطحنة لأنها بتفضل طازة أطول، ومطحون على طريقتك لو مفيش مطحنة.', en: 'Beans if you have a grinder, since they stay fresh longer; ground for your method if you do not.' } },
    ],
    related: { category: 'blends' },
    updated: '2026-11-12',
  },
];

const BY_NICHE: Record<string, Guide[]> = { coffee: COFFEE };

export const guidesFor = (niche: string): Guide[] => BY_NICHE[niche] ?? [];
/** Reading time in minutes (about 180 words a minute), for guide cards. */
export const readMinutes = (g: Guide, lang: 'ar' | 'en') => Math.max(1, Math.round([g.short, ...g.sections.map((x) => x.p), ...g.faq.map((f) => f.a)].map((x) => x[lang]).join(' ').split(/\s+/).length / 180));

export const guideBySlug = (niche: string, slug: string) => guidesFor(niche).find((g) => g.slug === slug) ?? null;
