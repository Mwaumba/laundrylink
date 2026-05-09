import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';

interface Props {
  allow: UserRole[];
  children: React.ReactNode;
  /** Where to send users who fail the guard. Defaults to /auth. */
  fallback?: string;
}

/**
 * Route guard that restricts access by role.
 * Guests are bounced to /auth; signed-in users without the right role
 * are sent to the role-appropriate dashboard.
 */
const RoleGuard = ({ allow, children, fallback }: Props) => {
  const { role, loading } = useUserRole();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allow.includes(role)) return <>{children}</>;

  if (role === 'guest') {
    return <Navigate to={fallback ?? `/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Wrong-role redirect: send each role to its home base.
  const home =
    role === 'admin' ? '/admin' :
    role === 'vendor' ? '/vendor/dashboard' :
    '/';
  return <Navigate to={home} replace />;
};

export default RoleGuard;
