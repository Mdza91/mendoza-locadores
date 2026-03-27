import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const useInactivityLogout = (isLocador = false) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("config_timeout_inactividad")
        .select("*")
        .single();

      if (data) {
        if (isLocador) {
          setIsEnabled(data.habilitado);
          setTimeoutMinutes(data.minutos_inactividad);
        } else {
          setIsEnabled((data as any).habilitado_admin ?? data.habilitado);
          setTimeoutMinutes((data as any).minutos_inactividad_admin ?? data.minutos_inactividad);
        }
      }
    };

    fetchConfig();
  }, [isLocador]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleActivity = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        toast.info("Sesión cerrada por inactividad");
        await supabase.auth.signOut();
        navigate(isLocador ? "/locador-auth" : "/auth");
      }, timeoutMinutes * 60 * 1000);
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    handleActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isEnabled, timeoutMinutes, navigate, isLocador]);
};
