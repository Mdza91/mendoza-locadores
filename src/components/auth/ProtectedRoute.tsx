import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const checkIfLocador = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "locador")
      .maybeSingle();
    
    if (error) {
      console.error("Error checking locador role:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Exception checking locador role:", error);
    return false;
  }
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocador, setIsLocador] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        
        if (session?.user) {
          setTimeout(() => {
            checkIfLocador(session.user.id)
              .then((isLoc) => {
                setIsLocador(isLoc);
                setLoading(false);
              })
              .catch((err) => {
                console.error("Error in role check:", err);
                setIsLocador(false);
                setLoading(false);
              });
          }, 0);
        } else {
          setIsLocador(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        checkIfLocador(session.user.id)
          .then((isLoc) => {
            setIsLocador(isLoc);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error in initial role check:", err);
            setIsLocador(false);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || isLocador === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isLocador) {
    return <Navigate to="/mi-perfil" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
