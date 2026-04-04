import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Search, Loader2, Ban, RefreshCw, CreditCard } from 'lucide-react';

interface Shop {
  id: string;
  owner_id: string | null;
  name: string;
  city: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  stylist_admin_id: string;
  package_id: string;
  status: 'trial' | 'active' | 'suspended' | 'expired';
  trial_ends_at: string | null;
}

interface PackageRow {
  id: string;
  name: string;
  price: number;
}

const AdminShops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionRow['status']>('trial');
  const [trialDays, setTrialDays] = useState(30);
  const [savingSubscription, setSavingSubscription] = useState(false);

  const fetchShops = async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('id, owner_id, name, city, phone, is_active, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) setShops(data);
    setLoading(false);
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('id, stylist_admin_id, package_id, status, trial_ends_at');
    if (data) setSubscriptions(data as SubscriptionRow[]);
  };

  const fetchPackages = async () => {
    const { data } = await supabase
      .from('packages')
      .select('id, name, price')
      .order('price', { ascending: true });
    if (data) setPackages(data as PackageRow[]);
  };

  useEffect(() => {
    fetchShops();
    fetchSubscriptions();
    fetchPackages();
  }, []);

  const packageMap = useMemo(() => Object.fromEntries(packages.map((p) => [p.id, p])), [packages]);

  const getSubscriptionForShop = (shop: Shop) =>
    shop.owner_id ? subscriptions.find((s) => s.stylist_admin_id === shop.owner_id) : undefined;

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSuspend = async (id: string) => {
    setLoadingId(id);
    const { error } = await supabase.from('shops').update({ is_active: false }).eq('id', id);
    if (error) {
      toast({ title: 'Failed to suspend', variant: 'destructive' });
    } else {
      await fetchShops();
      toast({ title: 'Shop suspended', variant: 'destructive' });
    }
    setLoadingId(null);
  };

  const handleReactivate = async (id: string) => {
    setLoadingId(id);
    const { error } = await supabase.from('shops').update({ is_active: true }).eq('id', id);
    if (error) {
      toast({ title: 'Failed to reactivate', variant: 'destructive' });
    } else {
      await fetchShops();
      toast({ title: 'Shop reactivated' });
    }
    setLoadingId(null);
  };

  const openSubscriptionManager = (shop: Shop) => {
    const existing = getSubscriptionForShop(shop);
    setSelectedShop(shop);
    setSelectedPackageId(existing?.package_id || '');
    setSelectedStatus(existing?.status || 'trial');
    if (existing?.trial_ends_at) {
      const now = new Date();
      const end = new Date(existing.trial_ends_at);
      const diff = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      setTrialDays(diff);
    } else {
      setTrialDays(30);
    }
  };

  const saveSubscription = async () => {
    if (!selectedShop?.owner_id) {
      toast({ title: 'No shop owner assigned', variant: 'destructive' });
      return;
    }
    if (!selectedPackageId) {
      toast({ title: 'Select a package', variant: 'destructive' });
      return;
    }

    setSavingSubscription(true);
    const existing = getSubscriptionForShop(selectedShop);
    const trialEnd = selectedStatus === 'trial'
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    if (existing) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          package_id: selectedPackageId,
          status: selectedStatus,
          trial_ends_at: trialEnd,
        })
        .eq('id', existing.id);
      if (error) {
        setSavingSubscription(false);
        toast({ title: 'Failed to update subscription', variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          stylist_admin_id: selectedShop.owner_id,
          package_id: selectedPackageId,
          status: selectedStatus,
          trial_ends_at: trialEnd,
        });
      if (error) {
        setSavingSubscription(false);
        toast({ title: 'Failed to create subscription', variant: 'destructive' });
        return;
      }
    }

    await fetchSubscriptions();
    setSavingSubscription(false);
    toast({ title: 'Subscription saved' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Shops Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">{shops.length} registered shops</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search shops..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-5">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">No shops found</div>
        ) : (
          filtered.map((shop) => {
            const sub = getSubscriptionForShop(shop);
            const pkg = sub ? packageMap[sub.package_id] : undefined;

            return (
              <Card
                key={shop.id}
                className={`border-border bg-card border-l-2 border-l-primary ${!shop.is_active ? 'opacity-60' : ''}`}
              >
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">{shop.name}</h3>
                      <Badge className={shop.is_active
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]'
                        : 'bg-destructive/20 text-destructive border-destructive/30 text-[10px]'
                      }>
                        {shop.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {shop.city || 'No city'} · Joined {new Date(shop.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subscription: {sub ? `${pkg?.name || '—'} · ${sub.status}` : 'Not set'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openSubscriptionManager(shop)}>
                      <CreditCard className="mr-1 h-3 w-3" />
                      Manage Subscription
                    </Button>
                    {!shop.is_active ? (
                      <Button variant="outline" size="sm" disabled={loadingId === shop.id} onClick={() => handleReactivate(shop.id)}>
                        {loadingId === shop.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                        Reactivate
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={loadingId === shop.id}>
                            <Ban className="mr-1 h-3 w-3" />
                            Suspend
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Suspend "{shop.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This will immediately suspend the shop.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleSuspend(shop.id)}>Suspend</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Sheet open={!!selectedShop} onOpenChange={() => setSelectedShop(null)}>
        <SheetContent className="border-border bg-card">
          <SheetHeader>
            <SheetTitle className="font-display text-foreground">Manage Subscription</SheetTitle>
          </SheetHeader>
          {selectedShop && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Shop</p>
                <p className="text-sm text-foreground">{selectedShop.name}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Package</p>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} — {pkg.price.toFixed(3)} KD
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as SubscriptionRow['status'])}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Trial days</p>
                <Input
                  type="number"
                  className="mt-1"
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  disabled={selectedStatus !== 'trial'}
                />
              </div>

              <Button onClick={saveSubscription} disabled={savingSubscription} className="w-full">
                {savingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Subscription
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminShops;
