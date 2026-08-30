/**
 * The seven members of فريق الواحة.
 *
 * Credentials are transcribed verbatim from the posters in `designs/`
 * (`all drs.jpg` plus the five solo posters). Do not paraphrase medical
 * credentials — they are regulated claims.
 *
 * `photo` maps to the solo poster where one exists. د. نادين كامل and
 * د. ريهام محي الدين have no solo poster yet, so they fall back to a crop
 * of the team poster until real headshots are supplied.
 */

export interface Doctor {
  slug: string;
  name: string;
  /** Short role shown under the name on cards. */
  role: string;
  /** The «عيادة …» this person runs, as the practice names it. */
  clinic: string;
  credentials: string[];
  photo: string;
  hasSoloPortrait: boolean;
  featured?: boolean;
}

export const team: Doctor[] = [
  {
    slug: 'manar-mobarez',
    name: 'د. منار محمد مبارز',
    role: 'السكر والغدد الصماء والتغذية العلاجية',
    clinic: 'عيادة السكر والغدد والتغذية العلاجية',
    credentials: [
      'أخصائي السكر والهرمونات والغدد الصماء',
      'ماجستير طب عين شمس',
      'أخصائي التغذية العلاجية',
      'استشاري بالبورد الدولي للرضاعة الطبيعية (IBCLC)',
      'مثقف حمل وولادة طبيعي',
    ],
    photo: '/images/team/manar-mobarez.jpg',
    hasSoloPortrait: true,
    featured: true,
  },
  {
    slug: 'mostafa-elghandour',
    name: 'أ.د. مصطفى الغندور',
    role: 'جراحة الأطفال',
    clinic: 'عيادة جراحة أطفال',
    credentials: [
      'استشاري جراحات الأطفال',
      'أستاذ مساعد جراحة الأطفال بطن عين شمس',
      'عضو كلية الجراحين الملكية بإنجلترا',
      'عضو الجمعية المصرية لجراحة الأطفال',
    ],
    photo: '/images/team/mostafa-elghandour.jpg',
    hasSoloPortrait: true,
  },
  {
    slug: 'amira-maher',
    name: 'د. أميرة ماهر',
    role: 'الجراحة العامة وجراحات الثدي',
    clinic: 'عيادة الجراحة',
    credentials: [
      'استشاري الجراحة العامة وجراحات الثدي والشرج',
      'دكتوراة جراحة عامة جامعة عين شمس',
      'البورد الأوروبي في جراحات الثدي',
    ],
    photo: '/images/team/amira-maher.jpg',
    hasSoloPortrait: true,
  },
  {
    slug: 'mai-hesham',
    name: 'د. مي هشام',
    role: 'طب الأطفال والرضاعة الطبيعية',
    clinic: 'عيادة الأطفال',
    credentials: [
      'طبيب أطفال',
      'استشاري دولي رضاعة طبيعية',
      'مدير رعاية الأمومة والطفولة بالمعادي',
    ],
    photo: '/images/team/mai-hesham.jpg',
    hasSoloPortrait: true,
  },
  {
    slug: 'alia-zayda',
    name: 'عالية زايدة',
    role: 'كوتشينج نوم الطفولة المبكرة',
    clinic: 'عيادة كوتشينج نوم الأطفال',
    credentials: [
      'كوتش نوم معتمد للطفولة المبكرة',
      'حائزة على دبلوم تعليم دمج وخاص من جامعة UCL',
      'معلمة تربية إيجابية',
      'معلمة طفولة مبكرة',
    ],
    photo: '/images/team/alia-zayda.jpg',
    hasSoloPortrait: true,
  },
  {
    slug: 'nadine-kamel',
    name: 'د. نادين كامل',
    role: 'تغذية الأطفال العلاجية',
    clinic: 'عيادة تغذية الأطفال',
    credentials: [
      'أخصائي الأطفال والتغذية العلاجية للأطفال',
      'زميل الكلية الملكية البريطانية لطب الأطفال',
    ],
    photo: '/images/team/nadine-kamel.jpg',
    hasSoloPortrait: false,
  },
  {
    slug: 'reham-mohieldin',
    name: 'د. ريهام محي الدين',
    role: 'الجلدية والتجميل والليزر',
    clinic: 'عيادة الجلدية والليزر',
    credentials: [
      'استشاري ومدرس الجلدية والتجميل والليزر',
      'عضو الجمعية المصرية للبهاق',
      'عضو الجمعية المصرية لمناظير الجلد',
    ],
    photo: '/images/team/reham-mohieldin.jpg',
    hasSoloPortrait: false,
  },
];

export const getDoctor = (slug: string) => team.find((d) => d.slug === slug);
