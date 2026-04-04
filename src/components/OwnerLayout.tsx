import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, Scissors, LayoutDashboard, Store, Wrench, Users, CalendarDays, UserCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import PendingApproval from '@/pages/PendingApproval';
import SetupPage from '@/pages/SetupPage';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/owner/dashboard' },
  { label: 'My Shop', icon: Store, path: '/owner/shop' },
  { label: 'Services', icon: Wrench, path: '/owner/services' },
  { label: 'Staff', icon: Users, path: '/owner/staff' },
  { label: 'Bookings', icon: CalendarDays, path: '/owner/bookings' },
  { label: 'Profile', icon: UserCircle, path: '/owner/profile' },
];

type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'loading';

const OwnerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const [requestStatus, setRequestStatus] = useState<RequestStatus>('loading');
  const [adminNotes, setAdminNotes] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkRequest = async () => {
      // If the user already has a shop, they are implicitly approved —
      // handles seed/test users and admin-created shops with no platform_request.
      const { data: shopData } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (shopData) {
        setRequestStatus('approved');
        return;
      }

      // No shop yet — fall back to platform_requests gate
      const { data, error } = await supabase
        .from('platform_requests')
        .select('status, admin_notes')
        .eq('stylist_admin_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking request:', error);
        // Don't fall through to 'none' (SetupPage) on RLS/network errors
        // Try fetching the shop directly as a fallback
        const { data: shopData } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();
        if (shopData) {
          setRequestStatus('approved');
        } else {
          setRequestStatus('none');
        }
        return;
      }

      if (!data) {
        setRequestStatus('none');
      } else {
        setRequestStatus(data.status as RequestStatus);
        setAdminNotes(data.admin_notes);
      }
    };

    checkRequest();
  }, [user]);

  // Loading
  if (requestStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No request submitted yet → show setup form inline
  if (requestStatus === 'none') {
    return <SetupPage />;
  }

  // Pending approval
  if (requestStatus === 'pending') {
    return <PendingApproval />;
  }

  // Rejected
  if (requestStatus === 'rejected') {
    return (
      <PendingApproval
        isRejected
        adminNotes={adminNotes}
        onResubmit={() => setRequestStatus('none')}
      />
    );
  }

  // Approved → show dashboard
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Scissors className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold text-primary">Salon</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">Stylist Admin Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Stylist Admin
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="sticky top-16 h-[calc(100vh-4rem)] w-56 shrink-0 border-r border-border bg-card/50">
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className={`flex-1 ${isMobile ? 'pb-20' : ''}`}>
          <div className="mx-auto max-w-3xl px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors ${
                  isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default OwnerLayout;
