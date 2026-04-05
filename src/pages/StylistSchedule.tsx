import { useState, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { Check, X, CalendarDays, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pending: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-primary/15 text-primary border-primary/30',
};

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 22; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:30`);
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const defaultWeeklyHours = () => ({
  Mon:    { enabled: true,  start: '09:00', end: '18:00' },
  Tue:    { enabled: true,  start: '09:00', end: '18:00' },
  Wed:    { enabled: true,  start: '09:00', end: '18:00' },
  Thu:    { enabled: true,  start: '09:00', end: '18:00' },
  Fri:    { enabled: true,  start: '09:00', end: '18:00' },
  Sat:    { enabled: false, start: '10:00', end: '16:00' },
  Sun:    { enabled: false, start: '10:00', end: '16:00' },
});

type WeeklyHours = Record<string, { enabled: boolean; start: string; end: string }>;

const BarberSchedule = () => {
  const { user } = useAuth();
  const [stylist, setStylist] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);

  // Weekly hours state
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(defaultWeeklyHours());
  const [loadingHours, setLoadingHours] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  const days = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, []);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDate = format(days[selectedDay], 'yyyy-MM-dd');

  useEffect(() => {
    const idx = days.findIndex(d => format(d, 'yyyy-MM-dd') === todayStr);
    if (idx >= 0) setSelectedDay(idx);
  }, [days, todayStr]);

  useEffect(() => {
    if (!user) return;
    const fetchStylist = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('barbers')
        .select('*')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (err) { setError(err.message); setLoading(false); return; }
      if (!data) { setError('No stylist profile found. Ask your shop admin to add you.'); setLoading(false); return; }
      setStylist(data);
      setLoading(false);
    };
    fetchStylist();
  }, [user]);

  // Fetch weekly hours when stylist loads
  useEffect(() => {
    if (!stylist) return;
    const fetchWeeklyHours = async () => {
      setLoadingHours(true);
      const { data } = await supabase
        .from('stylist_schedule')
        .select('day, start_time, end_time, is_working')
        .eq('barber_id', stylist.id);
      if (data && data.length > 0) {
        const hours: WeeklyHours = defaultWeeklyHours();
        data.forEach((row: any) => {
          const dayKey = WEEKDAYS[row.day - 1]; // day is 1-7 (Mon-Sun)
          if (dayKey && hours[dayKey] !== undefined) {
            hours[dayKey] = { enabled: row.is_working, start: row.start_time, end: row.end_time };
          }
        });
        setWeeklyHours(hours);
      }
      setLoadingHours(false);
    };
    fetchWeeklyHours();
  }, [stylist]);

  const fetchDay = async () => {
    if (!stylist) return;
    setLoadingBookings(true);
    const [bookingsRes, availRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, status, total_price, profiles:customer_id(full_name), services(name)')
        .eq('barber_id', stylist.id)
        .eq('booking_date', selectedDate)
        .order('start_time'),
      supabase
        .from('availability')
        .select('id')
        .eq('barber_id', stylist.id)
        .eq('date', selectedDate),
    ]);
    setBookings(bookingsRes.data || []);
    setIsAvailable((availRes.data || []).length > 0);
    setLoadingBookings(false);
  };

  useEffect(() => { fetchDay(); }, [stylist, selectedDate]);

  const handleAction = async (id: string, newStatus: 'confirmed' | 'completed') => {
    setActionId(id);
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Failed: ' + error.message); }
    else {
      toast.success(`Booking ${newStatus}`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    }
    setActionId(null);
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', cancelId);
    if (error) { toast.error('Failed: ' + error.message); }
    else {
      toast.success('Booking cancelled');
      setBookings(prev => prev.map(b => b.id === cancelId ? { ...b, status: 'cancelled' } : b));
    }
    setCancelId(null);
  };

  const toggleAvailability = async () => {
    if (!stylist) return;
    setTogglingAvail(true);
    if (isAvailable) {
      await supabase.from('availability').delete().eq('barber_id', stylist.id).eq('date', selectedDate).eq('is_booked', false);
      setIsAvailable(false);
      toast.success('Marked as unavailable');
    } else {
      const { error } = await supabase.from('availability').insert({
        barber_id: stylist.id,
        date: selectedDate,
        time_slot: '08:00',
        is_booked: false,
      });
      if (error && error.code === '23505') {
        setIsAvailable(true);
      } else if (error) {
        toast.error('Failed: ' + error.message);
      } else {
        setIsAvailable(true);
        toast.success('Marked as available');
      }
    }
    setTogglingAvail(false);
  };

  const saveWeeklyHours = async () => {
    if (!stylist) return;
    setSavingHours(true);

    // Upsert each day
    const dayIndex: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    const rows = WEEKDAYS.map(day => ({
      barber_id: stylist.id,
      day: dayIndex[day],
      start_time: weeklyHours[day].start,
      end_time: weeklyHours[day].end,
      is_working: weeklyHours[day].enabled,
    }));

    // Upsert — avoids data loss if insert fails (no delete-then-insert race condition)
    const { error } = await supabase
      .from('stylist_schedule')
      .upsert(rows, { onConflict: 'barber_id,day' });

    setSavingHours(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success('Weekly schedule saved');
    }
  };

  const updateWeeklyHours = (day: string, field: 'enabled' | 'start' | 'end', value: any) => {
    setWeeklyHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-20">
        <div className="px-4 pt-6 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-20 w-12 rounded-xl" />)}
          </div>
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-20">
      <div className="px-4 pt-6 animate-fade-in">
        <h1 className="font-display text-2xl font-bold text-foreground">
          My <span className="rose-text">Schedule</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stylist?.full_name} · {format(new Date(), 'EEEE, MMMM d')}
        </p>

        <Tabs defaultValue="day" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="day" className="flex-1">Day View</TabsTrigger>
            <TabsTrigger value="hours" className="flex-1">Weekly Hours</TabsTrigger>
          </TabsList>

          {/* ── DAY VIEW ── */}
          <TabsContent value="day" className="space-y-4">
            {/* Week strip */}
            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {days.map((d, i) => {
                const isToday = format(d, 'yyyy-MM-dd') === todayStr;
                const isSelected = selectedDay === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(i)}
                    className={`flex shrink-0 flex-col items-center rounded-xl px-3.5 py-3 transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : isToday
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase">{format(d, 'EEE')}</span>
                    <span className="mt-0.5 text-lg font-bold">{format(d, 'd')}</span>
                    <span className="text-[10px]">{format(d, 'MMM')}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-foreground">
                {format(days[selectedDay], 'EEEE, MMM d')}
              </h2>
              <span className="text-xs text-muted-foreground">{activeBookings.length} booking{activeBookings.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-3">
              {loadingBookings ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
              ) : activeBookings.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">No bookings for this day</p>
                </div>
              ) : (
                activeBookings.map((b: any) => (
                  <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {b.start_time} — {b.end_time || '??:??'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(b.profiles as any)?.full_name || 'Customer'}
                        </p>
                        <p className="text-xs text-primary font-medium">
                          {(b.services as any)?.name || 'Service'}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusColors[b.status] || ''}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {b.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => handleAction(b.id, 'confirmed')} disabled={actionId === b.id} className="flex-1 rose-gradient text-xs text-primary-foreground">
                            {actionId === b.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="mr-1 h-3 w-3" />}
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setCancelId(b.id)} className="flex-1 border-destructive/30 text-xs text-destructive">
                            <X className="mr-1 h-3 w-3" /> Cancel
                          </Button>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <>
                          <Button size="sm" onClick={() => handleAction(b.id, 'completed')} disabled={actionId === b.id} className="flex-1 rose-gradient text-xs text-primary-foreground">
                            {actionId === b.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="mr-1 h-3 w-3" />}
                            Complete
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setCancelId(b.id)} className="border-destructive/30 text-xs text-destructive">
                            <X className="mr-1 h-3 w-3" /> Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}

              {cancelledBookings.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Cancelled</p>
                  {cancelledBookings.map((b: any) => (
                    <div key={b.id} className="rounded-xl border border-border bg-card/50 p-4 opacity-60">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground line-through">
                            {b.start_time} — {b.end_time || '??:??'}
                          </p>
                          <p className="text-xs text-muted-foreground">{(b.profiles as any)?.full_name || 'Customer'}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusColors.cancelled}`}>cancelled</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Availability toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Available this day</p>
                <p className="text-xs text-muted-foreground">Toggle to accept bookings for {format(days[selectedDay], 'MMM d')}</p>
              </div>
              <Switch checked={isAvailable} onCheckedChange={toggleAvailability} disabled={togglingAvail} />
            </div>
          </TabsContent>

          {/* ── WEEKLY HOURS ── */}
          <TabsContent value="hours" className="space-y-3">
            {loadingHours ? (
              <div className="space-y-3">
                {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Set your weekly working hours. Customers will only book during these times.</p>
                {WEEKDAYS.map((day) => (
                  <div key={day} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground w-12">{day}</span>
                      <Switch
                        checked={weeklyHours[day].enabled}
                        onCheckedChange={(v) => updateWeeklyHours(day, 'enabled', v)}
                      />
                    </div>
                    {weeklyHours[day].enabled && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <select
                          className="flex-1 rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs text-foreground"
                          value={weeklyHours[day].start}
                          onChange={(e) => updateWeeklyHours(day, 'start', e.target.value)}
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <span className="text-xs text-muted-foreground">to</span>
                        <select
                          className="flex-1 rounded-lg border border-border bg-secondary px-2 py-1.5 text-xs text-foreground"
                          value={weeklyHours[day].end}
                          onChange={(e) => updateWeeklyHours(day, 'end', e.target.value)}
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {!weeklyHours[day].enabled && (
                      <p className="text-xs text-muted-foreground italic">Not working</p>
                    )}
                  </div>
                ))}
                <Button
                  className="w-full rose-gradient text-primary-foreground"
                  onClick={saveWeeklyHours}
                  disabled={savingHours}
                >
                  {savingHours ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Weekly Schedule'}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>This booking will be cancelled. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default BarberSchedule;
