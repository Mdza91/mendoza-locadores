import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "hr_manager" | "locador" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUserId(session.user.id);
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setUserId(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        checkUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (uid: string) => {
    try {
      // Check if user is admin or hr_manager
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", ["admin", "hr_manager"])
        .single();

      if (adminRole) {
        setRole(adminRole.role as UserRole);
        setLoading(false);
        return;
      }

      // Check if user is locador
      const { data: locadorRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "locador")
        .single();

      if (locadorRole) {
        setRole("locador");
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, userId, isAdmin: role === "admin", isHR: role === "hr_manager", isLocador: role === "locador" };
};
