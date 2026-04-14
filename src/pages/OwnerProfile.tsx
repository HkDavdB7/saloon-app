import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';
import { LogOut, User } from 'lucide-react';

const OwnerProfile = () => {
  const { toast } = useToast();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: 'Profile saved!', description: 'Your profile has been updated.' });
    }, 800);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t('nav.profile')}</h1>
        <p className="text-sm text-muted-foreground">{t('owner.profile') || t('nav.profile')}</p>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{fullName || 'Stylist Admin'}</p>
            <p className="text-xs text-muted-foreground">{user?.phone || user?.email || '—'}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fullName">{t('owner.fullName')}</Label>
          <Input id="fullName" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>{t('owner.phone')}</Label>
          <Input value={user?.phone || '—'} disabled className="bg-secondary/50 text-muted-foreground" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full rose-gradient font-semibold text-primary-foreground">
          {saving ? t('owner.saving') : t('common.save')}
        </Button>
      </section>

      <Button onClick={handleSignOut} variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10">
        <LogOut className="mr-2 h-4 w-4" /> {t('auth.signOut')}
      </Button>
    </div>
  );
};

export default OwnerProfile;
