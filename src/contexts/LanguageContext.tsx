import { createContext, useContext, useState, ReactNode } from "react";

type Language = "pt" | "en";

interface Translations {
  [key: string]: {
    pt: string;
    en: string;
  };
}

const translations: Translations = {
  // Auth page
  "auth.welcome": { pt: "Bem-vindo", en: "Welcome" },
  "auth.subtitle": { pt: "Entre ou crie sua conta para começar", en: "Sign in or create your account to get started" },
  "auth.login": { pt: "Entrar", en: "Sign In" },
  "auth.signup": { pt: "Criar Conta", en: "Sign Up" },
  "auth.email": { pt: "Email", en: "Email" },
  "auth.password": { pt: "Senha", en: "Password" },
  "auth.username": { pt: "Nome de Usuário", en: "Username" },
  "auth.logging_in": { pt: "Entrando...", en: "Signing in..." },
  "auth.creating": { pt: "Criando conta...", en: "Creating account..." },
  "auth.terms": { pt: "Ao continuar, você concorda com nossos", en: "By continuing, you agree to our" },
  "auth.terms_of_service": { pt: "Termos de Serviço", en: "Terms of Service" },
  "auth.and": { pt: "e", en: "and" },
  "auth.privacy_policy": { pt: "Política de Privacidade", en: "Privacy Policy" },
  "auth.login_success": { pt: "Login realizado!", en: "Login successful!" },
  "auth.welcome_back": { pt: "Bem-vindo de volta!", en: "Welcome back!" },
  "auth.signup_success": { pt: "Cadastro enviado!", en: "Registration submitted!" },
  "auth.await_approval": { pt: "Aguarde aprovação do administrador.", en: "Please wait for admin approval." },
  "auth.error": { pt: "Erro", en: "Error" },
  "auth.generic_error": { pt: "Algo deu errado. Tente novamente.", en: "Something went wrong. Please try again." },

  // Branding
  "brand.tagline": { pt: "A plataforma definitiva para competições de criadores de conteúdo", en: "The ultimate platform for content creator competitions" },
  "brand.epic_competitions": { pt: "Competições Épicas", en: "Epic Competitions" },
  "brand.epic_competitions_desc": { pt: "Participe de campeonatos e mostre seu talento", en: "Join championships and showcase your talent" },
  "brand.realtime_ranking": { pt: "Ranking em Tempo Real", en: "Real-time Ranking" },
  "brand.realtime_ranking_desc": { pt: "Acompanhe sua posição e métricas ao vivo", en: "Track your position and metrics live" },
  "brand.detailed_analysis": { pt: "Análise Detalhada", en: "Detailed Analysis" },
  "brand.detailed_analysis_desc": { pt: "Dashboard completo com todas suas estatísticas", en: "Complete dashboard with all your statistics" },

  // Pending Approval
  "pending.title": { pt: "Aguardando Aprovação", en: "Awaiting Approval" },
  "pending.subtitle": { pt: "Seu cadastro foi recebido com sucesso!", en: "Your registration was received successfully!" },
  "pending.registered_for": { pt: "Cadastro realizado para:", en: "Registration submitted for:" },
  "pending.submitted": { pt: "Cadastro enviado", en: "Registration submitted" },
  "pending.submitted_desc": { pt: "Suas informações foram recebidas", en: "Your information has been received" },
  "pending.under_review": { pt: "Em análise", en: "Under review" },
  "pending.under_review_desc": { pt: "Um administrador revisará seu cadastro em breve", en: "An administrator will review your registration soon" },
  "pending.access_granted": { pt: "Acesso liberado", en: "Access granted" },
  "pending.access_granted_desc": { pt: "Você receberá acesso após aprovação", en: "You will receive access after approval" },
  "pending.auto_update": { pt: "Esta página irá atualizar automaticamente quando seu cadastro for aprovado.", en: "This page will automatically update when your registration is approved." },
  "pending.back_to_login": { pt: "Voltar para Login", en: "Back to Login" },

  // Navigation
  "nav.dashboard": { pt: "Dashboard", en: "Dashboard" },
  "nav.submit": { pt: "Enviar Vídeo", en: "Submit Video" },
  "nav.campaigns": { pt: "Campanhas", en: "Campaigns" },
  "nav.my_campaigns": { pt: "Minhas Campanhas", en: "My Campaigns" },
  "nav.ranking": { pt: "Ranking", en: "Ranking" },
  "nav.ranking_monthly": { pt: "Ranking Mensal", en: "Monthly Ranking" },
  "nav.ranking_daily": { pt: "Ranking Diário", en: "Daily Ranking" },
  "nav.wallet": { pt: "Carteira", en: "Wallet" },
  "nav.profile": { pt: "Meu Perfil", en: "My Profile" },
  "nav.admin": { pt: "Admin", en: "Admin" },
  "nav.signout": { pt: "Sair", en: "Sign Out" },
  "nav.payments": { pt: "Pagamentos", en: "Payments" },
  "nav.financial": { pt: "Financeiro", en: "Financial" },
  "nav.clippers": { pt: "Clipadores", en: "Clippers" },
  "nav.admin_panel": { pt: "Painel Admin", en: "Admin Panel" },
  "nav.submissions": { pt: "Submissões", en: "Submissions" },
  "nav.users": { pt: "Usuários", en: "Users" },
  "nav.statistics": { pt: "Estatísticas", en: "Statistics" },
  "nav.menu": { pt: "Menu", en: "Menu" },
  "nav.client": { pt: "Cliente", en: "Client" },
  "nav.administration": { pt: "Administração", en: "Administration" },
  "nav.account": { pt: "Conta", en: "Account" },

  // Common
  "common.loading": { pt: "Carregando...", en: "Loading..." },
  "common.save": { pt: "Salvar", en: "Save" },
  "common.cancel": { pt: "Cancelar", en: "Cancel" },
  "common.delete": { pt: "Excluir", en: "Delete" },
  "common.edit": { pt: "Editar", en: "Edit" },
  "common.confirm": { pt: "Confirmar", en: "Confirm" },
  "common.back": { pt: "Voltar", en: "Back" },
  "common.search": { pt: "Buscar", en: "Search" },
  "common.filter": { pt: "Filtrar", en: "Filter" },
  "common.export": { pt: "Exportar", en: "Export" },
  "common.refresh": { pt: "Atualizar", en: "Refresh" },
  "common.all": { pt: "Todos", en: "All" },
  "common.active": { pt: "Ativas", en: "Active" },
  "common.inactive": { pt: "Inativas", en: "Inactive" },
  "common.pending": { pt: "Pendente", en: "Pending" },
  "common.approved": { pt: "Aprovado", en: "Approved" },
  "common.rejected": { pt: "Rejeitado", en: "Rejected" },
  "common.paid": { pt: "Pago", en: "Paid" },
  "common.view": { pt: "Ver", en: "View" },
  "common.details": { pt: "Detalhes", en: "Details" },
  "common.actions": { pt: "Ações", en: "Actions" },
  "common.status": { pt: "Status", en: "Status" },
  "common.date": { pt: "Data", en: "Date" },
  "common.amount": { pt: "Valor", en: "Amount" },
  "common.name": { pt: "Nome", en: "Name" },
  "common.description": { pt: "Descrição", en: "Description" },
  "common.yes": { pt: "Sim", en: "Yes" },
  "common.no": { pt: "Não", en: "No" },
  "common.none": { pt: "Nenhum", en: "None" },
  "common.success": { pt: "Sucesso", en: "Success" },
  "common.error": { pt: "Erro", en: "Error" },
  "common.warning": { pt: "Aviso", en: "Warning" },
  "common.info": { pt: "Info", en: "Info" },

  // Dashboard
  "dashboard.title": { pt: "Dashboard", en: "Dashboard" },
  "dashboard.overview": { pt: "Visão Geral", en: "Overview" },
  "dashboard.total_views": { pt: "Total de Views", en: "Total Views" },
  "dashboard.total_videos": { pt: "Total de Vídeos", en: "Total Videos" },
  "dashboard.total_clippers": { pt: "Total de Clipadores", en: "Total Clippers" },
  "dashboard.total_earnings": { pt: "Ganhos Totais", en: "Total Earnings" },
  "dashboard.engagement_rate": { pt: "Taxa de Engajamento", en: "Engagement Rate" },
  "dashboard.active_campaigns": { pt: "Campanhas Ativas", en: "Active Campaigns" },
  "dashboard.pending_payments": { pt: "Pagamentos Pendentes", en: "Pending Payments" },
  "dashboard.select_campaign": { pt: "Selecionar Campanha", en: "Select Campaign" },
  "dashboard.all_campaigns": { pt: "Todas as Campanhas", en: "All Campaigns" },
  "dashboard.no_campaigns": { pt: "Nenhuma campanha encontrada", en: "No campaigns found" },
  "dashboard.views_over_time": { pt: "Evolução de Views", en: "Views Over Time" },
  "dashboard.platform_distribution": { pt: "Distribuição por Plataforma", en: "Platform Distribution" },

  // Campaigns
  "campaigns.title": { pt: "Campanhas", en: "Campaigns" },
  "campaigns.my_campaigns": { pt: "Minhas Campanhas", en: "My Campaigns" },
  "campaigns.campaign_management": { pt: "Gestão de Campanhas", en: "Campaign Management" },
  "campaigns.new_campaign": { pt: "Nova Campanha", en: "New Campaign" },
  "campaigns.edit_campaign": { pt: "Editar Campanha", en: "Edit Campaign" },
  "campaigns.create_campaign": { pt: "Criar Campanha", en: "Create Campaign" },
  "campaigns.campaign_name": { pt: "Nome da Campanha", en: "Campaign Name" },
  "campaigns.campaign_status": { pt: "Status da Campanha", en: "Campaign Status" },
  "campaigns.campaign_active": { pt: "Campanha ativa e recebendo vídeos", en: "Campaign active and receiving videos" },
  "campaigns.campaign_paused": { pt: "Campanha pausada", en: "Campaign paused" },
  "campaigns.start_date": { pt: "Data de Início", en: "Start Date" },
  "campaigns.end_date": { pt: "Data de Término", en: "End Date" },
  "campaigns.period": { pt: "Período", en: "Period" },
  "campaigns.platforms": { pt: "Plataformas", en: "Platforms" },
  "campaigns.platforms_accepted": { pt: "Plataformas Aceitas", en: "Accepted Platforms" },
  "campaigns.prize_description": { pt: "Descrição dos Prêmios", en: "Prize Description" },
  "campaigns.rules": { pt: "Regras", en: "Rules" },
  "campaigns.participants": { pt: "Participantes", en: "Participants" },
  "campaigns.videos": { pt: "Vídeos", en: "Videos" },
  "campaigns.views": { pt: "Views", en: "Views" },
  "campaigns.activate": { pt: "Ativar", en: "Activate" },
  "campaigns.pause": { pt: "Pausar", en: "Pause" },
  "campaigns.campaign_paused_msg": { pt: "Campanha pausada", en: "Campaign paused" },
  "campaigns.campaign_activated_msg": { pt: "Campanha ativada", en: "Campaign activated" },
  "campaigns.delete_campaign": { pt: "Excluir campanha?", en: "Delete campaign?" },
  "campaigns.delete_warning": { pt: "Esta ação não pode ser desfeita. Todos os vídeos associados também serão removidos.", en: "This action cannot be undone. All associated videos will also be removed." },
  "campaigns.campaign_deleted": { pt: "Campanha excluída!", en: "Campaign deleted!" },
  "campaigns.campaign_updated": { pt: "Campanha atualizada!", en: "Campaign updated!" },
  "campaigns.changes_saved": { pt: "As alterações foram salvas com sucesso.", en: "Changes saved successfully." },
  "campaigns.save_changes": { pt: "Salvar Alterações", en: "Save Changes" },
  "campaigns.saving": { pt: "Salvando...", en: "Saving..." },
  "campaigns.no_campaigns_found": { pt: "Nenhuma campanha encontrada", en: "No campaigns found" },
  "campaigns.search_campaigns": { pt: "Buscar campanhas...", en: "Search campaigns..." },

  // Campaign Types
  "campaign_type.pay_per_view": { pt: "Pay Per View", en: "Pay Per View" },
  "campaign_type.fixed": { pt: "Fixo", en: "Fixed" },
  "campaign_type.competition_daily": { pt: "Comp. Diária", en: "Daily Comp." },
  "campaign_type.competition_monthly": { pt: "Comp. Mensal", en: "Monthly Comp." },
  "campaign_type.type_and_payment": { pt: "Tipo e Pagamento", en: "Type & Payment" },
  "campaign_type.rate_per_1k": { pt: "R$ por 1K views", en: "$ per 1K views" },
  "campaign_type.min_views": { pt: "Views mínimas", en: "Minimum views" },
  "campaign_type.max_paid_views": { pt: "Views máx. pagas", en: "Max paid views" },
  "campaign_type.total_prize": { pt: "Prêmio Total (R$)", en: "Total Prize ($)" },
  "campaign_type.fixed_value_per_video": { pt: "Valor fixo por vídeo (R$)", en: "Fixed value per video ($)" },

  // Ranking
  "ranking.title": { pt: "Ranking", en: "Ranking" },
  "ranking.monthly": { pt: "Ranking Mensal", en: "Monthly Ranking" },
  "ranking.daily": { pt: "Ranking Diário", en: "Daily Ranking" },
  "ranking.position": { pt: "Posição", en: "Position" },
  "ranking.clipper": { pt: "Clipador", en: "Clipper" },
  "ranking.prize": { pt: "Prêmio", en: "Prize" },
  "ranking.earnings": { pt: "Ganhos", en: "Earnings" },
  "ranking.no_data": { pt: "Sem dados de ranking", en: "No ranking data" },

  // Payments
  "payments.title": { pt: "Pagamentos", en: "Payments" },
  "payments.payment_management": { pt: "Gestão de Pagamentos", en: "Payment Management" },
  "payments.total_pending": { pt: "Total Pendente", en: "Total Pending" },
  "payments.total_paid": { pt: "Total Pago", en: "Total Paid" },
  "payments.total_clippers": { pt: "Total de Clipadores", en: "Total Clippers" },
  "payments.paid_clippers": { pt: "Clipadores Pagos", en: "Paid Clippers" },
  "payments.mark_as_paid": { pt: "Marcar como Pago", en: "Mark as Paid" },
  "payments.pay": { pt: "Pagar", en: "Pay" },
  "payments.pay_all": { pt: "Pagar Todos", en: "Pay All" },
  "payments.payment_confirmed": { pt: "Pagamento confirmado!", en: "Payment confirmed!" },
  "payments.confirm_payment": { pt: "Confirmar Pagamento", en: "Confirm Payment" },
  "payments.payment_details": { pt: "Detalhes do Pagamento", en: "Payment Details" },
  "payments.clipper_info": { pt: "Informações do Clipador", en: "Clipper Info" },
  "payments.payment_value": { pt: "Valor do Pagamento", en: "Payment Value" },
  "payments.notes": { pt: "Observações", en: "Notes" },
  "payments.notes_placeholder": { pt: "Adicione observações opcionais...", en: "Add optional notes..." },
  "payments.processing": { pt: "Processando...", en: "Processing..." },
  "payments.no_pending": { pt: "Nenhum pagamento pendente", en: "No pending payments" },

  // Wallet
  "wallet.title": { pt: "Carteira", en: "Wallet" },
  "wallet.my_wallet": { pt: "Minha Carteira", en: "My Wallet" },
  "wallet.available_balance": { pt: "Saldo Disponível", en: "Available Balance" },
  "wallet.pending_balance": { pt: "Saldo Pendente", en: "Pending Balance" },
  "wallet.total_earned": { pt: "Total Ganho", en: "Total Earned" },
  "wallet.total_withdrawn": { pt: "Total Sacado", en: "Total Withdrawn" },
  "wallet.withdraw": { pt: "Sacar", en: "Withdraw" },
  "wallet.request_withdrawal": { pt: "Solicitar Saque", en: "Request Withdrawal" },
  "wallet.transaction_history": { pt: "Histórico de Transações", en: "Transaction History" },
  "wallet.no_transactions": { pt: "Nenhuma transação ainda", en: "No transactions yet" },
  "wallet.pix_key": { pt: "Chave Pix", en: "Pix Key" },
  "wallet.pix_type": { pt: "Tipo de Chave Pix", en: "Pix Key Type" },

  // Financial
  "financial.title": { pt: "Gestão Financeira", en: "Financial Management" },
  "financial.manage_withdrawals": { pt: "Gerencie solicitações de saque", en: "Manage withdrawal requests" },
  "financial.pending_withdrawals": { pt: "Saques Pendentes", en: "Pending Withdrawals" },
  "financial.awaiting_payment": { pt: "Aguardando Pagamento", en: "Awaiting Payment" },
  "financial.withdrawals_approved": { pt: "Saques Aprovados - Aguardando Pagamento", en: "Approved Withdrawals - Awaiting Payment" },
  "financial.withdrawals_paid": { pt: "Saques Pagos", en: "Paid Withdrawals" },
  "financial.withdrawals_rejected": { pt: "Saques Rejeitados", en: "Rejected Withdrawals" },
  "financial.all_withdrawals": { pt: "Todos os Saques", en: "All Withdrawals" },
  "financial.approve": { pt: "Aprovar", en: "Approve" },
  "financial.reject": { pt: "Rejeitar", en: "Reject" },
  "financial.mark_paid": { pt: "Marcar como Pago", en: "Mark as Paid" },

  // Profile
  "profile.title": { pt: "Meu Perfil", en: "My Profile" },
  "profile.edit_profile": { pt: "Editar Perfil", en: "Edit Profile" },
  "profile.avatar": { pt: "Avatar", en: "Avatar" },
  "profile.change_avatar": { pt: "Alterar Avatar", en: "Change Avatar" },
  "profile.member_since": { pt: "Membro desde", en: "Member since" },

  // Clippers
  "clippers.title": { pt: "Clipadores", en: "Clippers" },
  "clippers.pending_clippers": { pt: "Clipadores Pendentes", en: "Pending Clippers" },
  "clippers.approved_clippers": { pt: "Clipadores Aprovados", en: "Approved Clippers" },
  "clippers.approve": { pt: "Aprovar", en: "Approve" },
  "clippers.reject": { pt: "Rejeitar", en: "Reject" },
  "clippers.approved_success": { pt: "Clipador aprovado com sucesso!", en: "Clipper approved successfully!" },
  "clippers.rejected_success": { pt: "Clipador rejeitado.", en: "Clipper rejected." },

  // Users Admin
  "users.title": { pt: "Gestão de Usuários", en: "User Management" },
  "users.all_users": { pt: "Todos os Usuários", en: "All Users" },
  "users.pending_users": { pt: "Usuários Pendentes", en: "Pending Users" },
  "users.approved_users": { pt: "Usuários Aprovados", en: "Approved Users" },
  "users.role": { pt: "Função", en: "Role" },
  "users.change_role": { pt: "Alterar Função", en: "Change Role" },
  "users.manage_users": { pt: "Gerenciar Usuários", en: "Manage Users" },
  "users.users_count": { pt: "usuários", en: "users" },
  "users.pending_count": { pt: "pendentes", en: "pending" },
  "users.search_placeholder": { pt: "Buscar por email ou username...", en: "Search by email or username..." },
  "users.pending_tab": { pt: "Pendentes", en: "Pending" },
  "users.active_tab": { pt: "Ativos", en: "Active" },
  "users.awaiting_approval": { pt: "Usuários Aguardando Aprovação", en: "Users Awaiting Approval" },
  "users.new_registrations": { pt: "Novos registros que precisam ser aprovados", en: "New registrations that need approval" },
  "users.no_pending_users": { pt: "Nenhum usuário pendente", en: "No pending users" },
  "users.user": { pt: "Usuário", en: "User" },
  "users.email": { pt: "Email", en: "Email" },
  "users.date": { pt: "Data", en: "Date" },
  "users.approve": { pt: "Aprovar", en: "Approve" },
  "users.reject": { pt: "Rejeitar", en: "Reject" },
  "users.active_users": { pt: "Usuários Ativos", en: "Active Users" },
  "users.manage_approved": { pt: "Gerenciamento de usuários aprovados", en: "Management of approved users" },
  "users.warning_col": { pt: "Advertência", en: "Warning" },
  "users.member_since": { pt: "Membro desde", en: "Member since" },
  "users.make_client": { pt: "Tornar Cliente", en: "Make Client" },
  "users.edit_campaigns": { pt: "Editar Campanhas", en: "Edit Campaigns" },
  "users.make_admin": { pt: "Tornar Admin", en: "Make Admin" },
  "users.remove_admin": { pt: "Remover Admin", en: "Remove Admin" },
  "users.add_warning": { pt: "Adicionar Advertência", en: "Add Warning" },
  "users.increase_warning": { pt: "Aumentar Advertência", en: "Increase Warning" },
  "users.remove_warning": { pt: "Remover Advertência", en: "Remove Warning" },
  "users.ban_user": { pt: "Banir Usuário", en: "Ban User" },
  "users.approve_user_question": { pt: "Aprovar usuário?", en: "Approve user?" },
  "users.approve_user_desc": { pt: "será aprovado e poderá acessar o sistema.", en: "will be approved and can access the system." },
  "users.reject_user_question": { pt: "Rejeitar usuário?", en: "Reject user?" },
  "users.reject_user_desc": { pt: "O registro será excluído permanentemente.", en: "The registration will be permanently deleted." },
  "users.promote_admin_question": { pt: "Promover a Admin?", en: "Promote to Admin?" },
  "users.promote_admin_desc": { pt: "terá acesso total ao sistema.", en: "will have full system access." },
  "users.remove_admin_question": { pt: "Remover Admin?", en: "Remove Admin?" },
  "users.remove_admin_desc": { pt: "perderá privilégios de administrador.", en: "will lose administrator privileges." },
  "users.ban_user_question": { pt: "Banir usuário?", en: "Ban user?" },
  "users.ban_user_desc": { pt: "não poderá mais acessar o sistema.", en: "will no longer be able to access the system." },
  "users.user_approved": { pt: "Usuário aprovado com sucesso!", en: "User approved successfully!" },
  "users.user_rejected": { pt: "Usuário rejeitado", en: "User rejected" },
  "users.role_updated": { pt: "Role atualizada para", en: "Role updated to" },
  "users.warning_updated": { pt: "Advertência atualizada", en: "Warning updated" },
  "users.error_loading": { pt: "Erro ao carregar usuários", en: "Error loading users" },
  "users.error_approving": { pt: "Erro ao aprovar usuário", en: "Error approving user" },
  "users.error_rejecting": { pt: "Erro ao rejeitar usuário", en: "Error rejecting user" },
  "users.error_updating_role": { pt: "Erro ao atualizar role", en: "Error updating role" },
  "users.error_updating_warning": { pt: "Erro ao atualizar advertência", en: "Error updating warning" },

  // Statistics
  "stats.title": { pt: "Estatísticas", en: "Statistics" },
  "stats.overview": { pt: "Visão Geral", en: "Overview" },
  "stats.total_views": { pt: "Total de Views", en: "Total Views" },
  "stats.total_videos": { pt: "Total de Vídeos", en: "Total Videos" },
  "stats.total_users": { pt: "Total de Usuários", en: "Total Users" },

  // Video Submission
  "submit.title": { pt: "Enviar Vídeo", en: "Submit Video" },
  "submit.select_campaign": { pt: "Selecionar Campanha", en: "Select Campaign" },
  "submit.select_platform": { pt: "Selecionar Plataforma", en: "Select Platform" },
  "submit.video_link": { pt: "Link do Vídeo", en: "Video Link" },
  "submit.submit_video": { pt: "Enviar Vídeo", en: "Submit Video" },
  "submit.video_submitted": { pt: "Vídeo enviado com sucesso!", en: "Video submitted successfully!" },

  // Tabs
  "tabs.overview": { pt: "Visão Geral", en: "Overview" },
  "tabs.ranking": { pt: "Ranking", en: "Ranking" },
  "tabs.videos": { pt: "Vídeos", en: "Videos" },
  "tabs.clippers": { pt: "Clipadores", en: "Clippers" },
  "tabs.statistics": { pt: "Estatísticas", en: "Statistics" },
  "tabs.payments": { pt: "Pagamentos", en: "Payments" },
  "tabs.pending": { pt: "Pendentes", en: "Pending" },
  "tabs.approved": { pt: "Aprovados", en: "Approved" },
  "tabs.paid": { pt: "Pagos", en: "Paid" },
  "tabs.rejected": { pt: "Rejeitados", en: "Rejected" },
  "tabs.all": { pt: "Todos", en: "All" },

  // Messages
  "msg.error_loading": { pt: "Erro ao carregar dados", en: "Error loading data" },
  "msg.error_saving": { pt: "Erro ao salvar", en: "Error saving" },
  "msg.success_saving": { pt: "Salvo com sucesso!", en: "Saved successfully!" },
  "msg.no_data": { pt: "Nenhum dado encontrado", en: "No data found" },
  "msg.loading_campaigns": { pt: "Carregando campanhas...", en: "Loading campaigns..." },
  "msg.select_campaign_first": { pt: "Selecione uma campanha para ver os detalhes", en: "Select a campaign to see details" },

  // Client Dashboard specific
  "loadingDashboard": { pt: "Carregando dashboard...", en: "Loading dashboard..." },
  "noCampaignsLinked": { pt: "Nenhuma campanha vinculada", en: "No linked campaigns" },
  "noCampaignsDescription": { pt: "Você ainda não possui campanhas vinculadas. Entre em contato com o administrador.", en: "You don't have any linked campaigns yet. Contact the administrator." },
  "viewAvailableCampaigns": { pt: "Ver campanhas disponíveis", en: "View available campaigns" },
  "clientDashboard": { pt: "Dashboard do Cliente", en: "Client Dashboard" },
  "trackPerformance": { pt: "Acompanhe o desempenho das suas campanhas", en: "Track your campaigns performance" },
  "selectCampaign": { pt: "Selecionar campanha", en: "Select campaign" },
  "details": { pt: "Detalhes", en: "Details" },
  "export": { pt: "Exportar", en: "Export" },
  "exportCSV": { pt: "Exportar CSV", en: "Export CSV" },
  "exportPDF": { pt: "Exportar PDF", en: "Export PDF" },
  "success": { pt: "Sucesso!", en: "Success!" },
  "error": { pt: "Erro", en: "Error" },
  "active": { pt: "Ativo", en: "Active" },
  "inactive": { pt: "Inativo", en: "Inactive" },
  "totalViews": { pt: "Total de Views", en: "Total Views" },
  "totalVideos": { pt: "Total de Vídeos", en: "Total Videos" },
  "clippers": { pt: "Clipadores", en: "Clippers" },
  "estimatedEarnings": { pt: "Ganhos Estimados", en: "Estimated Earnings" },
  "viewsEvolution": { pt: "Evolução de Views", en: "Views Evolution" },
  "last7Days": { pt: "Últimos 7 dias", en: "Last 7 days" },
  "platformDistribution": { pt: "Distribuição por Plataforma", en: "Platform Distribution" },
  "noData": { pt: "Sem dados", en: "No data" },
  "ranking": { pt: "Ranking", en: "Ranking" },
  "videos": { pt: "Vídeos", en: "Videos" },
  "statistics": { pt: "Estatísticas", en: "Statistics" },
  "payments": { pt: "Pagamentos", en: "Payments" },
  "pending": { pt: "Pendente", en: "Pending" },
  "allRankings": { pt: "Todos", en: "All" },
  "perViewRanking": { pt: "Por View", en: "Per View" },
  "dailyRanking": { pt: "Diário", en: "Daily" },
  "monthlyRanking": { pt: "Mensal", en: "Monthly" },
  "rankingWithPayments": { pt: "Ranking com Pagamentos", en: "Ranking with Payments" },
  "campaignVideos": { pt: "Vídeos da Campanha", en: "Campaign Videos" },
  "pendingApproval": { pt: "Aguardando Aprovação", en: "Pending Approval" },
  "approvedClippers": { pt: "Clipadores Aprovados", en: "Approved Clippers" },
  "noApprovedClippers": { pt: "Nenhum clipador aprovado ainda", en: "No approved clippers yet" },
  "engagement": { pt: "Engajamento", en: "Engagement" },
  "engagementRate": { pt: "Taxa de Engajamento", en: "Engagement Rate" },
  "totalLikes": { pt: "Total de Likes", en: "Total Likes" },
  "totalComments": { pt: "Total de Comentários", en: "Total Comments" },
  "totalShares": { pt: "Total de Compartilhamentos", en: "Total Shares" },
  "financialSummary": { pt: "Resumo Financeiro", en: "Financial Summary" },
  "clipperEstimatedEarnings": { pt: "Ganhos Estimados dos Clippers", en: "Clipper Estimated Earnings" },
  "averagePerVideo": { pt: "Média por Vídeo", en: "Average per Video" },
  "averagePerClipper": { pt: "Média por Clipador", en: "Average per Clipper" },
  "ratePer1kViews": { pt: "Taxa por 1K Views", en: "Rate per 1K Views" },
  "paymentsThisMonth": { pt: "Pagamentos este mês", en: "Payments this month" },
  "socialMediaOverview": { pt: "Visão Geral de Redes Sociais", en: "Social Media Overview" },
  "viewDetails": { pt: "Ver Detalhes", en: "View Details" },
  "followers": { pt: "Seguidores", en: "Followers" },
  "views": { pt: "Visualizações", en: "Views" },
  "likes": { pt: "Curtidas", en: "Likes" },
  "accounts": { pt: "Contas", en: "Accounts" },

  // Status Badges
  "status.admin": { pt: "Admin", en: "Admin" },
  "status.client": { pt: "Cliente", en: "Client" },
  "status.banned": { pt: "Banido", en: "Banned" },
  "status.pending": { pt: "Pendente", en: "Pending" },
  "status.active": { pt: "Ativo", en: "Active" },
  "status.warning": { pt: "Advertência", en: "Warning" },
  "status.severe_warning": { pt: "Advertência Grave", en: "Severe Warning" },

  // Client Campaign Modal
  "client_modal.title": { pt: "Tornar Cliente", en: "Make Client" },
  "client_modal.description": { pt: "Selecione as campanhas que {username} irá gerenciar como cliente.", en: "Select the campaigns that {username} will manage as a client." },
  "client_modal.no_campaigns": { pt: "Nenhuma campanha cadastrada", en: "No campaigns registered" },
  "client_modal.saving": { pt: "Salvando...", en: "Saving..." },
  "client_modal.success": { pt: "{username} agora é cliente de {count} campanha(s)", en: "{username} is now a client of {count} campaign(s)" },
  "client_modal.error_loading": { pt: "Erro ao carregar campanhas", en: "Error loading campaigns" },
  "client_modal.error_linking": { pt: "Erro ao vincular cliente às campanhas", en: "Error linking client to campaigns" },

  // Payment Confirm Modal
  "payment_modal.confirm_payment": { pt: "Confirmar Pagamento", en: "Confirm Payment" },
  "payment_modal.position": { pt: "Posição", en: "Position" },
  "payment_modal.amount_to_pay": { pt: "Valor a ser pago", en: "Amount to pay" },
  "payment_modal.notes_label": { pt: "Observações (opcional)", en: "Notes (optional)" },
  "payment_modal.notes_placeholder": { pt: "Adicione uma nota sobre este pagamento...", en: "Add a note about this payment..." },
  "payment_modal.warning": { pt: "Este valor será adicionado ao saldo disponível do clipador. Esta ação não pode ser desfeita.", en: "This amount will be added to the clipper's available balance. This action cannot be undone." },
  "payment_modal.processing": { pt: "Processando...", en: "Processing..." },
  "payment_modal.confirm": { pt: "Confirmar Pagamento", en: "Confirm Payment" },
  "payment_modal.payment_success": { pt: "Pagamento de", en: "Payment of" },
  "payment_modal.to": { pt: "realizado para", en: "made to" },
  "payment_modal.payment_error": { pt: "Erro ao processar pagamento", en: "Error processing payment" },
  "payment_modal.campaign_earnings": { pt: "Ganhos da campanha", en: "Campaign earnings" },
  "payment_modal.ranking_payment": { pt: "Pagamento de ranking", en: "Ranking payment" },
  "payment_modal.payment_via_ranking": { pt: "Pagamento via ranking", en: "Payment via ranking" },

  // Earnings Breakdown Modal
  "earnings_modal.title": { pt: "Detalhamento de Ganhos", en: "Earnings Breakdown" },
  "earnings_modal.subtitle": { pt: "Veja como os ganhos de cada clipador são calculados", en: "See how each clipper's earnings are calculated" },
  "earnings_modal.pay_per_view": { pt: "Pagamento por View", en: "Pay Per View" },
  "earnings_modal.fixed": { pt: "Pagamento Fixo", en: "Fixed Payment" },
  "earnings_modal.competition_daily": { pt: "Competição Diária", en: "Daily Competition" },
  "earnings_modal.competition_monthly": { pt: "Competição Mensal", en: "Monthly Competition" },
  "earnings_modal.views": { pt: "views", en: "views" },
  "earnings_modal.videos": { pt: "vídeos", en: "videos" },
  "earnings_modal.total_prize": { pt: "Premiação Total", en: "Total Prize" },
  "earnings_modal.ppv_description": { pt: "Os ganhos são calculados com base no total de visualizações dividido por 1.000, multiplicado pela taxa de pagamento.", en: "Earnings are calculated based on total views divided by 1,000, multiplied by the payment rate." },
  "earnings_modal.competition_description": { pt: "Os ganhos são distribuídos entre os 3 primeiros colocados: 1º lugar (50%), 2º lugar (30%), 3º lugar (20%).", en: "Earnings are distributed among the top 3: 1st place (50%), 2nd place (30%), 3rd place (20%)." },
  "earnings_modal.fixed_description": { pt: "Os ganhos são calculados multiplicando o número de vídeos submetidos pelo valor fixo por vídeo.", en: "Earnings are calculated by multiplying the number of submitted videos by the fixed value per video." },
  "earnings_modal.earnings_calculation": { pt: "Cálculo de Ganhos", en: "Earnings Calculation" },
  "earnings_modal.formula_not_defined": { pt: "Fórmula não definida", en: "Formula not defined" },
  "earnings_modal.type_not_defined": { pt: "O tipo de campanha não possui uma fórmula de cálculo definida.", en: "The campaign type does not have a defined calculation formula." },
  "earnings_modal.prize_distribution": { pt: "Distribuição de Prêmios", en: "Prize Distribution" },
  "earnings_modal.earnings_per_clipper": { pt: "Ganhos por Clipador", en: "Earnings per Clipper" },
  "earnings_modal.no_clippers": { pt: "Nenhum clipador no ranking ainda.", en: "No clippers in the ranking yet." },
  "earnings_modal.total_to_distribute": { pt: "Total a ser distribuído", en: "Total to be distributed" },

  // Submissions
  "submissions.title": { pt: "Submissões de Vídeo", en: "Video Submissions" },
  "submissions.pending_verification": { pt: "pendentes de verificação", en: "pending verification" },
  "submissions.pending": { pt: "Pendentes", en: "Pending" },
  "submissions.validated": { pt: "Validado", en: "Validated" },
  "submissions.unknown_user": { pt: "Usuário", en: "User" },
  "submissions.error_loading": { pt: "Erro ao carregar submissões", en: "Error loading submissions" },
  "submissions.video_validated": { pt: "Vídeo validado!", en: "Video validated!" },
  "submissions.video_rejected": { pt: "Vídeo rejeitado", en: "Video rejected" },
  "submissions.video_deleted": { pt: "Vídeo removido com sucesso!", en: "Video removed successfully!" },
  "submissions.error_processing": { pt: "Erro ao processar", en: "Error processing" },
  "submissions.error_deleting": { pt: "Erro ao remover vídeo", en: "Error removing video" },
  "submissions.report_exported": { pt: "Relatório exportado!", en: "Report exported!" },
  "submissions.search_placeholder": { pt: "Buscar por usuário, campanha ou link...", en: "Search by user, campaign or link..." },
  "submissions.user": { pt: "Usuário", en: "User" },
  "submissions.campaign": { pt: "Campanha", en: "Campaign" },
  "submissions.platform": { pt: "Plataforma", en: "Platform" },
  "submissions.date": { pt: "Data", en: "Date" },
  "submissions.no_submissions": { pt: "Nenhuma submissão encontrada", en: "No submissions found" },
  "submissions.view_video": { pt: "Ver Vídeo", en: "View Video" },
  "submissions.validate_video": { pt: "Validar Vídeo", en: "Validate Video" },
  "submissions.validate_confirm": { pt: "Marcar este vídeo como validado?", en: "Mark this video as validated?" },
  "submissions.validate": { pt: "Validar", en: "Validate" },
  "submissions.remove_validation": { pt: "Remover Validação", en: "Remove Validation" },
  "submissions.remove_validation_confirm": { pt: "Remover validação deste vídeo?", en: "Remove validation from this video?" },
  "submissions.unvalidate": { pt: "Remover Validação", en: "Unvalidate" },
  "submissions.delete_video": { pt: "Remover Vídeo", en: "Delete Video" },
  "submissions.delete_confirm": { pt: "Tem certeza que deseja remover este vídeo? Esta ação não pode ser desfeita.", en: "Are you sure you want to delete this video? This action cannot be undone." },
  "submissions.delete": { pt: "Remover", en: "Delete" },
  "common.total": { pt: "Total", en: "Total" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language;
      return saved || 'en';
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
