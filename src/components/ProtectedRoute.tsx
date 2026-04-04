import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const roleRoutes: Record<UserRole, string> = {
  customer: '/',
  stylist_admin: '/owner/dashboard',
  stylist: '/stylist/schedule',
  admin: '/admin',
};

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No session at all → login
  if (!session) return <Navigate to="/welcome" replace />;

  // Session exists but no profile → AuthContext will handle sign-out; redirect to /auth
  if (!profile) return <Navigate to="/auth" replace />;

  // Profile exists but role is null → needs setup
  if (!profile.role) return <Navigate to="/setup" replace />;

  // Admin email guard
  if (allowedRoles?.includes('admin') && session.user.email !== '7o.kassab@gmail.com') {
    return <Navigate to="/welcome" replace />;
  }

  // Role mismatch → redirect to correct dashboard
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={roleRoutes[profile.role]} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
