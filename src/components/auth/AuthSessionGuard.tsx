import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "sb-gikeegxdrkelhpfkcaci-auth-token";

export default function AuthSessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { error } = await supabase.auth.getSession();
      if (cancelled || !error) return;

      const msg = (error as any)?.message ?? "";
      const code = (error as any)?.code;
      const isRefreshTokenNotFound =
        code === "refresh_token_not_found" ||
        msg.toLowerCase().includes("refresh token not found");

      if (!isRefreshTokenNotFound) return;

      console.warn("Sesión inválida (refresh token). Limpiando sesión…", error);

      try {
        await supabase.auth.signOut();
      } finally {
        // Limpieza extra por si quedó un token corrupto en storage
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }

        const path = window.location.pathname;
        const redirectTo =
          path.startsWith("/locador") || path.startsWith("/mi-perfil")
            ? "/locador-auth"
            : "/auth";

        window.location.href = redirectTo;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
