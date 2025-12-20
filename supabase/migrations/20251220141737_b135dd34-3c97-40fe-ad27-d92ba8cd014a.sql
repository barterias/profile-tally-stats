-- Create a security definer function to delete social accounts with all related data
-- This allows admins to delete any account regardless of RLS restrictions

CREATE OR REPLACE FUNCTION public.delete_social_account(p_account_id uuid, p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify permission: must be admin OR owner of the account
  IF NOT has_role(auth.uid(), 'admin') THEN
    -- Check if user owns this account
    IF p_platform = 'instagram' THEN
      IF NOT EXISTS (SELECT 1 FROM instagram_accounts WHERE id = p_account_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Sem permissão para deletar esta conta';
      END IF;
    ELSIF p_platform = 'youtube' THEN
      IF NOT EXISTS (SELECT 1 FROM youtube_accounts WHERE id = p_account_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Sem permissão para deletar esta conta';
      END IF;
    ELSIF p_platform = 'tiktok' THEN
      IF NOT EXISTS (SELECT 1 FROM tiktok_accounts WHERE id = p_account_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Sem permissão para deletar esta conta';
      END IF;
    END IF;
  END IF;

  -- Delete based on platform
  IF p_platform = 'instagram' THEN
    -- Delete metrics history
    DELETE FROM instagram_metrics_history WHERE account_id = p_account_id;
    -- Delete posts
    DELETE FROM instagram_posts WHERE account_id = p_account_id;
    -- Delete account
    DELETE FROM instagram_accounts WHERE id = p_account_id;
    
  ELSIF p_platform = 'youtube' THEN
    -- Delete metrics history
    DELETE FROM youtube_metrics_history WHERE account_id = p_account_id;
    -- Delete videos
    DELETE FROM youtube_videos WHERE account_id = p_account_id;
    -- Delete account
    DELETE FROM youtube_accounts WHERE id = p_account_id;
    
  ELSIF p_platform = 'tiktok' THEN
    -- Delete metrics history
    DELETE FROM tiktok_metrics_history WHERE account_id = p_account_id;
    -- Delete videos
    DELETE FROM tiktok_videos WHERE account_id = p_account_id;
    -- Delete account
    DELETE FROM tiktok_accounts WHERE id = p_account_id;
    
  ELSE
    RAISE EXCEPTION 'Plataforma inválida: %', p_platform;
  END IF;
END;
$$;