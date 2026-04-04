import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

const SetupPage = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage()

  const handleSubmit = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast({ title: 'Please enter your name', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'customer', full_name: fullName.trim(), phone: user.phone })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err: any) {
      toast({ title: 'Something went wrong', description: err?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-md animate-fade-in text-center">
        <h1 className="font-display text-3xl font-bold text-foreground">{t('auth.welcomeToSalon')}</h1>
        <p className="mt-2 text-muted-foreground">{t('auth.enterName')}</p>

        <div className="mt-8 space-y-5">
          <div className="space-y-2 text-left">
            <label className="text-sm font-medium text-foreground">Full Name *</label>
            <Input
              placeholder="e.g. Ahmed Al-Salem"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-border bg-card text-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('common.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
