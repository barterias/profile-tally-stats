-- 1. Criar tabela de donos de campanha (vincular cliente à campanha)
CREATE TABLE public.campaign_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.campaign_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaign owners" ON public.campaign_owners FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own campaign ownership" ON public.campaign_owners FOR SELECT USING (auth.uid() = user_id);

-- 2. Criar tabela de participantes de campanha (clipadores)
CREATE TABLE public.campaign_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected')),
  applied_at timestamptz DEFAULT now() NOT NULL,
  approved_at timestamptz,
  approved_by uuid,
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage participants" ON public.campaign_participants FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Campaign owners can manage participants" ON public.campaign_participants FOR ALL USING (
  EXISTS (SELECT 1 FROM campaign_owners WHERE campaign_id = campaign_participants.campaign_id AND user_id = auth.uid())
);
CREATE POLICY "Users can view their own participation" ON public.campaign_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can request participation" ON public.campaign_participants FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'requested');

-- 3. Criar tabela de carteira do usuário
CREATE TABLE public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  available_balance decimal(10,2) DEFAULT 0 NOT NULL,
  pending_balance decimal(10,2) DEFAULT 0 NOT NULL,
  total_earned decimal(10,2) DEFAULT 0 NOT NULL,
  total_withdrawn decimal(10,2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage wallets" ON public.user_wallets FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 4. Criar tabela de transações da carteira
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('earning', 'withdrawal', 'bonus', 'adjustment')),
  amount decimal(10,2) NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage transactions" ON public.wallet_transactions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 5. Criar tabela de solicitações de saque
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  pix_key text,
  pix_type text CHECK (pix_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  requested_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz,
  processed_by uuid,
  rejection_reason text,
  paid_at timestamptz
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payout requests" ON public.payout_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create payout requests" ON public.payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can manage payout requests" ON public.payout_requests FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 6. Criar tabela de ledger de pagamentos (histórico completo)
CREATE TABLE public.payouts_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id uuid REFERENCES public.payout_requests(id),
  action text NOT NULL CHECK (action IN ('requested', 'approved', 'rejected', 'paid')),
  performed_by uuid NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.payouts_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ledger" ON public.payouts_ledger FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own ledger" ON public.payouts_ledger FOR SELECT USING (
  EXISTS (SELECT 1 FROM payout_requests WHERE id = payouts_ledger.payout_request_id AND user_id = auth.uid())
);

-- 7. Criar tabela de estimativas de ganhos do clipador
CREATE TABLE public.clipper_earnings_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  video_id uuid,
  views_count bigint DEFAULT 0,
  estimated_earnings decimal(10,2) DEFAULT 0,
  period_start date,
  period_end date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.clipper_earnings_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own earnings" ON public.clipper_earnings_estimates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage earnings" ON public.clipper_earnings_estimates FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Campaign owners can view campaign earnings" ON public.clipper_earnings_estimates FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_owners WHERE campaign_id = clipper_earnings_estimates.campaign_id AND user_id = auth.uid())
);

-- 8. Adicionar coluna role na tabela user_roles se não existir (para client)
-- Primeiro verificar se 'client' já existe no enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'client';
  END IF;
END$$;

-- 9. Criar views importantes

-- View: campanhas disponíveis para o usuário
CREATE OR REPLACE VIEW public.user_available_campaigns AS
SELECT 
  c.*,
  CASE 
    WHEN co.user_id IS NOT NULL THEN 'owner'
    WHEN cp.status = 'approved' THEN 'participant'
    WHEN cp.status = 'requested' THEN 'pending'
    ELSE 'available'
  END as user_status,
  co.user_id as owner_id,
  cp.user_id as participant_id,
  cp.status as participation_status
FROM campaigns c
LEFT JOIN campaign_owners co ON c.id = co.campaign_id
LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id;

-- View: participantes aprovados
CREATE OR REPLACE VIEW public.approved_campaign_participants AS
SELECT 
  cp.*,
  p.username,
  p.avatar_url,
  c.name as campaign_name
FROM campaign_participants cp
JOIN profiles p ON cp.user_id = p.id
JOIN campaigns c ON cp.campaign_id = c.id
WHERE cp.status = 'approved';

-- View: participantes pendentes
CREATE OR REPLACE VIEW public.pending_campaign_participants AS
SELECT 
  cp.*,
  p.username,
  p.avatar_url,
  c.name as campaign_name
FROM campaign_participants cp
JOIN profiles p ON cp.user_id = p.id
JOIN campaigns c ON cp.campaign_id = c.id
WHERE cp.status = 'requested';

-- View: resumo da campanha
CREATE OR REPLACE VIEW public.campaign_summary AS
SELECT 
  c.id,
  c.name,
  c.is_active,
  c.start_date,
  c.end_date,
  COALESCE(SUM(cv.views), 0) as total_views,
  COALESCE(SUM(cv.likes), 0) as total_likes,
  COALESCE(SUM(cv.comments), 0) as total_comments,
  COALESCE(SUM(cv.shares), 0) as total_shares,
  COUNT(DISTINCT cv.id) as total_posts,
  COUNT(DISTINCT cv.submitted_by) as total_clippers,
  CASE 
    WHEN COALESCE(SUM(cv.views), 0) > 0 
    THEN ROUND(((COALESCE(SUM(cv.likes), 0) + COALESCE(SUM(cv.comments), 0) + COALESCE(SUM(cv.shares), 0))::decimal / COALESCE(SUM(cv.views), 1)) * 100, 2)
    ELSE 0 
  END as engagement_rate
FROM campaigns c
LEFT JOIN campaign_videos cv ON c.id = cv.campaign_id
GROUP BY c.id, c.name, c.is_active, c.start_date, c.end_date;

-- View: distribuição por plataforma
CREATE OR REPLACE VIEW public.campaign_platform_distribution AS
SELECT 
  campaign_id,
  platform,
  COUNT(*) as video_count,
  COALESCE(SUM(views), 0) as total_views,
  COALESCE(SUM(likes), 0) as total_likes
FROM campaign_videos
GROUP BY campaign_id, platform;

-- View: ranking de views
CREATE OR REPLACE VIEW public.ranking_views AS
SELECT 
  cv.submitted_by as user_id,
  p.username,
  p.avatar_url,
  cv.campaign_id,
  c.name as campaign_name,
  COUNT(cv.id) as total_videos,
  COALESCE(SUM(cv.views), 0) as total_views,
  COALESCE(SUM(cv.likes), 0) as total_likes,
  ROW_NUMBER() OVER (PARTITION BY cv.campaign_id ORDER BY COALESCE(SUM(cv.views), 0) DESC) as rank_position
FROM campaign_videos cv
JOIN profiles p ON cv.submitted_by = p.id
JOIN campaigns c ON cv.campaign_id = c.id
WHERE cv.verified = true
GROUP BY cv.submitted_by, p.username, p.avatar_url, cv.campaign_id, c.name;

-- View: carteira do usuário
CREATE OR REPLACE VIEW public.user_wallet_view AS
SELECT 
  uw.*,
  p.username,
  (SELECT COUNT(*) FROM payout_requests pr WHERE pr.user_id = uw.user_id AND pr.status = 'pending') as pending_requests
FROM user_wallets uw
JOIN profiles p ON uw.user_id = p.id;

-- View: admin de pagamentos
CREATE OR REPLACE VIEW public.payout_admin_view AS
SELECT 
  pr.*,
  p.username,
  p.avatar_url,
  uw.available_balance,
  uw.total_earned,
  uw.total_withdrawn
FROM payout_requests pr
JOIN profiles p ON pr.user_id = p.id
LEFT JOIN user_wallets uw ON pr.user_id = uw.user_id
ORDER BY pr.requested_at DESC;

-- 10. Criar RPCs

-- RPC: Solicitar participação em campanha
CREATE OR REPLACE FUNCTION public.request_campaign_participation(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO campaign_participants (campaign_id, user_id, status)
  VALUES (p_campaign_id, auth.uid(), 'requested');
END;
$$;

-- RPC: Aprovar participante
CREATE OR REPLACE FUNCTION public.approve_participant(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
BEGIN
  SELECT campaign_id INTO v_campaign_id FROM campaign_participants WHERE id = p_participant_id;
  
  IF NOT has_role(auth.uid(), 'admin') AND NOT EXISTS (
    SELECT 1 FROM campaign_owners WHERE campaign_id = v_campaign_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar participantes';
  END IF;
  
  UPDATE campaign_participants 
  SET status = 'approved', approved_at = now(), approved_by = auth.uid()
  WHERE id = p_participant_id;
END;
$$;

-- RPC: Rejeitar participante
CREATE OR REPLACE FUNCTION public.reject_participant(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
BEGIN
  SELECT campaign_id INTO v_campaign_id FROM campaign_participants WHERE id = p_participant_id;
  
  IF NOT has_role(auth.uid(), 'admin') AND NOT EXISTS (
    SELECT 1 FROM campaign_owners WHERE campaign_id = v_campaign_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão para rejeitar participantes';
  END IF;
  
  UPDATE campaign_participants 
  SET status = 'rejected'
  WHERE id = p_participant_id;
END;
$$;

-- RPC: Solicitar saque
CREATE OR REPLACE FUNCTION public.request_payout(p_amount decimal, p_pix_key text, p_pix_type text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available decimal;
  v_request_id uuid;
BEGIN
  SELECT available_balance INTO v_available FROM user_wallets WHERE user_id = auth.uid();
  
  IF v_available IS NULL OR v_available < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;
  
  INSERT INTO payout_requests (user_id, amount, pix_key, pix_type)
  VALUES (auth.uid(), p_amount, p_pix_key, p_pix_type)
  RETURNING id INTO v_request_id;
  
  UPDATE user_wallets 
  SET available_balance = available_balance - p_amount,
      pending_balance = pending_balance + p_amount,
      updated_at = now()
  WHERE user_id = auth.uid();
  
  INSERT INTO payouts_ledger (payout_request_id, action, performed_by)
  VALUES (v_request_id, 'requested', auth.uid());
  
  RETURN v_request_id;
END;
$$;

-- RPC: Admin aprovar saque
CREATE OR REPLACE FUNCTION public.admin_approve_payout(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem aprovar saques';
  END IF;
  
  UPDATE payout_requests 
  SET status = 'approved', processed_at = now(), processed_by = auth.uid()
  WHERE id = p_request_id AND status = 'pending';
  
  INSERT INTO payouts_ledger (payout_request_id, action, performed_by)
  VALUES (p_request_id, 'approved', auth.uid());
END;
$$;

-- RPC: Admin rejeitar saque
CREATE OR REPLACE FUNCTION public.admin_reject_payout(p_request_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_amount decimal;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem rejeitar saques';
  END IF;
  
  SELECT user_id, amount INTO v_user_id, v_amount FROM payout_requests WHERE id = p_request_id;
  
  UPDATE payout_requests 
  SET status = 'rejected', processed_at = now(), processed_by = auth.uid(), rejection_reason = p_reason
  WHERE id = p_request_id AND status = 'pending';
  
  UPDATE user_wallets 
  SET available_balance = available_balance + v_amount,
      pending_balance = pending_balance - v_amount,
      updated_at = now()
  WHERE user_id = v_user_id;
  
  INSERT INTO payouts_ledger (payout_request_id, action, performed_by, notes)
  VALUES (p_request_id, 'rejected', auth.uid(), p_reason);
END;
$$;

-- RPC: Admin marcar como pago
CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_amount decimal;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem marcar saques como pagos';
  END IF;
  
  SELECT user_id, amount INTO v_user_id, v_amount FROM payout_requests WHERE id = p_request_id;
  
  UPDATE payout_requests 
  SET status = 'paid', paid_at = now()
  WHERE id = p_request_id AND status = 'approved';
  
  UPDATE user_wallets 
  SET pending_balance = pending_balance - v_amount,
      total_withdrawn = total_withdrawn + v_amount,
      updated_at = now()
  WHERE user_id = v_user_id;
  
  INSERT INTO payouts_ledger (payout_request_id, action, performed_by)
  VALUES (p_request_id, 'paid', auth.uid());
END;
$$;

-- RPC: Submeter vídeo para campanha
CREATE OR REPLACE FUNCTION public.submit_video_for_campaign(p_campaign_id uuid, p_platform text, p_video_link text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_video_id uuid;
BEGIN
  -- Verificar se usuário é participante aprovado
  IF NOT EXISTS (
    SELECT 1 FROM campaign_participants 
    WHERE campaign_id = p_campaign_id AND user_id = auth.uid() AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Você não é participante aprovado desta campanha';
  END IF;
  
  INSERT INTO campaign_videos (campaign_id, submitted_by, platform, video_link)
  VALUES (p_campaign_id, auth.uid(), p_platform, p_video_link)
  RETURNING id INTO v_video_id;
  
  RETURN v_video_id;
END;
$$;