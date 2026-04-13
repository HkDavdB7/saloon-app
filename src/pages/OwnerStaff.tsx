import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Users, User, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';

const OwnerStaff = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shopId, setShopId] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [selectedBarber, setSelectedStylist] = useState<any | null>(null);
  const [permState, setPermState] = useState({
    can_manage_schedule: true,
    can_manage_bookings: false,
    can_manage_services: false,
  });
  const [savingPerms, setSavingPerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [invName, setInvName] = useState('');
  const [invBio, setInvBio] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchStaff = async () => {
    if (!user) return;
    setLoading(true);
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).limit(1).maybeSingle();
    if (!shop) { setLoading(false); return; }
    setShopId(shop.id);
    const { data } = await supabase
      .from('barbers')
      .select('id, name, bio, avatar_url, permissions, is_active, invite_email, profile_id')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('created_at');
    setStaff(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, [user]);

  const openInvite = () => {
    setInvName(''); setInvBio(''); setInvEmail(''); setFormErrors({});
    setSheetOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!invName.trim()) e.name = 'Name is required';
    if (invEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invEmail.trim())) {
      e.email = 'Enter a valid email address';
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleInvite = async () => {
    if (!validate() || !shopId) return;
    setSaving(true);
    const { error } = await supabase.from('barbers').insert({
      shop_id: shopId,
      name: invName.trim(),
      bio: invBio.trim() || null,
      invite_email: invEmail.trim() || null,
      is_active: true,
      permissions: {
        can_manage_schedule: true,
        can_manage_bookings: false,
        can_manage_services: false,
      },
    });
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('owner.stylistAdded'), description: `${invName} تمت إضافتها إلى فريق عملك.` });
      setSheetOpen(false);
    }
    setSaving(false);
    fetchStaff();
  };

  const handleRemove = async () => {
    if (!removeId) return;
    const { error } = await supabase.from('barbers').update({ is_active: false }).eq('id', removeId);
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'تمت إزالة成员' }); }
    setRemoveId(null);
    fetchStaff();
  };

  const openPermissions = (b: any) => {
    setSelectedStylist(b);
    setPermState({
      can_manage_schedule: b.permissions?.can_manage_schedule ?? true,
      can_manage_bookings: b.permissions?.can_manage_bookings ?? false,
      can_manage_services: b.permissions?.can_manage_services ?? false,
    });
    setPermissionsOpen(true);
  };

  const savePermissions = async () => {
    if (!selectedBarber) return;
    setSavingPerms(true);
    const { error } = await supabase
      .from('barbers')
      .update({ permissions: permState })
      .eq('id', selectedBarber.id);

    setSavingPerms(false);
    if (error) {
      toast({ title: 'Failed to save permissions', description: error.message, variant: 'destructive' });
      return;
    }

    setStaff((prev) => prev.map((b) => (b.id === selectedBarber.id ? { ...b, permissions: permState } : b)));
    toast({ title: 'Permissions updated' });
    setPermissionsOpen(false);
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-8 w-1/2" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{t('owner.team')}</h1>
          <p className="text-sm text-muted-foreground">{staff.length} barbers</p>
        </div>
        <Button onClick={openInvite} className="rose-gradient text-primary-foreground">
          <Plus className="mr-1 h-4 w-4" /> {t('owner.addStylist')}
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">{t('owner.noTeamYet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((b: any) => (
            <div key={b.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                {b.avatar_url ? <img src={b.avatar_url} alt={b.name} className="h-full w-full rounded-full object-cover" /> : <User className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{b.name}</p>
                  {b.profile_id ? (
                    <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500 text-[10px]">Linked</Badge>
                  ) : (
                    <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-500 text-[10px]">Pending login</Badge>
                  )}
                </div>
                {b.invite_email && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> {b.invite_email}
                  </p>
                )}
                {b.bio && <p className="text-xs text-muted-foreground">{b.bio}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openPermissions(b)}>
                  Permissions
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setRemoveId(b.id)}>
                  <Trash2 className="h-4 w-4 text-destructive/70" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="border-border bg-card">
          <SheetHeader><SheetTitle className="text-foreground">{t('owner.addStylist')}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>{t('owner.fullName')} *</Label>
              <Input placeholder="مثال: فاطمة" value={invName} onChange={(e) => setInvName(e.target.value)} />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t('owner.inviteEmail')}</Label>
              <Input type="email" placeholder="مثال: stylist@email.com" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">{t('owner.optionalHint')}</p>
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t('owner.bioSpecialty')}</Label>
              <Input placeholder={t('owner.bioPlaceholder')} value={invBio} onChange={(e) => setInvBio(e.target.value)} />
            </div>
            <Button onClick={handleInvite} disabled={saving} className="w-full rose-gradient text-primary-foreground">
              {saving ? t('owner.saving') : t('owner.addStylist')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <SheetContent className="border-border bg-card">
          <SheetHeader><SheetTitle className="text-foreground">Staff Permissions</SheetTitle></SheetHeader>
          {selectedBarber && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Stylist</p>
                <p className="text-sm text-foreground">{selectedBarber.name}</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Manage schedule</p>
                  <p className="text-xs text-muted-foreground">Allow editing working hours</p>
                </div>
                <Switch checked={permState.can_manage_schedule} onCheckedChange={(v) => setPermState((p) => ({ ...p, can_manage_schedule: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Manage bookings</p>
                  <p className="text-xs text-muted-foreground">Allow confirm/cancel bookings</p>
                </div>
                <Switch checked={permState.can_manage_bookings} onCheckedChange={(v) => setPermState((p) => ({ ...p, can_manage_bookings: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Manage services</p>
                  <p className="text-xs text-muted-foreground">Allow editing services/prices</p>
                </div>
                <Switch checked={permState.can_manage_services} onCheckedChange={(v) => setPermState((p) => ({ ...p, can_manage_services: v }))} />
              </div>

              <Button onClick={savePermissions} disabled={savingPerms} className="w-full">
                {savingPerms ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('owner.removeTeamMember')}</AlertDialogTitle>
            <AlertDialogDescription>{t('owner.removeTeamMemberDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">{t('owner.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('owner.remove')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OwnerStaff;
