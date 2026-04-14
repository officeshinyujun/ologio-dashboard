// === 공통 응답 ===

export interface ApiResponse<T> {
  success: boolean
  data?: T
  meta?: PaginationMeta
  error?: { code: string; message: string }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
}

// === 인증 ===

export interface AuthTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

// === 사용자 ===

export type Department = 'security_sw' | 'software_sw' | 'it_management' | 'content_design'

export const DEPARTMENT_LABELS: Record<Department, string> = {
  security_sw: '정보보호과',
  software_sw: '소프트웨어과',
  it_management: 'IT경영과',
  content_design: '콘텐츠디자인과',
}

export type UserRole = 'student' | 'teacher' | 'admin'

export type AdminRole =
  | { type: 'system_admin' }
  | { type: 'department_admin'; department: Department }
  | { type: 'class_admin'; grade: number; class: number }

export interface User {
  _id: string
  google_id: string
  email: string
  display_name: string
  grade?: number
  class?: number
  number?: number
  student_name?: string
  department?: Department
  role: UserRole
  admin_role?: AdminRole
  google_calendar_token?: string
  fcm_token?: string
  created_at: string
  updated_at: string
}

// === 급식 ===

export interface MealItem {
  upstream_id?: number
  name: string
  allergy_code?: string
}

export interface Meal {
  _id: string
  date: string
  items: MealItem[]
  existence: boolean
  rest: boolean
  synced_at: string
}

// === 시간표 ===

export type TimetableSource = 'comcigan' | 'neis' | 'manual'

export interface TimetablePeriod {
  period: number
  subject_short: string
  subject_long: string
  teacher: string
  is_substituted: boolean
  substitution_note?: string
  room?: string
}

export interface Timetable {
  _id: string
  date: string
  grade: number
  class: number
  periods: TimetablePeriod[]
  content_hash: string
  fetched_at?: string
  source: TimetableSource
  changed_at?: string
}

// === 이벤트/일정 ===

export type EventScope =
  | { type: 'school' }
  | { type: 'department'; department: Department }
  | { type: 'class'; department: Department; grade: number; class: number }
  | { type: 'individual'; user_id: string }

export type EventType =
  | 'performance_eval'
  | 'academic_eval'
  | 'written_exam'
  | 'assignment'
  | 'school_event'
  | 'field_trip'
  | 'contest'
  | 'counseling'
  | 'vacation'
  | 'notice'
  | 'other'

export type EventSource = 'manual' | 'neis' | 'timetable'

export type SyncStatus = 'pending' | 'queued' | 'synced' | 'partial_sync' | 'not_applicable'

export interface Event {
  _id: string
  title: string
  description?: string
  scope: EventScope
  start_at: string
  end_at: string
  all_day: boolean
  timetable_period?: number
  event_type: EventType
  gcal_color_id?: string
  source: EventSource
  sync_status: SyncStatus
  synced_users: string[]
  created_by: string
  created_at: string
  updated_at: string
}

// === 학사일정 ===

export type ScheduleSource = 'neis' | 'manual'

export interface SchoolScheduleEntry {
  _id: string
  date: string
  event_name: string
  is_holiday: boolean
  source: ScheduleSource
  synced_at: string
  event_id?: string
}

// === 알림 ===

export type NotificationTarget = 'All' | 'Grade' | 'Class' | 'Department'

export type NotificationStatus = 'draft' | 'scheduled' | 'sent' | 'failed'

export interface Notification {
  _id: string
  title: string
  body: string
  target: NotificationTarget
  target_grade?: number
  target_class?: number
  target_department?: Department
  status: NotificationStatus
  sent_count: number
  created_by: string
  scheduled_at?: string
  sent_at?: string
  created_at: string
}

// === 관리자 통계 ===

export interface SyncJobStats {
  success_count: number
  failure_count: number
  success_rate: number
}

export interface GcalPushStats {
  total_processed: number
  done_count: number
  failed_count: number
  success_rate: number
}

export interface SyncHealth {
  comcigan_last_24h: SyncJobStats
  meal_last_24h: SyncJobStats
  neis_last_24h: SyncJobStats
  gcal_push_last_24h: GcalPushStats
}

export interface ActivityHeatmap {
  hourly: number[]
  daily: number[]
  peak_hour: number
  peak_day: number
  total_activities_24h: number
}

export interface AdminStats {
  total_users: number
  today_new_users: number
  gcal_connected_users: number
  gcal_sync_success_rate: number
  today_events_count: number
  pending_gcal_tasks: number
  last_comcigan_sync?: string
  last_meal_sync?: string
  last_neis_sync?: string
  sync_health: SyncHealth
  activity_heatmap: ActivityHeatmap
}

// === 동기화 로그 ===

export interface SyncLog {
  _id: string
  job_name: string
  status: 'success' | 'failed'
  run_at: string
  duration_ms?: number
  details?: string
}

// === 설정 ===

export interface ClassMappingEntry {
  grade: number
  class_from: number
  class_to: number
  department: Department
}

export interface DepartmentClassMapping {
  _id: string
  year: number
  entries: ClassMappingEntry[]
  updated_by: string
  updated_at: string
}
