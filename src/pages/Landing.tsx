import { useNavigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

const roleRoutes = {
  customer: '/',
  stylist_admin: '/owner/dashboard',
  stylist: '/stylist/schedule',
  admin: '/admin',
};

const Landing = () => {
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && session && profile?.role) {
      navigate(roleRoutes[profile.role], { replace: true });
    }
  }, [loading, session, profile, navigate]);

  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4" dir="rtl">
      <div className="animate-fade-in text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full gold-gradient gold-glow">
          <Scissors className="h-12 w-12 text-primary-foreground" />
        </div>

        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          Salon
        </h1>
        <p className="mt-2 font-sans text-3xl font-light text-primary md:text-4xl">
          قص
        </p>

        <p className="mt-6 text-lg text-muted-foreground">
          Book your stylist, your way
        </p>

        <Button
          onClick={() => navigate('/auth')}
          size="lg"
          className="mt-10 gold-gradient px-10 py-6 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 hover:shadow-xl"
        >
          {t('auth.getStarted')}
        </Button>
      </div>
    </div>
  );
};

export default Landing;
