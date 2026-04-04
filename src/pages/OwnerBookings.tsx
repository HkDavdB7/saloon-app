import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const statusColors: Record<string, string> = {
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  pending: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-destructive/15 text-muted-foreground border-border',
};

const tabs = ['All', 'Pending', 'Confirmed', 'Cancelled'] as const;
type TabKey = (typeof tabs)[number];

const OwnerBookings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).limit(1).maybeSingle();
    if (!shop) { setLoading(false); return; }

    const { data } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, status, total_price, profiles:customer_id(full_name, phone), services(name, price_kd), stylists(full_name)')
      .eq('shop_id', shop.id)
      .order('booking_date', { ascending: false });

    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const filtered = activeTab === 'All' ? bookings : bookings.filter(b => b.status === activeTab.toLowerCase());

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Booking confirmed' }); await fetchBookings(); }
    setActionLoading(null);
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', cancelId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Booking cancelled' }); await fetchBookings(); }
    setCancelId(null);
  };

  const maskPhone = (p: string) => p ? p.slice(0, 4) + ' XXXXX' + p.slice(-3) : '—';

  const emptyMessages: Record<TabKey, string> = {
    All: "No bookings yet — share your shop to get started!",
    Pending: "No pending bookings — you're all caught up!",
    Confirmed: "No confirmed bookings.",
    Cancelled: "No cancelled bookings — great record! 🎉",
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-10 w-full rounded-lg" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Bookings</h1>
        <p className="text-sm text-muted-foreground">{bookings.length} total</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${activeTab === tab ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab} ({tab === 'All' ? bookings.length : bookings.filter(b => b.status === tab.toLowerCase()).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{emptyMessages[activeTab]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b: any) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">{(b.services as any)?.name || 'Service'}</p>
                  <p className="text-xs text-muted-foreground">
                    {(b.stylists as any)?.full_name || 'Any stylist'} · {b.booking_date} · {b.start_time}
                  </p>
                  <p className="text-xs text-muted-foreground">{(b.profiles as any)?.full_name || 'Customer'} · {maskPhone((b.profiles as any)?.phone || '')}</p>
                  <p className="text-xs font-semibold text-primary">{Number(b.total_price).toFixed(3)} KD</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusColors[b.status] || ''}`}>{b.status}</span>
              </div>

              {b.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => handleConfirm(b.id)} disabled={actionLoading === b.id} className="flex-1 gold-gradient text-xs text-primary-foreground">
                    {actionLoading === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="mr-1 h-3 w-3" /> Confirm</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCancelId(b.id)} className="flex-1 border-destructive/30 text-xs text-destructive">
                    <X className="mr-1 h-3 w-3" /> Cancel
                  </Button>
                </div>
              )}
              {b.status === 'confirmed' && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => setCancelId(b.id)} className="border-destructive/30 text-xs text-destructive">
                    <X className="mr-1 h-3 w-3" /> Cancel Booking
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>This booking will be cancelled. The customer will be notified once SMS is enabled.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OwnerBookings;
