import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { 
  Users, 
  Settings, 
  FileText, 
  Bell, 
  LogOut,
  Menu,
  X,
  UserCog,
  IdCard,
  Download,
  ChevronLeft,
  LayoutDashboard,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { useAppSettings } from "@/hooks/useAppSettings";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const { data: appSettings } = useAppSettings();
  
  useInactivityLogout();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) navigate("/auth");
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada exitosamente");
    navigate("/auth");
  };

  const menuItems = [
    { icon: Users, label: "Locadores", path: "/locadores" },
    { icon: FileText, label: "Planillas", path: "/planillas" },
    { icon: Bell, label: "Notificaciones", path: "/notificaciones" },
    { icon: IdCard, label: "Perfiles", path: "/perfiles" },
    { icon: Settings, label: "Configuraciones", path: "/configuraciones" },
    { icon: Download, label: "Descargas", path: "/descargas" },
  ];

  const appName = appSettings?.nombre_app || "Locadores";
  const logoUrl = appSettings?.logo_url
    ? supabase.storage.from("documentos").getPublicUrl(appSettings.logo_url).data.publicUrl
    : null;

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
          "bg-sidebar/95 backdrop-blur-xl text-sidebar-foreground border-r border-sidebar-border",
          sidebarOpen ? "w-64" : "w-[72px]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo area */}
          <div className={cn(
            "flex h-16 items-center border-b border-sidebar-border/50 transition-all duration-300",
            sidebarOpen ? "px-5 gap-3" : "px-0 justify-center"
          )}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-xl object-contain shrink-0 ring-2 ring-sidebar-primary/20" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center shrink-0 shadow-lg shadow-sidebar-primary/20">
                <LayoutDashboard className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
            )}
            {sidebarOpen && (
              <span className="font-bold text-base truncate animate-fade-in tracking-tight">{appName}</span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-thin">
            {menuItems.map((item, i) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  className={cn(
                    "w-full flex items-center gap-3 text-sm font-medium transition-all duration-200 rounded-xl h-11 group relative",
                    sidebarOpen ? "px-3" : "justify-center px-0",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                >
                  <item.icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                    !active && "group-hover:scale-110"
                  )} />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                  {active && sidebarOpen && (
                    <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/80 animate-scale-in" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom section: Theme + Collapse + Logout */}
          <div className="p-3 space-y-1.5 border-t border-sidebar-border/50">
            {/* Theme Selector integrated into sidebar */}
            <div className={cn(
              "flex items-center rounded-xl h-10 transition-all duration-200",
              sidebarOpen ? "px-3 gap-3" : "justify-center px-0"
            )}>
              {sidebarOpen && (
                <div className="flex items-center gap-2 flex-1 text-sidebar-foreground/50">
                  <Palette className="h-4 w-4 shrink-0" />
                  <span className="text-sm">Tema</span>
                </div>
              )}
              <ThemeSelector />
            </div>

            <button
              className={cn(
                "w-full flex items-center gap-3 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 rounded-xl h-10 transition-all duration-200 hidden lg:flex",
                sidebarOpen ? "px-3" : "justify-center px-0"
              )}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <ChevronLeft className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-300",
                !sidebarOpen && "rotate-180"
              )} />
              {sidebarOpen && <span className="text-sm">Colapsar</span>}
            </button>

            <button
              className={cn(
                "w-full flex items-center gap-3 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-xl h-11 transition-all duration-200",
                sidebarOpen ? "px-3" : "justify-center px-0"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden h-10 w-10 rounded-xl shadow-md bg-card/80 backdrop-blur-sm border-border"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content - NO top bar */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"
        )}
      >
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
