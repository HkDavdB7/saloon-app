import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full rose-gradient rose-glow">
          <Sparkles className="h-12 w-12 text-primary-foreground" />
        </div>

        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          صالون
        </h1>
        <p className="mt-2 font-sans text-3xl font-light text-primary md:text-4xl">
          Salon
        </p>

        <p className="mt-6 text-lg text-muted-foreground">
          احجزي موعدك بكل سهولة
        </p>

        <Button
          onClick={() => navigate('/auth')}
          size="lg"
          className="mt-10 rose-gradient px-10 py-6 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 hover:shadow-xl"
        >
          {t('auth.getStarted')}
        </Button>

        {/* Legal links */}
        <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="/privacy" className="hover:text-foreground px-3 py-2 min-h-[44px] inline-flex items-center">سياسة الخصوصية</a>
          <span>·</span>
          <a href="/terms" className="hover:text-foreground px-3 py-2 min-h-[44px] inline-flex items-center">الشروط والأحكام</a>
        </div>
      </div>
    </div>
  );
};

export default Landing;
