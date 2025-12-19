-- Add hashtags column to campaigns table for automatic video matching
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT ARRAY[]::text[];