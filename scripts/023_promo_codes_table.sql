-- Migration 023: Create promo_codes table for coupons management

CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  target TEXT NOT NULL DEFAULT 'subtotal' CHECK (target IN ('delivery', 'subtotal')),
  type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
  value NUMERIC NOT NULL CHECK (value > 0),
  label TEXT NOT NULL,
  description TEXT,
  min_order_value NUMERIC DEFAULT 0,
  max_discount_cap NUMERIC,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy coupon lookup
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes (code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_target ON promo_codes (target);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes (is_active);

-- Seed initial promo codes with real 0 usage
INSERT INTO promo_codes (id, code, target, type, value, label, description, min_order_value, is_active, usage_count)
VALUES
  ('promo-freeship', 'FREESHIP', 'delivery', 'percent', 100, 'شحن وتوصيل مجاني 100%', 'كود خصم كامل قيمة رسوم التوصيل', 0, true, 0),
  ('promo-ship50', 'SHIP50', 'delivery', 'percent', 50, 'خصم 50% على رسوم الشحن', 'تخفيض نصف رسوم التوصيل', 150, true, 0),
  ('promo-rifq10', 'RIFQ10', 'subtotal', 'percent', 10, 'خصم 10% من إجمالي الفاتورة', 'خصم خاص لعملاء منصة رفق', 100, true, 0),
  ('promo-rifq15', 'RIFQ15', 'subtotal', 'percent', 15, 'خصم 15% خاص من إجمالي الفاتورة', 'خصم للطلبات فوق 500 ر.س', 500, true, 0),
  ('promo-welcome', 'WELCOME', 'subtotal', 'percent', 10, 'خصم ترحيبي 10%', 'خصم للمستخدمين الجدد', 50, true, 0),
  ('promo-save50', 'SAVE50', 'subtotal', 'fixed', 50, 'خصم فوري 50 ر.س', 'خصم نقدي مباشر', 300, true, 0),
  ('promo-save100', 'SAVE100', 'subtotal', 'fixed', 100, 'خصم فوري 100 ر.س', 'خصم نقدي مباشر للطلبات الكبيرة', 1000, true, 0)
ON CONFLICT (code) DO UPDATE SET usage_count = EXCLUDED.usage_count;
