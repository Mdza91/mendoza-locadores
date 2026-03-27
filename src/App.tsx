import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import LocadorAuth from "./pages/LocadorAuth";
import MiPerfil from "./pages/MiPerfil";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LocadorProtectedRoute from "./components/auth/LocadorProtectedRoute";
import Locadores from "./pages/Locadores";
import PerfilLocador from "./pages/PerfilLocador";
import Usuarios from "./pages/Usuarios";
import Planillas from "./pages/Planillas";
import Notificaciones from "./pages/Notificaciones";
import Configuraciones from "./pages/Configuraciones";
import Perfiles from "./pages/Perfiles";

import Descargas from "./pages/Descargas";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import AuthSessionGuard from "./components/auth/AuthSessionGuard";
import { ThemeProvider } from "./hooks/useTheme";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthSessionGuard>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/locador-auth" element={<LocadorAuth />} />
            <Route
              path="/mi-perfil"
              element={
                <LocadorProtectedRoute>
                  <MiPerfil />
                </LocadorProtectedRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/locadores" element={<Locadores />} />
              <Route path="/locadores/:id" element={<PerfilLocador />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/planillas" element={<Planillas />} />
              <Route path="/notificaciones" element={<Notificaciones />} />
              <Route path="/perfiles" element={<Perfiles />} />
              <Route path="/configuraciones" element={<Configuraciones />} />
              
              <Route path="/descargas" element={<Descargas />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthSessionGuard>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
