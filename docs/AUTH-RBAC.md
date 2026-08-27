# Authentication & Role-Based Access Control (RBAC) Specification

## 1. Authentication Strategy

### 1.1 Provider & Session Management
- **Supabase Auth**: Managed user identity engine using email + password (and magic links).
- **Session Tokens**: JWT stored securely in HTTP-only, SameSite cookies via `@supabase/ssr`.
- **Custom Claims & Profile Link**: The PostgreSQL `profiles` table is automatically populated via a database trigger (`on_auth_user_created`) when a user signs up.

### 1.2 Automatic Domain-Based Classification
When a user signs up:
1. The domain of `auth.users.email` is checked.
2. If `email LIKE '%@klu.ac.in'`, `participant_type` is automatically set to `'internal'`.
3. Otherwise, `participant_type` is set to `'external'`.
4. This value is strictly immutable by the user to prevent spoofing institutional benefits.

---

## 2. Role-Permission Matrix

| Permission / Action | Participant | Student Coordinator | Staff Coordinator | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Browse Public Events & Schedules** | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Manage Own Profile & View Own Passes** | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Register for Events & Pay Fees** | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **View Event Announcements** | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Access Event Scan Terminal** | :x: | :white_check_mark: *(Assigned Only)* | :white_check_mark: *(Assigned Only)* | :white_check_mark: *(All)* |
| **Verify QR Code & Mark Attendance** | :x: | :white_check_mark: *(Assigned Only)* | :white_check_mark: *(Assigned Only)* | :white_check_mark: *(All)* |
| **Search Participant Roster** | :x: | :white_check_mark: *(Assigned Only)* | :white_check_mark: *(Assigned Only)* | :white_check_mark: *(All)* |
| **Assign / Remove Student Coordinators**| :x: | :x: | :white_check_mark: *(Assigned Only)* | :white_check_mark: *(All)* |
| **Export Event Roster (CSV/Excel)** | :x: | :x: | :white_check_mark: *(Assigned Only)* | :white_check_mark: *(All)* |
| **Create / Edit Events & Categories** | :x: | :x: | :x: | :white_check_mark: |
| **Assign Staff Coordinators** | :x: | :x: | :x: | :white_check_mark: |
| **View Global Financial Analytics** | :x: | :x: | :x: | :white_check_mark: |
| **Publish Global Announcements** | :x: | :x: | :x: | :white_check_mark: |

---

## 3. Supabase Row Level Security (RLS) Policies

All tables have RLS enabled: `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`.

### 3.1 Helper Functions for RLS
```sql
-- Check if current user is an active Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments
    WHERE user_id = auth.uid() AND role_id = 'admin'
  );
$$;

-- Check if current user is assigned Staff for an event
CREATE OR REPLACE FUNCTION is_staff_for_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_event_assignments
    WHERE user_id = auth.uid() AND event_id = p_event_id
  ) OR is_admin();
$$;

-- Check if current user is assigned Coordinator (Staff or Student) for an event
CREATE OR REPLACE FUNCTION is_coordinator_for_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_coordinator_assignments
    WHERE user_id = auth.uid() AND event_id = p_event_id
  ) OR is_staff_for_event(p_event_id);
$$;
```

### 3.2 Key Table Policies

#### `profiles`
- `SELECT`: Public profiles viewable by authenticated users for coordinator checks; full access to own profile (`auth.uid() = id`) or if `is_admin()`.
- `UPDATE`: Own profile only (`auth.uid() = id`) except `participant_type` which cannot be modified.

#### `events`
- `SELECT`: `TRUE` for `status IN ('published', 'registration_open', 'registration_closed', 'ongoing', 'completed')` or if `is_admin()`.
- `INSERT`, `UPDATE`, `DELETE`: `is_admin()`.

#### `event_registrations`
- `SELECT`: Own registrations (`auth.uid() = user_id`) OR coordinators assigned to the event (`is_coordinator_for_event(event_id)`).
- `INSERT`: Controlled via `fn_register_event_atomic` RPC (or `auth.uid() = user_id`).
- `UPDATE`: `is_admin()`.

#### `attendance`
- `SELECT`: Assigned coordinators for that event (`is_coordinator_for_event(event_id)`).
- `INSERT`: Assigned coordinators for that event (`is_coordinator_for_event(event_id)`).

#### `payments`
- `SELECT`: Own payments (via `event_registrations.user_id = auth.uid()`) OR `is_admin()`.
- `INSERT`, `UPDATE`: Handled strictly via server-side service role during webhook execution.
