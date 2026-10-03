export type SubscriptionStatus = 'active' | 'renew_soon' | 'expiring_this_month' | 'expired' | 'renewed';

export type NotificationStatus = 'pending' | 'notified' | 'dismissed' | 'renewed';

export interface Customer {
  id: string;
  customer_id: string;
  customer_name: string;
  address: string;
  mobile_number: string;
  order_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined from subscriptions
  current_subscription?: Subscription;
  subscriptions?: Subscription[];
}

export interface Subscription {
  id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  is_current: boolean;
  notification_date: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  customer_id: string;
  subscription_id: string;
  notification_type: 'renewal_reminder' | 'expired' | 'renewed';
  scheduled_date: string;
  sent_at: string | null;
  status: NotificationStatus;
  read_at: string | null;
  created_at: string;
  // joined
  customer?: Customer;
  subscription?: Subscription;
}

export interface AuditLog {
  id: string;
  user_id: string;
  customer_id: string;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  total_customers: number;
  active_subscriptions: number;
  expiring_in_3_months: number;
  expiring_this_month: number;
  already_expired: number;
  recently_renewed: number;
}

export interface CustomerWithStatus extends Customer {
  computed_status: SubscriptionStatus;
  days_remaining: number | null;
  notification_date: string | null;
}

export interface ImportRecord {
  serial_number?: string | number;
  order_id: string;
  customer_name: string;
  address: string;
  mobile_number: string;
  start_date: string;
  end_date: string;
  customer_id: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
}

export interface ReportFilter {
  month: number;
  year: number;
  report_type: 'ending' | 'starting' | 'active' | 'renewed';
}
