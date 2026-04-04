import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, CreditCard, FileText, Users, CalendarCheck, DollarSign, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/constants';

interface Stats {
  totalShops: number;
  activeSubscriptions: number;
  pendingRequests: number;
  totalUsers: number;
  totalBookings: number;
  monthlyRevenue: number;
}

interface ShopPerformance {
  shop_id: string;
  name: string;
  bookings: number;
  revenue: number;
}

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [performance, setPerformance] = useState<ShopPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: totalUsers },
        { count: totalShops },
        { count: activeSubscriptions },
        { count: pendingRequests },
        { count: totalBookings },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('shops').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trial']),
        supabase.from('platform_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
      ]);

      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceISO = since.toISOString().split('T')[0];

      const [{ data: shops }, { data: bookings }] = await Promise.all([
        supabase.from('shops').select('id, name'),
        supabase.from('bookings').select('shop_id, total_price, booking_date, status').gte('booking_date', sinceISO),
      ]);

      const shopMap = Object.fromEntries((shops || []).map((s) => [s.id, s.name]));
      const perfMap: Record<string, { bookings: number; revenue: number }> = {};

      (bookings || []).forEach((b: any) => {
        if (!b.shop_id) return;
        const key = b.shop_id as string;
        if (!perfMap[key]) perfMap[key] = { bookings: 0, revenue: 0 };
        perfMap[key].bookings += 1;
        if (b.status !== 'cancelled') perfMap[key].revenue += Number(b.total_price || 0);
      });

      const perf = Object.entries(perfMap).map(([shop_id, v]) => ({
        shop_id,
        name: shopMap[shop_id] || 'Unknown shop',
        bookings: v.bookings,
        revenue: v.revenue,
      })).sort((a, b) => b.revenue - a.revenue);

      setPerformance(perf);

      const monthlyRevenue = perf.reduce((sum, p) => sum + p.revenue, 0);

      setStats({
        totalUsers: totalUsers ?? 0,
        totalShops: totalShops ?? 0,
        activeSubscriptions: activeSubscriptions ?? 0,
        pendingRequests: pendingRequests ?? 0,
        totalBookings: totalBookings ?? 0,
        monthlyRevenue,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users },
        { label: 'Total Shops', value: stats.totalShops, icon: Store },
        { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard },
        { label: 'Pending Requests', value: stats.pendingRequests, icon: FileText },
        { label: 'Total Bookings', value: stats.totalBookings, icon: CalendarCheck },
        { label: 'Monthly Revenue', value: formatPrice(stats.monthlyRevenue), icon: DollarSign },
      ]
    : [];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Qass platform at a glance</p>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-5">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-border bg-card border-l-2 border-l-primary">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Shop performance */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Shop Performance (30 days)</h2>
            <p className="text-xs text-muted-foreground">Top shops by revenue & bookings</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/shops')}>
            Manage Shops
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border bg-secondary/30">
                <CardContent className="flex items-center justify-between p-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          ) : performance.length === 0 ? (
            <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">No bookings yet.</div>
          ) : (
            performance.slice(0, 5).map((p) => (
              <div key={p.shop_id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.bookings} bookings</p>
                </div>
                <span className="text-sm font-semibold text-primary">{formatPrice(p.revenue)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending alert */}
      {stats && stats.pendingRequests > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {stats.pendingRequests} new shop requests waiting for review
            </span>
          </div>
          <Button size="sm" onClick={() => navigate('/admin/requests')}>
            Review Now
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
