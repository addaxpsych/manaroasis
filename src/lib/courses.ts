/**
 * Course data access.
 *
 * Every function degrades to an empty result rather than throwing. The site
 * ships before the client's Supabase project is connected, and a marketing
 * site that 500s because the database is not wired yet is worse than one that
 * shows an honest empty state.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course, Database, Lesson, Module } from './supabase/types';

type Client = SupabaseClient<Database>;

export interface CourseOutline extends Course {
  modules: (Module & { lessons: Lesson[] })[];
}

export async function listPublishedCourses(supabase: Client): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

/** Admin listing — includes drafts. */
export async function listAllCourses(supabase: Client): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getCourseBySlug(
  supabase: Client,
  slug: string,
): Promise<Course | null> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Full outline. RLS decides which lessons come back: previews for everyone,
 * everything for an actively enrolled user. A visitor without an enrollment
 * simply sees fewer lessons, which is exactly what the sales page should show.
 */
export async function getCourseOutline(
  supabase: Client,
  slug: string,
): Promise<CourseOutline | null> {
  const course = await getCourseBySlug(supabase, slug);
  if (!course) return null;

  try {
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', course.id)
      .order('sort_order', { ascending: true });
    if (modulesError) throw modulesError;

    const moduleIds = (modules ?? []).map((m) => m.id);
    if (moduleIds.length === 0) return { ...course, modules: [] };

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('sort_order', { ascending: true });
    if (lessonsError) throw lessonsError;

    return {
      ...course,
      modules: (modules ?? []).map((m) => ({
        ...m,
        lessons: (lessons ?? []).filter((l) => l.module_id === m.id),
      })),
    };
  } catch {
    return { ...course, modules: [] };
  }
}

export function formatPrice(course: Pick<Course, 'price_egp' | 'discount_price_egp'>): {
  display: string;
  was?: string;
  isFree: boolean;
} {
  const effective = course.discount_price_egp ?? course.price_egp;
  if (!effective) return { display: 'سيتم الإعلان قريباً', isFree: true };
  return {
    display: `${effective.toLocaleString('en-EG')} ج.م`,
    was:
      course.discount_price_egp && course.price_egp > course.discount_price_egp
        ? `${course.price_egp.toLocaleString('en-EG')} ج.م`
        : undefined,
    isFree: false,
  };
}

/** Percentage of a course's lessons the user has completed. */
export function progressPercent(totalLessons: number, completed: number): number {
  if (totalLessons === 0) return 0;
  return Math.round((completed / totalLessons) * 100);
}
