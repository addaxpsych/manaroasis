/**
 * Database types.
 *
 * Hand-written to match `supabase/migrations/*.sql` because no live project
 * exists yet. Once the client's Supabase project is connected, regenerate
 * with:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 *
 * and delete this note.
 */

export type CourseTheme = 'oasis' | 'botanical';
export type EnrollmentStatus = 'pending' | 'active' | 'expired' | 'cancelled';
export type RequestStatus = 'new' | 'contacted' | 'paid' | 'enrolled' | 'rejected';
export type VideoProvider = 'youtube' | 'vimeo' | 'bunny' | 'cloudflare_stream';
export type UserRole = 'customer' | 'admin';

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type Course = {
  id: string;
  slug: string;
  title_ar: string;
  hook_ar: string | null;
  description_ar: string | null;
  cover_image: string | null;
  highlights: string[];
  delivery_label: string | null;
  price_egp: number;
  discount_price_egp: number | null;
  theme: CourseTheme;
  instructor_slug: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type Module = {
  id: string;
  course_id: string;
  title_ar: string;
  summary_ar: string | null;
  sort_order: number;
  created_at: string;
}

export type Lesson = {
  id: string;
  module_id: string;
  slug: string;
  title_ar: string;
  content_ar: string | null;
  video_provider: VideoProvider | null;
  video_id: string | null;
  duration_minutes: number | null;
  attachments: { label: string; url: string }[];
  is_preview: boolean;
  sort_order: number;
  created_at: string;
}

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_by: string | null;
  amount_paid_egp: number | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LessonProgress = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string | null;
  seconds_watched: number;
  updated_at: string;
}

export type EnrollmentRequest = {
  id: string;
  course_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  city: string | null;
  notes: string | null;
  status: RequestStatus;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

export type ContactMessage = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  subject: string | null;
  message: string;
  kind: 'contact' | 'booking' | 'online_consult';
  status: 'new' | 'read' | 'handled';
  created_at: string;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/**
 * Empty-map type for schemas with no views/enums/composites.
 *
 * These MUST be type aliases, not interfaces: postgrest-js constrains the
 * `Record<string, GenericView>` constraint, which silently collapses every
 * query result to `never`. Use the mapped-empty form instead.
 */
type Empty = { [_ in never]: never };

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      courses: Table<Course>;
      modules: Table<Module>;
      lessons: Table<Lesson>;
      enrollments: Table<Enrollment>;
      lesson_progress: Table<LessonProgress>;
      enrollment_requests: Table<EnrollmentRequest>;
      contact_messages: Table<ContactMessage>;
    };
    Views: Empty;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      can_read_lesson: { Args: { p_lesson_id: string }; Returns: boolean };
    };
    Enums: Empty;
    CompositeTypes: Empty;
  };
}
