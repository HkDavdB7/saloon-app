import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppHeader = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const roleBadgeLabel: Record<string, string> = {
    customer: 'عميلة',
    stylist_admin: 'مديرة صالون',
    stylist: 'ستليست',
    admin: 'مديرة',
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md" dir="rtl">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-bold text-primary">صالون</span>
        </div>

        <div className="flex items-center gap-3">
          {profile?.role && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {roleBadgeLabel[profile.role]}
            </span>
          )}
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {profile?.phone}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
