import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  useEffect(() => {
    if (!loading) {
      if (!role) {
        // No authenticated user, redirect to auth
        navigate("/auth");
      } else if (role === "locador") {
        // Locador users go to their profile
        navigate("/mi-perfil");
      } else if (role === "admin" || role === "hr_manager") {
        // Admin/HR users go to locadores list
        navigate("/locadores");
      }
    }
  }, [role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return null;
};

export default Index;
