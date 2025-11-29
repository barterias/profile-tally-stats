import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  "nav.ranking": { pt: "Ranking", en: "Ranking" },
  "nav.ranking_monthly": { pt: "Ranking Mensal", en: "Monthly Ranking" },
  "nav.ranking_daily": { pt: "Ranking Diário", en: "Daily Ranking" },
  "nav.wallet": { pt: "Carteira", en: "Wallet" },
  "nav.profile": { pt: "Perfil", en: "Profile" },
  "nav.admin": { pt: "Admin", en: "Admin" },
  "nav.signout": { pt: "Sair", en: "Sign Out" },

  // Common
  "common.loading": { pt: "Carregando...", en: "Loading..." },
  "common.save": { pt: "Salvar", en: "Save" },
  "common.cancel": { pt: "Cancelar", en: "Cancel" },
  "common.delete": { pt: "Excluir", en: "Delete" },
  "common.edit": { pt: "Editar", en: "Edit" },
  "common.confirm": { pt: "Confirmar", en: "Confirm" },
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
