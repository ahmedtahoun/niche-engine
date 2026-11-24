// Tasting-notes dictionary (قاموس النكهات): what each note on a bag means, when you notice it in the
// cup, and a familiar taste to compare it with. Shown when a customer taps a note, in the tasting
// game, and on /notes. Kept to general, true coffee knowledge: notes describe how the coffee itself
// tastes (bean, process, roast); nothing is added.
// Safe in the browser (no server code).

export type NoteFamily = 'sweet' | 'chocolate' | 'nut' | 'fruit' | 'citrus' | 'floral' | 'tea' | 'wood';
type T = { ar: string; en: string };

export interface NoteInfo {
  id: string;
  /** Words that identify the note on a bag (Arabic and English), longest first when matching. */
  words: string[];
  name: T;
  emoji: string;
  family: NoteFamily;
  /** What it means in coffee. */
  what: T;
  /** When and how to notice it. */
  when: T;
  /** A familiar taste to compare it with. */
  like: T;
}

export const FAMILY: Record<NoteFamily, T & { emoji: string }> = {
  sweet: { ar: 'حلاوة', en: 'Sweet', emoji: '🍯' },
  chocolate: { ar: 'شوكولاتة', en: 'Chocolate', emoji: '🍫' },
  nut: { ar: 'مكسرات', en: 'Nutty', emoji: '🌰' },
  fruit: { ar: 'فواكه', en: 'Fruit', emoji: '🍑' },
  citrus: { ar: 'موالح', en: 'Citrus', emoji: '🍊' },
  floral: { ar: 'زهور', en: 'Floral', emoji: '🌸' },
  tea: { ar: 'شاي', en: 'Tea', emoji: '🍵' },
  wood: { ar: 'خشب وتوابل', en: 'Wood & spice', emoji: '🪵' },
};

export const NOTES: NoteInfo[] = [
  { id: 'milk-caramel', words: ['كراميل باللبن', 'milk caramel'], name: { ar: 'كراميل باللبن', en: 'Milk caramel' }, emoji: '🍮', family: 'sweet',
    what: { ar: 'حلاوة ناعمة كريمية، من السكر الطبيعي في البن لما يتحمص بهدوء.', en: 'A soft, creamy sweetness from the bean’s own sugars, gently roasted.' },
    when: { ar: 'في آخر البقة، وبتبان أكتر لو ضفت لبن.', en: 'In the finish, and more with a splash of milk.' },
    like: { ar: 'زي الكراميل اللي على الكريم كراميل، بس أنعم.', en: 'Like the caramel on a crème caramel, only softer.' } },
  { id: 'caramel', words: ['كراميل', 'caramel'], name: { ar: 'كراميل', en: 'Caramel' }, emoji: '🍮', family: 'sweet',
    what: { ar: 'حلاوة السكر لما يتحمص. بتيجي من التحميص الوسط، مش من أي إضافة.', en: 'The sweetness of sugar as it browns. It comes from a medium roast, not from anything added.' },
    when: { ar: 'في آخر البقة وبعد ما تبلع.', en: 'At the end of the sip and after you swallow.' },
    like: { ar: 'زي وش الكريم كراميل.', en: 'Like the top of a crème caramel.' } },
  { id: 'molasses', words: ['عسل أسود', 'molasses'], name: { ar: 'عسل أسود', en: 'Molasses' }, emoji: '🍯', family: 'sweet',
    what: { ar: 'حلاوة عميقة وتقيلة شوية، فيها لمسة تحميص.', en: 'A deep, heavy sweetness with a roasted edge.' },
    when: { ar: 'في القوام وآخر البقة، أوضح وهي سخنة.', en: 'In the body and the finish, clearer while hot.' },
    like: { ar: 'زي العسل الأسود بالطحينة.', en: 'Like Egyptian black honey (molasses) with tahini.' } },
  { id: 'brown-sugar', words: ['سكر بني', 'brown sugar'], name: { ar: 'سكر بني', en: 'Brown sugar' }, emoji: '🍬', family: 'sweet',
    what: { ar: 'حلاوة دافية من غير ما يكون فيها سكر خالص.', en: 'A warm sweetness, though there is no sugar in the cup.' },
    when: { ar: 'لما القهوة تبرد شوية، بتحس الكوباية حلوة لوحدها.', en: 'As it cools a little, the cup tastes sweet on its own.' },
    like: { ar: 'زي السكر البني على وش البسبوسة.', en: 'Like brown sugar on top of basbousa.' } },
  { id: 'sugar-cane', words: ['قصب السكر', 'قصب', 'sugar cane'], name: { ar: 'قصب السكر', en: 'Sugar cane' }, emoji: '🎋', family: 'sweet',
    what: { ar: 'حلاوة خفيفة ومنعشة، مش تقيلة.', en: 'A light, fresh sweetness, never heavy.' },
    when: { ar: 'في أول البقة وهي دافية.', en: 'At the start of the sip, when warm.' },
    like: { ar: 'زي عصير القصب.', en: 'Like fresh sugar-cane juice.' } },
  { id: 'dark-chocolate', words: ['شوكولاتة داكنة', 'dark chocolate', 'شوكولاتة', 'chocolate', 'كاكاو', 'cocoa'], name: { ar: 'شوكولاتة داكنة', en: 'Dark chocolate' }, emoji: '🍫', family: 'chocolate',
    what: { ar: 'مرارة حلوة خفيفة وقوام غني، من التحميص والبن نفسه.', en: 'A gentle, sweet bitterness and rich body, from the roast and the bean.' },
    when: { ar: 'أول ما تشربها سخنة، وفي القوام.', en: 'Straight away while hot, and in the body.' },
    like: { ar: 'زي حتة شوكولاتة دارك 70%.', en: 'Like a square of 70% dark chocolate.' } },
  { id: 'roasted-hazelnut', words: ['بندق محمص', 'بندق', 'hazelnut'], name: { ar: 'بندق محمص', en: 'Roasted hazelnut' }, emoji: '🌰', family: 'nut',
    what: { ar: 'طعم مكسرات ناعم ودافي.', en: 'A smooth, warm nutty taste.' },
    when: { ar: 'في الريحة قبل ما تشرب، وفي آخر البقة.', en: 'In the aroma before you sip, and in the finish.' },
    like: { ar: 'زي بندق النوتيلا من غير السكر.', en: 'Like the hazelnut in Nutella, without the sugar.' } },
  { id: 'walnut', words: ['عين جمل', 'walnut'], name: { ar: 'عين جمل', en: 'Walnut' }, emoji: '🌰', family: 'nut',
    what: { ar: 'طعم مكسرات فيه مرارة خفيفة ودهنية لطيفة.', en: 'A nutty taste with a light, pleasant bitterness.' },
    when: { ar: 'في آخر البقة بعد ما تبلع.', en: 'After you swallow.' },
    like: { ar: 'زي عين الجمل اللي في الكحك والحلويات.', en: 'Like the walnut in Eid kahk and pastries.' } },
  { id: 'roasted-nuts', words: ['مكسرات محمصة', 'مكسرات', 'roasted nuts', 'nuts'], name: { ar: 'مكسرات محمصة', en: 'Roasted nuts' }, emoji: '🥜', family: 'nut',
    what: { ar: 'طعم التحميص الحلو، زي المكسرات الطازة من المحمصة.', en: 'A sweet roasty taste, like nuts fresh from the roaster.' },
    when: { ar: 'في ريحة البن المطحون وفي آخر البقة.', en: 'In the smell of the grounds and the finish.' },
    like: { ar: 'زي ريحة السوداني والبندق في محل المحمصة.', en: 'Like the smell of peanuts and hazelnuts at a nut roastery.' } },
  { id: 'apricot', words: ['مشمش', 'apricot'], name: { ar: 'مشمش', en: 'Apricot' }, emoji: '🍑', family: 'fruit',
    what: { ar: 'حلاوة فاكهية ناعمة مع حموضة خفيفة، من البن ومعالجته.', en: 'A soft fruity sweetness with gentle acidity, from the bean and its processing.' },
    when: { ar: 'لما القهوة تبرد وتبقى دافية، مش وهي بتغلي.', en: 'As the coffee cools to warm, not while very hot.' },
    like: { ar: 'زي المشمش الطازة أو قمر الدين.', en: 'Like fresh apricot, or qamar el-din apricot paste.' } },
  { id: 'berries', words: ['توت', 'berries', 'berry'], name: { ar: 'توت', en: 'Berries' }, emoji: '🫐', family: 'fruit',
    what: { ar: 'حموضة حلوة وفاكهية، كتير في القهوة الإثيوبي المعالجة طبيعي.', en: 'A sweet, fruity acidity, common in naturally processed Ethiopian coffees.' },
    when: { ar: 'وهي دافية، وبتبان أكتر في الـ V60.', en: 'When warm, and more in a V60.' },
    like: { ar: 'زي التوت والفراولة.', en: 'Like berries and strawberries.' } },
  { id: 'tropical', words: ['فواكه استوائية', 'tropical fruit', 'tropical'], name: { ar: 'فواكه استوائية', en: 'Tropical fruit' }, emoji: '🥭', family: 'fruit',
    what: { ar: 'حلاوة عصيرية فيها فواكه كتير مع بعض.', en: 'A juicy sweetness of several fruits together.' },
    when: { ar: 'لما تبرد شوية، وفي أول البقة.', en: 'As it cools a little, at the start of the sip.' },
    like: { ar: 'زي المانجا والأناناس.', en: 'Like mango and pineapple.' } },
  { id: 'orange-blossom', words: ['زهر البرتقال', 'orange blossom'], name: { ar: 'زهر البرتقال', en: 'Orange blossom' }, emoji: '🌼', family: 'floral',
    what: { ar: 'ريحة زهور حلوة أكتر من إنها طعم.', en: 'A sweet floral aroma more than a taste.' },
    when: { ar: 'شمّ القهوة قبل ما تشرب، وفي أول البقة.', en: 'Smell it before you sip, and at the start of the sip.' },
    like: { ar: 'زي ماية الزهر في الحلويات.', en: 'Like orange-blossom water in Egyptian sweets.' } },
  { id: 'floral', words: ['زهور', 'floral', 'flowers'], name: { ar: 'زهور', en: 'Floral' }, emoji: '🌸', family: 'floral',
    what: { ar: 'ريحة ناعمة زي الورد، علامة بن مختص عالي الجودة.', en: 'A soft, flower-like aroma, a sign of high-grade specialty coffee.' },
    when: { ar: 'في ريحة البن المطحون، وأول ما تشم الكوباية.', en: 'In the smell of the grounds and the cup.' },
    like: { ar: 'زي ريحة الياسمين.', en: 'Like the scent of jasmine.' } },
  { id: 'tangerine', words: ['يوسفي', 'tangerine', 'mandarin'], name: { ar: 'يوسفي', en: 'Tangerine' }, emoji: '🍊', family: 'citrus',
    what: { ar: 'حموضة حلوة منعشة من الموالح.', en: 'A sweet, refreshing citrus acidity.' },
    when: { ar: 'في أول البقة وهي دافية.', en: 'At the start of the sip, when warm.' },
    like: { ar: 'زي اليوسفي في الشتا.', en: 'Like a winter tangerine.' } },
  { id: 'orange', words: ['برتقال', 'orange'], name: { ar: 'برتقال', en: 'Orange' }, emoji: '🍊', family: 'citrus',
    what: { ar: 'لمسة حموضة منعشة، مش حمضان.', en: 'A refreshing touch of acidity, not sourness.' },
    when: { ar: 'في أول البقة، وأوضح لما تبرد شوية.', en: 'At the start of the sip, clearer as it cools.' },
    like: { ar: 'زي قشر البرتقال.', en: 'Like orange zest.' } },
  { id: 'black-tea', words: ['شاي أسود', 'شاي', 'black tea', 'tea'], name: { ar: 'شاي أسود', en: 'Black tea' }, emoji: '🍵', family: 'tea',
    what: { ar: 'قوام خفيف وإحساس جاف ناعم في الآخر، زي الشاي.', en: 'A light body and a gentle dry feel at the end, like tea.' },
    when: { ar: 'في القوام وبعد ما تبلع.', en: 'In the body and after you swallow.' },
    like: { ar: 'زي الشاي الأسود من غير سكر.', en: 'Like black tea without sugar.' } },
  { id: 'oak', words: ['خشب البلوط', 'خشب', 'oak', 'wood'], name: { ar: 'خشب البلوط', en: 'Oak' }, emoji: '🪵', family: 'wood',
    what: { ar: 'إحساس خشبي دافي خفيف بيكمّل الحلاوة.', en: 'A light, warm woody feel that rounds off the sweetness.' },
    when: { ar: 'في آخر البقة.', en: 'In the finish.' },
    like: { ar: 'زي ريحة الخشب الدافية في محل قديم.', en: 'Like the warm smell of old wooden furniture.' } },
];

// Longest words first, so "كراميل باللبن" wins over "كراميل" and "زهر البرتقال" over "برتقال".
const INDEX = NOTES.flatMap((n) => n.words.map((w) => [w.toLowerCase(), n] as const)).sort((a, b) => b[0].length - a[0].length);

/** The dictionary entry for a note as written on a bag, or null if it is not in the dictionary yet. */
export function noteInfo(note: string): NoteInfo | null {
  const n = note.trim().toLowerCase();
  return INDEX.find(([w]) => n === w)?.[1] ?? INDEX.find(([w]) => n.includes(w))?.[1] ?? null;
}

/** Notes of the game: this coffee's notes plus decoys from other families, in a stable shuffled order. */
export function tastingChoices(notes: string[], seed: string, total = 8): { info: NoteInfo; real: boolean }[] {
  const real = [...new Map(notes.map(noteInfo).filter((x): x is NoteInfo => Boolean(x)).map((n) => [n.id, n])).values()];
  const fams = new Set(real.map((n) => n.family));
  const hash = (x: string) => [...`${seed}:${x}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const decoys = NOTES.filter((n) => !real.some((r) => r.id === n.id) && !fams.has(n.family)).sort((a, b) => hash(a.id) - hash(b.id));
  const more = NOTES.filter((n) => !real.some((r) => r.id === n.id) && !decoys.includes(n)).sort((a, b) => hash(a.id) - hash(b.id));
  const picked = [...real.map((info) => ({ info, real: true })), ...[...decoys, ...more].slice(0, Math.max(0, total - real.length)).map((info) => ({ info, real: false }))];
  return picked.sort((a, b) => hash(a.info.id) - hash(b.info.id));
}

/** Palate level from the notes caught so far (across coffees). */
export function palateLevel(caught: number): { level: number; name: T; next: number | null } {
  const steps: [number, T][] = [[0, { ar: 'بادئ', en: 'Beginner' }], [3, { ar: 'متذوّق', en: 'Taster' }], [7, { ar: 'لسان حسّاس', en: 'Keen palate' }], [12, { ar: 'خبير نكهات', en: 'Flavour expert' }]];
  const i = steps.reduce((acc, [min], k) => (caught >= min ? k : acc), 0);
  return { level: i + 1, name: steps[i][1], next: steps[i + 1]?.[0] ?? null };
}
