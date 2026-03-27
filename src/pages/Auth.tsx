import { useState } from "react";

import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { data: settings } = useAppSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Inicio de sesión exitoso");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[hsl(215_25%_96%)] dark:bg-[hsl(220_20%_8%)]">
      {/* Corporate animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full opacity-25 dark:opacity-20"
          style={{
            background: `radial-gradient(circle, hsl(215 50% 35% / 0.6) 0%, hsl(215 40% 50% / 0.15) 50%, transparent 70%)`,
            animation: 'blob-float 14s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute -bottom-24 -right-24 w-[600px] h-[600px] rounded-full opacity-20 dark:opacity-15"
          style={{
            background: `radial-gradient(circle, hsl(210 30% 55% / 0.5) 0%, hsl(210 25% 65% / 0.1) 55%, transparent 70%)`,
            animation: 'blob-float 16s ease-in-out infinite reverse',
          }}
        />
        <div 
          className="absolute top-1/3 right-1/5 w-[350px] h-[350px] rounded-full opacity-15 dark:opacity-10"
          style={{
            background: `radial-gradient(circle, hsl(220 15% 45% / 0.4) 0%, transparent 70%)`,
            animation: 'blob-float 11s ease-in-out infinite 2s',
          }}
        />
        <div 
          className="absolute bottom-1/4 left-1/3 w-[280px] h-[280px] rounded-full opacity-15 dark:opacity-10"
          style={{
            background: `radial-gradient(circle, hsl(200 35% 50% / 0.35) 0%, transparent 70%)`,
            animation: 'blob-float 13s ease-in-out infinite 4s',
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(215 20% 40%) 1px, transparent 1px),
              linear-gradient(90deg, hsl(215 20% 40%) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <style>{`
        @keyframes blob-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(25px, -15px) scale(1.03); }
          66% { transform: translate(-15px, 10px) scale(0.97); }
        }
      `}</style>

      <div className="relative z-10 w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Glass card */}
        <div 
          className="rounded-3xl border border-primary/15 p-8 sm:p-10 shadow-2xl shadow-primary/10"
          style={{
            background: `linear-gradient(135deg, hsl(var(--card) / 0.55) 0%, hsl(var(--card) / 0.35) 100%)`,
            backdropFilter: 'blur(32px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8 space-y-4">
            <div 
              className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg"
              style={{
                background: `linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 100%)`,
                backdropFilter: 'blur(12px)',
              }}
            >
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
              ) : (
                <FileText className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {settings?.nombre_app || "Sistema de Gestión"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Ingrese sus credenciales para acceder
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
                Correo Electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm transition-all focus:bg-background/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm transition-all focus:bg-background/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          {settings?.nombre_app || "Sistema de Gestión"} · Acceso seguro
        </p>
      </div>

    </div>
  );
};

export default Auth;
