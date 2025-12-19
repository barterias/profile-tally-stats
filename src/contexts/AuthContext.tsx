import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isClient: boolean;
  userRole: 'admin' | 'client' | 'user' | null;
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
  const [isClient, setIsClient] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'client' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRoles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          checkUserRoles(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setIsClient(false);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoles = async (userId: string) => {
    try {
      // Verificar se é o admin fixo
      const { data: { user } } = await supabase.auth.getUser();
      const isFixedAdmin = user?.email === "jotav.strategist@gmail.com";
      
      if (isFixedAdmin) {
        setIsAdmin(true);
        setIsClient(false);
        setUserRole('admin');
        setLoading(false);
        return;
      }
      
      // Buscar TODAS as roles do usuário
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      const hasAdmin = roles?.some(r => r.role === 'admin') || false;
      const hasClient = roles?.some(r => r.role === 'client') || false;
      
      setIsAdmin(hasAdmin);
      setIsClient(hasClient);
      
      // Definir role principal (admin > client > user)
      if (hasAdmin) {
        setUserRole('admin');
      } else if (hasClient) {
        setUserRole('client');
      } else {
        setUserRole('user');
      }
    } catch (error) {
      console.error('Erro ao verificar roles:', error);
      setUserRole('user');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Inserir na tabela pending_users em vez de criar direto no auth
      const { error } = await supabase
        .from("pending_users")
        .insert({
          email,
          username,
          password_hash: hashedPassword,
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
    // Verificar se o usuário ainda está pendente usando RPC seguro
    const { data: pendingUser } = await supabase
      .rpc('check_pending_user_status', { p_email: email });
    
    if (pendingUser && pendingUser.length > 0) {
      localStorage.setItem("pending_email", email);
      return { error: { message: "pending_approval" } as any };
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsClient(false);
    setUserRole(null);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isClient, userRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
