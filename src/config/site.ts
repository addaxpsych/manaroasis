/**
 * Brand constants for واحة د. منار مبارز.
 *
 * Everything here is transcribed from the client's own material in `designs/`.
 * These are public, non-secret values, deliberately kept as plain constants so
 * prerendered marketing pages need no environment plumbing at build time.
 */

/**
 * Canonical origin, no trailing slash.
 *
 * Inlined at build time from PUBLIC_SITE_URL, so it is correct in both
 * prerendered HTML and on-demand routes. There is deliberately no production
 * domain hardcoded as a fallback — a wrong canonical URL is worse than an
 * obviously-local one.
 */
export const SITE_URL = (
  import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'
).replace(/\/$/, '');

export const site = {
  name: 'واحة د. منار مبارز',
  nameLatin: 'Manar Oasis',
  tagline: 'لصحة المرأة والطفل',

  /** The client's positioning line — the promise the whole site carries. */
  positioning:
    'واحة د. منار مبارز ليست مجرد عيادة رضاعة طبيعية وتغذية للأم والطفل، بل مساحة آمنة للسيدات.',

  phone: '01010429267',
  whatsapp: '+201010429267',
  email: 'Dr.manar.mobarez.clinic@gmail.com',
} as const;

export const social = [
  {
    key: 'facebook',
    label: 'فيسبوك',
    href: 'https://www.facebook.com/manar.oasis',
  },
  {
    key: 'instagram',
    label: 'إنستجرام',
    href: 'https://www.instagram.com/dr.manaroasis/',
  },
  {
    key: 'youtube',
    label: 'يوتيوب',
    href: 'https://www.youtube.com/@ManarOasis',
  },
] as const;

/**
 * Builds a wa.me deep link with a pre-filled Arabic message, so Dr. Manar sees
 * what the person needs before she replies. WhatsApp is the primary booking
 * channel — the phone number is the fallback.
 */
export function waLink(message?: string): string {
  const number = site.whatsapp.replace(/[^0-9]/g, '');
  return message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
}

export const telLink = `tel:${site.phone}`;
export const mailLink = `mailto:${site.email}`;

export const branches = [
  {
    slug: 'maadi',
    name: 'واحة المعادي',
    building: 'Maadi Medical City',
    lines: [
      'كورنيش المعادي',
      'الدور الثاني، عيادة رقم ٢١٤',
      'بجوار هايبرماركت بندة وأبراج عثمان',
    ],
    mapQuery: 'Maadi Medical City, Corniche El Maadi, Cairo',
  },
  {
    slug: 'rehab',
    name: 'واحة الرحاب',
    building: 'Gateway Mall',
    lines: [
      'مدخل عيادات D1',
      'الدور الثاني - عيادة رقم 229 يمين الأسانسير',
      'فوق هايبرماركت بندة',
      'مدخل الرحاب بوابة 12، دخول مباشر للمول',
    ],
    mapQuery: 'Gateway Mall, Al Rehab City, Cairo',
  },
] as const;

export const navLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/services', label: 'العيادات' },
  { href: '/team', label: 'فريق الواحة' },
  { href: '/courses', label: 'الكورسات' },
  { href: '/online-consultations', label: 'استشارات أونلاين' },
  { href: '/locations', label: 'أماكن العيادات' },
  { href: '/contact', label: 'تواصلي معنا' },
] as const;
