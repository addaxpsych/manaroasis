-- ─────────────────────────────────────────────────────────────
-- 0005 — seed the real courses
--
-- The two paid courses from designs/ are left UNPUBLISHED with price 0: the
-- client has not given prices yet, and publishing a course at 0 EGP would be
-- worse than not showing it. Set price and flip is_published in /admin/courses.
--
-- بودكاست الواحة is different: it is free and public, so it ships published.
--
-- Lesson bodies and video ids are intentionally empty — they are the
-- client's content to enter, not ours to invent. Titles are derived from
-- the promises the posters actually make.
-- ─────────────────────────────────────────────────────────────

-- ── Course 1 — breastfeeding prep (oasis theme, from course1.jpg) ──
insert into public.courses (
  slug, title_ar, hook_ar, description_ar, cover_image, highlights,
  delivery_label, price_egp, theme, instructor_slug, is_published, sort_order
) values (
  'breastfeeding-prep',
  'كورس الاستعداد للرضاعة قبل الولادة',
  'الرضاعة الناجحة تبدأ قبل الولادة… وليس بعدها.',
  'كورس عملي مسجّل يجهّزك للرضاعة قبل ما طفلك يوصل. بنمشي معاكِ خطوة بخطوة: إيه اللي بيحصل في جسمك، إزاي تبدأي الرضعة الأولى صح، وإزاي تتجنبي المشاكل الشائعة قبل ما تحصل — كل ده بشرح هادي ومن غير أي لوم.',
  '/images/courses/breastfeeding-prep.jpg',
  '["استعدي بثقة","زيادة إدرار الحليب","وضعيات الرضاعة الصحيحة","تجنبي المشاكل الشائعة","رحلة رضاعة ناجحة بإذن الله"]'::jsonb,
  'أونلاين | مسجل',
  0,
  'oasis',
  'manar-mobarez',
  false,
  1
) on conflict (slug) do nothing;

-- ── Course 2 — beauty starts within (botanical theme) ──
insert into public.courses (
  slug, title_ar, hook_ar, description_ar, cover_image, highlights,
  delivery_label, price_egp, theme, instructor_slug, is_published, sort_order
) values (
  'beauty-starts-within',
  'الجمال يبدأ من الداخل',
  'ابدئي رحلتك نحو جمالك من الداخل.',
  'كورس للسيدات عن العلاقة الحقيقية بين التغذية والبشرة والشعر. مش وصفات ولا منتجات — فهم عملي لإزاي جسمك بيبني بشرة صحية وشعر قوي، وإيه اللي بيأثر عليهم فعلاً من الداخل.',
  '/images/courses/beauty-starts-within.jpg',
  '["بشرة صحية من الداخل","شعر أقوى","تغذية متوازنة","عادات يومية واقعية"]'::jsonb,
  'أونلاين | مسجل',
  0,
  'botanical',
  'manar-mobarez',
  false,
  2
) on conflict (slug) do nothing;

-- ── Modules and lessons for course 1 ──
with c as (
  select co.id from public.courses co
  where co.slug = 'breastfeeding-prep'
    -- Skip entirely if this course already has modules, so re-running the
    -- file cannot duplicate the curriculum.
    and not exists (select 1 from public.modules m where m.course_id = co.id)
),
m1 as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'قبل الولادة: التجهيز', 'إيه اللي تعرفيه وتجهزيه قبل ما طفلك يوصل.', 1 from c
  returning id
),
m2 as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'الرضعة الأولى', 'أول ساعة وأول أيام — الأهم في الرحلة كلها.', 2 from c
  returning id
),
m3 as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'الوضعيات وإدرار اللبن', 'الوضعية الصح بتحل أغلب المشاكل قبل ما تبدأ.', 3 from c
  returning id
),
m4 as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'المشاكل الشائعة', 'نتعرف عليها بدري ونتعامل معاها بهدوء.', 4 from c
  returning id
)
insert into public.lessons (module_id, slug, title_ar, sort_order, is_preview)
select id, 'why-before-birth', 'ليه نبدأ قبل الولادة؟', 1, true  from m1
union all
select id, 'body-changes',     'التغيرات الطبيعية في الجسم',   2, false from m1
union all
select id, 'what-to-prepare',  'إيه اللي تجهزيه فعلاً',        3, false from m1
union all
select id, 'first-hour',       'الساعة الذهبية الأولى',        1, false from m2
union all
select id, 'first-days',       'أول أيام: اللبأ والرضعات',     2, false from m2
union all
select id, 'positions',        'وضعيات الرضاعة الصحيحة',       1, false from m3
union all
select id, 'latch',            'الالتصاق الصحيح',              2, false from m3
union all
select id, 'milk-supply',      'زيادة إدرار الحليب',           3, false from m3
union all
select id, 'pain-cracks',      'الألم والتشققات',              1, false from m4
union all
select id, 'is-it-enough',     'هل اللبن كافي؟',               2, false from m4
union all
select id, 'back-to-work',     'العودة للعمل والحفاظ على الرضاعة', 3, false from m4;

-- ── Module scaffold for course 2. The client has not supplied a
--    curriculum for this one yet, so it stays a single placeholder
--    module rather than invented lesson titles. ──
with c as (
  select co.id from public.courses co
  where co.slug = 'beauty-starts-within'
    and not exists (select 1 from public.modules m where m.course_id = co.id)
)
insert into public.modules (course_id, title_ar, summary_ar, sort_order)
select c.id, 'مقدمة الكورس', 'المحتوى قيد الإعداد.', 1 from c;

-- ── Podcast — بودكاست الواحة ────────────────────────────────
-- A FREE, public course: published, price 0, access 'free', and every
-- lesson flagged is_preview so the RLS policy on `lessons` lets anonymous
-- visitors read them. No account and no enrollment required.
insert into public.courses (
  slug, title_ar, hook_ar, description_ar, cover_image, highlights,
  delivery_label, price_egp, theme, access, instructor_slug, is_published, sort_order
) values (
  'podcast',
  'بودكاست الواحة',
  'حلقات مفتوحة للجميع، من غير حساب ومن غير اشتراك.',
  'حلقات بودكاست الواحة مع د. منار مبارز وضيوفها، عن صحة المرأة والطفل: الحمل والرضاعة والتغذية والهرمونات والصحة النفسية. اتفرجي على أي حلقة مباشرة من غير تسجيل.',
  '/images/courses/podcast.jpg',
  '["مجاني بالكامل","من غير تسجيل","حلقات مع ضيوف متخصصين","صحة المرأة والطفل"]'::jsonb,
  'أونلاين | مجاني',
  0,
  'oasis',
  'free',
  'manar-mobarez',
  true,
  0
) on conflict (slug) do nothing;

with c as (
  select co.id from public.courses co
  where co.slug = 'podcast'
    and not exists (select 1 from public.modules m where m.course_id = co.id)
),
m as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'الحلقات', 'كل حلقات بودكاست الواحة.', 1 from c
  returning id
)
insert into public.lessons (module_id, slug, title_ar, content_ar, video_provider, video_id, is_preview, sort_order)
select id, v.slug, v.title, v.note, 'youtube', v.vid, true, v.ord
from m, (values
  ('ep-1', 'الصيام مع الحمل والرضاعة', 'مع د. محمد ثابت', 'tFrM6EIG_Vs', 1),
  ('ep-2', 'العلاج الطبيعي لصحة المرأة', 'مع د. إيمان إبراهيم', 'ZZ4mvJXb4cc', 2),
  ('ep-3', 'هل ينهي العلاج الطبيعي آلام النساء؟', null, '2RBDGep7a7Q', 3),
  ('ep-4', 'تغذية الأم أثناء الحمل', null, 'DPr-K7PyBlE', 4),
  ('ep-5', 'تغذية الأم أثناء الرضاعة', null, 'Vpiuc5aBenI', 5),
  ('ep-6', 'سرطان الثدي', null, '7t70r3H49Rs', 6),
  ('ep-7', 'هرمونات النساء وعلاجها بالتغذية', null, 'D8jFphE8PhM', 7),
  ('ep-8', 'الصحة النفسية للمرأة بين الحمل والرضاعة', null, 'GvqKNh5wk6w', 8)
) as v(slug, title, note, vid, ord);
