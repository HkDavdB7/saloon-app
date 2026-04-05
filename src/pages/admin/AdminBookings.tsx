import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { CalendarDays, Check, Loader2, X, CheckCircle2 } from 'lucide-react';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  total_price: number | null;
  shops: { name: string } | null;
  profiles: { full_name: string | null; phone?: string | null } | null;
  barbers: { full_name: string | null } | null;
  services: { name: string | null } | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

const tabs = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] as const;
type TabKey = (typeof tabs)[number];

const AdminBookings = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, status, total_price, shops(name), profiles:customer_id(full_name, phone), barbers(full_name), services(name)')
      .order('booking_date', { ascending: false });

    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setBookings((data || []) as unknown as Booking[]);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const filtered = activeTab === 'All' ? bookings : bookings.filter(b => b.status === activeTab.toLowerCase());

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id + status);
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: `Booking ${status}` });
      await fetchBookings();
    }
    setActionLoading(null);
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    await updateStatus(cancelId, 'cancelled');
    setCancelId(null);
  };

  const maskPhone = (p?: string | null) => (p ? p.slice(0, 4) + ' XXXXX' + p.slice(-3) : '—');

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Bookings Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">{bookings.length} bookings</p>
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

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-5">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">No bookings found</div>
        ) : (
          filtered.map((b) => (
            <Card key={b.id} className="border-border bg-card border-l-2 border-l-primary">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">
                        {b.profiles?.full_name || 'Unknown Customer'}
                      </h3>
                      <Badge className={`text-[10px] ${statusColors[b.status] || 'bg-muted text-muted-foreground'}`}>
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                      {b.booking_date} · {b.start_time?.slice(0, 5)} · {b.shops?.name || 'Unknown Shop'} · {b.barbers?.full_name || 'Unknown Stylist'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.services?.name || 'Service'} · {maskPhone(b.profiles?.phone)}
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold text-foreground">
                    {b.total_price != null ? `${Number(b.total_price).toFixed(2)} KD` : '—'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {b.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(b.id, 'confirmed')} disabled={actionLoading === b.id + 'confirmed'} className="rose-gradient text-xs text-primary-foreground">
                        {actionLoading === b.id + 'confirmed' ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="mr-1 h-3 w-3" /> Confirm</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelId(b.id)} className="border-destructive/30 text-xs text-destructive">
                        <X className="mr-1 h-3 w-3" /> Cancel
                      </Button>
                    </>
                  )}
                  {b.status === 'confirmed' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(b.id, 'completed')} disabled={actionLoading === b.id + 'completed'} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                        {actionLoading === b.id + 'completed' ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="mr-1 h-3 w-3" /> Mark Completed</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelId(b.id)} className="border-destructive/30 text-xs text-destructive">
                        <X className="mr-1 h-3 w-3" /> Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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

export default AdminBookings;
