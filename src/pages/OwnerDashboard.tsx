import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Calendar, TrendingUp, Clock, CheckCircle2, Circle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/hooks/useLanguage';

const statusColors: Record<string, string> = {
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  pending: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);

      // Get shop
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      setShop(shopData);

      if (!shopData) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.slice(0, 8) + '01';

      const [todayRes, pendingRes, revenueRes, recentRes] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('shop_id', shopData.id).eq('booking_date', today),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('shop_id', shopData.id).eq('status', 'pending'),
        supabase.from('bookings').select('total_price').eq('shop_id', shopData.id).neq('status', 'cancelled').gte('booking_date', monthStart),
        supabase.from('bookings').select('id, booking_date, start_time, status, total_price, profiles:customer_id(full_name), services(name)').eq('shop_id', shopData.id).order('created_at', { ascending: false }).limit(5),
      ]);

      setTodayCount(todayRes.count || 0);
      setPendingCount(pendingRes.count || 0);
      setMonthRevenue((revenueRes.data || []).reduce((sum: number, r: any) => sum + Number(r.total_price || 0), 0));
      setRecentBookings(recentRes.data || []);
      setLoading(false);
    };
    fetchData();

    // Poll every 30s so owner sees new bookings without manual refresh
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-6 w-1/3" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="animate-fade-in">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl rose-gradient">
              <Store className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">{t('owner.dashboard')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('owner.setUpMyShop')}</p>

            <div className="mt-8 space-y-3 text-left">
              {[
                { done: true, label: t('auth.getStarted') },
                { done: false, label: t('owner.setUpMyShop') },
                { done: false, label: t('owner.manageServices') },
                { done: false, label: t('owner.inviteEmail') },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  {step.done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                  <span className={`text-sm font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                </div>
              ))}
            </div>

            <Button onClick={() => navigate('/owner/shop')} className="mt-8 w-full rose-gradient font-semibold text-primary-foreground">
              {t('owner.setUpMyShop')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t('owner.dashboard')}</h1>
        <p className="text-sm text-muted-foreground">{shop?.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('owner.todayBookings'), value: String(todayCount), icon: Calendar },
          { label: t('owner.monthRevenue'), value: `${monthRevenue.toFixed(3)} KD`, icon: TrendingUp },
          { label: t('owner.pending'), value: String(pendingCount), icon: Clock, link: '/owner/bookings' },
          { label: t('owner.thisMonth'), value: `${monthRevenue.toFixed(3)} KD`, icon: Calendar },
        ].map((stat) =>
          stat.link ? (
            <button key={stat.label} onClick={() => navigate(stat.link!)} className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
              <stat.icon className="h-4 w-4 text-primary" />
              <p className="mt-2 text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </button>
          ) : (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <stat.icon className="h-4 w-4 text-primary" />
              <p className="mt-2 text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          )
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={() => navigate('/owner/bookings')} variant="outline" className="flex-1 border-primary/30 text-primary hover:bg-primary/10">{t('owner.viewTodaysBookings')}</Button>
        <Button onClick={() => navigate('/owner/services')} variant="outline" className="flex-1 border-border">{t('owner.manageServices')}</Button>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">{t('owner.recentBookings')}</h2>
        {recentBookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('owner.noBookingsYet')}</p>
        ) : (
          <div className="space-y-2">
            {recentBookings.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{(b.services as any)?.name || 'Service'}</p>
                  <p className="text-xs text-muted-foreground">{(b.profiles as any)?.full_name || 'Customer'} · {b.start_time}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusColors[b.status] || ''}`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
