// Input rules shared by checkout, seller onboarding and the bot.

/** Egyptian mobile: 11 digits starting 010, 011, 012 or 015. Accepts +20 / 0020 prefixes and spaces. */
export function normalizeEgyptPhone(raw: string): string | null {
  let d = String(raw).replace(/[\s\-()]/g, '');
  d = d.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
  if (d.startsWith('+20')) d = '0' + d.slice(3);
  else if (d.startsWith('0020')) d = '0' + d.slice(4);
  else if (d.startsWith('20') && d.length === 12) d = '0' + d.slice(2);
  return /^01[0125]\d{8}$/.test(d) ? d : null;
}

/** Masks a phone for anywhere a seller could see it: 010••••4471. */
export const maskPhone = (phone: string) => phone.slice(0, 3) + '••••' + phone.slice(-4);
