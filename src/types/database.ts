export type ParticipantType = 'internal' | 'external';
export type UserRole = 'admin' | 'staff_coordinator' | 'student_coordinator' | 'participant';

export type EventStatus = 
  | 'draft' 
  | 'published' 
  | 'registration_open' 
  | 'registration_closed' 
  | 'ongoing' 
  | 'completed';

export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded';
export type ScanMethod = 'qr_camera' | 'manual_search';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  mobile_number: string | null;
  gender: "male" | "female" | "other" | null;
  participant_type: ParticipantType;
  register_number: string | null;
  school: string | null;
  college_name: string | null;
  city: string | null;
  pincode: string | null;
  course: string | null;
  department: string | null;
  year_of_study: number | null;
  avatar_url: string | null;
  is_profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: UserRole;
  name: string;
  description: string | null;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: UserRole;
  assigned_by: string | null;
  created_at: string;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  created_at: string;
}

export interface Event {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  rules: string | null;
  school_or_dept: string;
  venue: string;
  event_date: string;
  start_time: string;
  end_time: string;
  registration_start: string;
  registration_end: string;
  registration_fee: number;
  participant_limit: number;
  allow_internal: boolean;
  allow_external: boolean;
  is_pro_event?: boolean;
  status: EventStatus;
  banner_url: string | null;
  created_at: string;
  updated_at: string;
  category?: EventCategory;
  registrations_count?: number;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  registration_code: string;
  status: RegistrationStatus;
  payment_status: PaymentStatus;
  qr_secret_nonce: string;
  created_at: string;
  updated_at: string;
  event?: Event;
  profile?: Profile;
  payment?: Payment;
  attendance?: Attendance;
}

export interface Payment {
  id: string;
  registration_id: string;
  amount: number;
  currency: string;
  provider: string;
  order_id: string;
  payment_id: string | null;
  status: PaymentStatus;
  raw_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  registration_id: string;
  event_id: string;
  scanned_by: string;
  scanned_at: string;
  scan_method: ScanMethod;
  registration?: EventRegistration;
}

export interface Announcement {
  id: string;
  event_id: string | null;
  title: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  event?: Event;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}
