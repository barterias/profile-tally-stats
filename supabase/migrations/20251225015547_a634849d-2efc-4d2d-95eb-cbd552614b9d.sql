-- Create metrics_snapshots table for historical tracking
CREATE TABLE public.metrics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  followers INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  range TEXT DEFAULT '7d',
  by_platform JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read snapshots
CREATE POLICY "Authenticated users can view snapshots"
ON public.metrics_snapshots
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert snapshots
CREATE POLICY "Authenticated users can create snapshots"
ON public.metrics_snapshots
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster queries by date
CREATE INDEX idx_metrics_snapshots_recorded_at ON public.metrics_snapshots(recorded_at DESC);