-- Create campaign_payment_records table to track all payments
CREATE TABLE public.campaign_payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly', 'pay_per_view')),
  period_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  views_count BIGINT DEFAULT 0,
  videos_count INTEGER DEFAULT 0,
  position INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id, period_type, period_date)
);

-- Enable RLS
ALTER TABLE public.campaign_payment_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all payment records"
ON public.campaign_payment_records
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Campaign owners can manage their campaign payments"
ON public.campaign_payment_records
FOR ALL
USING (EXISTS (
  SELECT 1 FROM campaign_owners
  WHERE campaign_owners.campaign_id = campaign_payment_records.campaign_id
  AND campaign_owners.user_id = auth.uid()
));

CREATE POLICY "Users can view their own payment records"
ON public.campaign_payment_records
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_payment_records_campaign ON public.campaign_payment_records(campaign_id);
CREATE INDEX idx_payment_records_user ON public.campaign_payment_records(user_id);
CREATE INDEX idx_payment_records_period ON public.campaign_payment_records(period_type, period_date);
CREATE INDEX idx_payment_records_status ON public.campaign_payment_records(status);

-- Add trigger for updated_at
CREATE TRIGGER update_campaign_payment_records_updated_at
BEFORE UPDATE ON public.campaign_payment_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();