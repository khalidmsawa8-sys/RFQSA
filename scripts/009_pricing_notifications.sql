-- Add pricing, views, expiration, and notification features

-- Add expiration and view tracking to RFQs
ALTER TABLE public.rfqs 
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Add individual item pricing to quotes (modify existing structure)
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS items jsonb;

-- Create RFQ views tracking table
CREATE TABLE IF NOT EXISTS public.rfq_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(rfq_id, vendor_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_rfq', 'new_quote', 'quote_accepted', 'order_update', 'rfq_reminder')),
  title text NOT NULL,
  message text NOT NULL,
  rfq_id uuid REFERENCES public.rfqs(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  scheduled_for timestamptz,
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE sent_at IS NULL;

-- Enable RLS
ALTER TABLE public.rfq_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RFQ Views policies
CREATE POLICY "rfq_views_select_own" ON public.rfq_views FOR SELECT USING (
  vendor_id = auth.uid() OR 
  rfq_id IN (SELECT id FROM public.rfqs WHERE client_id = auth.uid()) OR
  is_admin()
);

CREATE POLICY "rfq_views_insert_vendor" ON public.rfq_views FOR INSERT WITH CHECK (
  vendor_id = auth.uid()
);

-- Notification policies
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (
  user_id = auth.uid() OR is_admin()
);

CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (
  user_id = auth.uid()
);

CREATE POLICY "notifications_insert_system" ON public.notifications FOR INSERT WITH CHECK (true);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_rfq_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.rfqs 
  SET view_count = view_count + 1 
  WHERE id = NEW.rfq_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for view counting
DROP TRIGGER IF EXISTS trigger_increment_rfq_views ON public.rfq_views;
CREATE TRIGGER trigger_increment_rfq_views
  AFTER INSERT ON public.rfq_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_rfq_view_count();

-- Function to create notification for new RFQ (to all vendors)
CREATE OR REPLACE FUNCTION notify_vendors_new_rfq()
RETURNS TRIGGER AS $$
BEGIN
  -- Immediate notification
  INSERT INTO public.notifications (user_id, type, title, message, rfq_id, scheduled_for, sent_at)
  SELECT 
    id,
    'new_rfq',
    'طلب عرض سعر جديد',
    'تم إضافة طلب عرض سعر جديد لـ ' || NEW.car_make || ' ' || NEW.car_model,
    NEW.id,
    now(),
    now()
  FROM public.profiles
  WHERE role = 'vendor';
  
  -- 1 hour reminder
  INSERT INTO public.notifications (user_id, type, title, message, rfq_id, scheduled_for)
  SELECT 
    id,
    'rfq_reminder',
    'تذكير: طلب عرض سعر',
    'لا تفوت فرصة تقديم عرض لطلب ' || NEW.car_make || ' ' || NEW.car_model,
    NEW.id,
    now() + interval '1 hour'
  FROM public.profiles
  WHERE role = 'vendor';
  
  -- 6 hour reminder
  INSERT INTO public.notifications (user_id, type, title, message, rfq_id, scheduled_for)
  SELECT 
    id,
    'rfq_reminder',
    'تذكير أخير: طلب عرض سعر',
    'آخر فرصة لتقديم عرض لطلب ' || NEW.car_make || ' ' || NEW.car_model,
    NEW.id,
    now() + interval '6 hours'
  FROM public.profiles
  WHERE role = 'vendor';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new RFQ notifications
DROP TRIGGER IF EXISTS trigger_notify_new_rfq ON public.rfqs;
CREATE TRIGGER trigger_notify_new_rfq
  AFTER INSERT ON public.rfqs
  FOR EACH ROW
  EXECUTE FUNCTION notify_vendors_new_rfq();

-- Function to notify client when quote is received
CREATE OR REPLACE FUNCTION notify_client_new_quote()
RETURNS TRIGGER AS $$
DECLARE
  rfq_record RECORD;
BEGIN
  SELECT * INTO rfq_record FROM public.rfqs WHERE id = NEW.rfq_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, quote_id, rfq_id, scheduled_for, sent_at)
  VALUES (
    rfq_record.client_id,
    'new_quote',
    'عرض سعر جديد',
    'تم استلام عرض سعر جديد لطلبك',
    NEW.id,
    NEW.rfq_id,
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new quote notifications
DROP TRIGGER IF EXISTS trigger_notify_new_quote ON public.quotes;
CREATE TRIGGER trigger_notify_new_quote
  AFTER INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_new_quote();
