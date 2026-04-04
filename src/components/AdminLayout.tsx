import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, LayoutDashboard, FileText, Store, CalendarDays, Package, Users, Settings, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Overview', path: '/admin', icon: LayoutDashboard },
  { title: 'Requests', path: '/admin/requests', icon: FileText },
  { title: 'Shops', path: '/admin/shops', icon: Store },
  { title: 'Bookings', path: '/admin/bookings', icon: CalendarDays },
  { title: 'Packages', path: '/admin/packages', icon: Package },
  { title: 'Users', path: '/admin/users', icon: Users },
  { title: 'Settings', path: '/admin/settings', icon: Settings },
];

const AdminLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-sidebar-background">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Salon Admin</h1>
            <Badge variant="outline" className="mt-0.5 text-[10px] rose-border text-primary">
              Platform Admin
            </Badge>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
