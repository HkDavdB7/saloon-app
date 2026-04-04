import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import CustomerLayout from '@/components/CustomerLayout';
import { LogOut, User, Store, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KUWAIT_AREAS } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';

const CustomerProfile = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  // Stylistshop registration state
  const [showShopForm, setShowShopForm] = useState(false);
  const [shopName, setShopName] = useState('');
  const [city, setCity] = useState('');
  const [submittingShop, setSubmittingShop] = useState(false);
  const { t } = useLanguage()

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile saved!' });
    }
  };

  const handleRegisterShop = async () => {
    if (!user) return;
    if (!shopName.trim()) {
      toast({ title: 'Shop name is required', variant: 'destructive' });
      return;
    }
    if (!city) {
      toast({ title: 'Please select a city', variant: 'destructive' });
      return;
    }

    setSubmittingShop(true);
    try {
      // Update role to stylist_admin
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'stylist_admin' })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // Create platform request
      const { error: requestError } = await supabase
        .from('platform_requests')
        .insert({
          stylist_admin_id: user.id,
          shop_name: shopName.trim(),
          contact_phone: user.phone || '',
          city,
        });

      if (requestError) {
        if (requestError.code === '23505') {
          toast({ title: 'Request already submitted', description: 'You already have a pending request.', variant: 'destructive' });
        } else {
          throw requestError;
        }
        return;
      }

      await refreshProfile();
      window.location.href = '/owner/dashboard';
    } catch (err: any) {
      toast({ title: 'Something went wrong', description: err?.message, variant: 'destructive' });
    } finally {
      setSubmittingShop(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/welcome');
  };

  return (
    <CustomerLayout>
      <div className="px-4 pt-6 animate-fade-in space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">{t('nav.profile')}</h1>

        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{user?.email || user?.phone}</p>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label>{t('auth.enterName')}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('auth.enterName')} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? t('common.loading') + '...' : t('common.save')}
          </Button>
        </div>

        {/* Register Stylistshop Section */}
        {!showShopForm ? (
          <button
            onClick={() => setShowShopForm(true)}
            className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Store className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{t('booking.selectShop')}</p>
              <p className="text-xs text-muted-foreground">{t('nav.bookings')}</p>
            </div>
          </button>
        ) : (
          <div className="space-y-4 rounded-xl border border-primary/30 bg-card p-5">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{t('booking.selectShop')}</h2>
            </div>
            <p className="text-xs text-muted-foreground">We'll review your request and get back to you shortly.</p>

            <div className="space-y-2">
              <Label>Shop Name *</Label>
              <Input
                placeholder="e.g. Elite Cuts"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>City *</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {KUWAIT_AREAS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowShopForm(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleRegisterShop}
                disabled={submittingShop}
                className="flex-1"
              >
                {submittingShop ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        )}

        <Button variant="destructive" className="w-full" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    </CustomerLayout>
  );
};

export default CustomerProfile;
