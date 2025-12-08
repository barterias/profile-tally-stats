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
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
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

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
