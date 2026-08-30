-- ─────────────────────────────────────────────────────────────
-- 0005 — seed the two real courses found in designs/
--
-- Both are left UNPUBLISHED with price 0: the client has not given prices
-- yet, and publishing a course at 0 EGP would be worse than not showing it.
-- Set price and flip is_published in /admin/courses before launch.
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
with c as (select id from public.courses where slug = 'breastfeeding-prep'),
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
with c as (select id from public.courses where slug = 'beauty-starts-within')
insert into public.modules (course_id, title_ar, summary_ar, sort_order)
select c.id, 'مقدمة الكورس', 'المحتوى قيد الإعداد.', 1 from c;
