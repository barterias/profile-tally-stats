import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          checkAdminStatus(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    // Verificar se é o admin fixo
    const { data: { user } } = await supabase.auth.getUser();
    const isFixedAdmin = user?.email === "jotav.strategist@gmail.com";
    
    if (isFixedAdmin) {
      setIsAdmin(true);
      return;
    }
    
    // Verificar roles na tabela
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // Inserir na tabela pending_users em vez de criar direto no auth
      const { error } = await supabase
        .from("pending_users")
        .insert({
          email,
          username,
          password_hash: password, // Na produção, deve ser hasheado
        });
      
      if (error) throw error;
      
      // Salvar email no localStorage para a página de pending
      localStorage.setItem("pending_email", email);
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    // Verificar se o usuário ainda está pendente
    const { data: pendingUser } = await supabase
      .from("pending_users")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    
    if (pendingUser) {
      localStorage.setItem("pending_email", email);
      return { error: { message: "pending_approval" } as any };
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
