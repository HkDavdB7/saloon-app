import { useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import { Shield, Users, Store, CalendarCheck, Clock, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalUsers: number;
  totalShops: number;
  totalBookings: number;
  todayBookings: number;
  pendingBookings: number;
  topBarbers: { barber_id: string; name: string; count: number }[];
}

const AdminPanel = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];

      const [
        { count: totalUsers },
        { count: totalShops },
        { count: totalBookings },
        { count: todayBookings },
        { count: pendingBookings },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('shops').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('booking_date', today),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])

      const recentRes = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, status, total_price, profiles:customer_id(full_name), shops:name, barbers(full_name)')
        .order('created_at', { ascending: false })
        .limit(8)

      const topBarbersRes = await supabase
        .from('bookings')
        .select('barber_id, barbers(full_name)')
        .neq('status', 'cancelled')
        .gte('booking_date', today.slice(0, 7) + '-01')
        .order('booking_date', { ascending: false })

      const barberMap: Record<string, { name: string; count: number }> = {}
      ;(topBarbersRes.data || []).forEach((b: any) => {
        if (!b.barber_id) return
        const name = b.barbers?.full_name || 'Unknown'
        if (!barberMap[b.barber_id]) barberMap[b.barber_id] = { name, count: 0 }
        barberMap[b.barber_id].count++
      })
      const topBarbers = Object.entries(barberMap)
        .map(([barber_id, v]) => ({ barber_id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setStats({
        totalUsers: totalUsers ?? 0,
        totalShops: totalShops ?? 0,
        totalBookings: totalBookings ?? 0,
        todayBookings: todayBookings ?? 0,
        pendingBookings: pendingBookings ?? 0,
        topBarbers,
      })
      setRecentBookings(recentRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-primary/15 text-primary border-primary/30'
      case 'pending': return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
      case 'completed': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      case 'cancelled': return 'bg-destructive/15 text-destructive border-destructive/30'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-6 space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">نظام إدارة المنصة</p>
          </div>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border bg-card border-r-2 border-r-primary">
              <CardContent className="flex items-center gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المستخدمين</p>
                  <p className="font-display text-2xl font-bold text-foreground">{stats?.totalUsers ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card border-r-2 border-r-primary">
              <CardContent className="flex items-center gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المحلات</p>
                  <p className="font-display text-2xl font-bold text-foreground">{stats?.totalShops ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card border-r-2 border-r-primary">
              <CardContent className="flex items-center gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">حجوزات اليوم</p>
                  <p className="font-display text-2xl font-bold text-foreground">{stats?.todayBookings ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card border-r-2 border-r-primary">
              <CardContent className="flex items-center gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground"> معلقة</p>
                  <p className="font-display text-2xl font-bold text-foreground">{stats?.pendingBookings ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top barbers */}
        {!loading && stats && stats.topBarbers.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-base font-semibold text-foreground mb-3">أفضل الحلاقين هذا الشهر</h2>
            <div className="space-y-2">
              {stats.topBarbers.map((b, i) => (
                <div key={b.barber_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm text-foreground flex-1">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.count} حجز</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent bookings */}
        {!loading && recentBookings.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-base font-semibold text-foreground mb-3">أحدث الحجوزات</h2>
            <div className="space-y-2">
              {recentBookings.slice(0, 6).map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-20">{b.booking_date}</span>
                  <span className="text-xs text-muted-foreground w-12">{b.start_time}</span>
                  <span className="flex-1 text-foreground truncate">{b.profiles?.full_name || '—'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(b.status)}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="secondary" className="w-full" onClick={() => window.location.href = '/admin/requests'}>
          عرض كل الحجوزات →
        </Button>
      </main>
    </div>
  )
}

export default AdminPanel
