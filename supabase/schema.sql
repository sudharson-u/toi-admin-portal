-- TOI Subscription Manager - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  address TEXT DEFAULT '',
  mobile_number TEXT DEFAULT '',
  order_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table (one record per subscription period, supports history)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'renew_soon', 'expiring_this_month', 'expired', 'renewed')),
  is_current BOOLEAN NOT NULL DEFAULT true,
  notification_date DATE GENERATED ALWAYS AS (
    -- 3 calendar months before end_date
    (end_date - INTERVAL '3 months')::DATE
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'renewal_reminder'
    CHECK (notification_type IN ('renewal_reminder', 'expired', 'renewed')),
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'dismissed', 'renewed')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_mobile_number ON customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_order_id ON customers(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_current ON subscriptions(is_current);
CREATE INDEX IF NOT EXISTS idx_subscriptions_notification_date ON subscriptions(notification_date);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_date ON notifications(scheduled_date);

-- Full-text search index for customers
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers 
  USING gin(to_tsvector('english', 
    COALESCE(customer_id, '') || ' ' ||
    COALESCE(customer_name, '') || ' ' ||
    COALESCE(address, '') || ' ' ||
    COALESCE(mobile_number, '') || ' ' ||
    COALESCE(order_id, '')
  ));

-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: generate renewal notifications
-- Called after subscription insert/update
CREATE OR REPLACE FUNCTION create_renewal_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if this is the current subscription
  IF NEW.is_current = true THEN
    -- Remove old pending notifications for this subscription
    DELETE FROM notifications 
    WHERE subscription_id = NEW.id AND status = 'pending';
    
    -- Create new notification at notification_date
    INSERT INTO notifications (
      customer_id,
      subscription_id, 
      notification_type,
      scheduled_date,
      status
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      'renewal_reminder',
      NEW.notification_date,
      'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_renewal_notification_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION create_renewal_notification();

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: only authenticated users can access data
CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read subscriptions"
  ON subscriptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert subscriptions"
  ON subscriptions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update subscriptions"
  ON subscriptions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read notifications"
  ON notifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update notifications"
  ON notifications FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read audit_logs"
  ON audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert audit_logs"
  ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
