/**
 * JSON-LD builders. Search engines are how a clinic gets found, so every
 * marketing page carries structured data describing the practice, its
 * physicians and both physical branches.
 */
import { site, branches, social, SITE_URL } from '../config/site';
import { team } from '../config/team';

const BASE = SITE_URL;

export function clinicSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    '@id': `${BASE}/#clinic`,
    name: site.name,
    alternateName: site.nameLatin,
    description: site.positioning,
    url: BASE,
    telephone: `+2${site.phone}`,
    email: site.email,
    inLanguage: 'ar',
    sameAs: social.map((s) => s.href),
    medicalSpecialty: ['Endocrine', 'Pediatric', 'Nutrition', 'Dermatology', 'Surgical'],
    location: branches.map((b) => ({
      '@type': 'MedicalBusiness',
      name: `${site.name} — ${b.name}`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: [b.building, ...b.lines].join('، '),
        addressLocality: 'القاهرة',
        addressCountry: 'EG',
      },
      telephone: `+2${site.phone}`,
    })),
    employee: team.map((d) => ({
      '@type': 'Physician',
      name: d.name,
      jobTitle: d.role,
      url: `${BASE}/team/${d.slug}`,
    })),
  };
}

export function doctorSchema(slug: string) {
  const doctor = team.find((d) => d.slug === slug);
  if (!doctor) return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: doctor.name,
    jobTitle: doctor.role,
    url: `${BASE}/team/${doctor.slug}`,
    worksFor: { '@type': 'MedicalClinic', name: site.name, url: BASE },
    knowsAbout: doctor.credentials,
  };
}

export function courseSchema(input: {
  title: string;
  description: string;
  slug: string;
  instructorName?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: input.title,
    description: input.description,
    url: `${BASE}/courses/${input.slug}`,
    inLanguage: 'ar',
    provider: { '@type': 'Organization', name: site.name, url: BASE },
    ...(input.instructorName
      ? { instructor: { '@type': 'Person', name: input.instructorName } }
      : {}),
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${BASE}${item.path}`,
    })),
  };
}
