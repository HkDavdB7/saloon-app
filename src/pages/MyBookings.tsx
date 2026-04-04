import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Loader2, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerLayout from '@/components/CustomerLayout';
import PageHeader from '@/components/PageHeader';
import ReviewForm from '@/components/ReviewForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';

interface BookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  total_price: number;
  status: string;
  shop_id: string;
  stylist_id: string;
  service_id: string;
  shops: { name: string } | null;
  services: { name: string; duration_min: number } | null;
  stylists: { full_name: string } | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    confirmed: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-primary/20 text-primary',
    pending: 'bg-orange-500/20 text-orange-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };
  const colors = colorMap[status] || 'bg-muted text-muted-foreground';
  return <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${colors}`}>{status}</span>;
};

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewBooking, setReviewBooking] = useState<BookingRow | null>(null);
  const { t } = useLanguage()

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingRow | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.booking_date >= today && b.status !== 'cancelled' && b.status !== 'completed');
  const past = bookings.filter(b => b.booking_date < today || b.status === 'completed' || b.status === 'cancelled');

  const days = useMemo(() => Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i)), []);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    const [bookingsRes, reviewsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, booking_date, start_time, total_price, status, shop_id, stylist_id, service_id, shops(name), services(name, duration_min), stylists(full_name)')
        .eq('customer_id', user.id)
        .order('booking_date', { ascending: false }),
      supabase
        .from('reviews')
        .select('booking_id')
        .eq('customer_id', user.id),
    ]);
    setBookings((bookingsRes.data as unknown as BookingRow[]) || []);
    setReviewedBookingIds(new Set((reviewsRes.data || []).map((r: any) => r.booking_id)));
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const cancelBooking = async (id: string) => {
    setCancellingId(id);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('customer_id', user!.id);
    if (error) {
      toast.error('Failed to cancel: ' + error.message);
    } else {
      toast.success('Booking cancelled');
      await fetchBookings();
    }
    setCancellingId(null);
  };

  // Load available time slots for the selected reschedule date
  const loadRescheduleSlots = async (booking: BookingRow, date: string) => {
    setLoadingSlots(true);
    setRescheduleTime('');
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('availability')
      .select('time_slot, is_booked')
      .eq('stylist_id', booking.stylist_id)
      .eq('date', dateStr)
      .order('time_slot');
    if (data && data.length > 0) {
      setRescheduleSlots(data.filter((s: any) => !s.is_booked).map((s: any) => s.time_slot));
    } else {
      // Fallback default slots
      setRescheduleSlots(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']);
    }
    setLoadingSlots(false);
  };

  const openReschedule = (booking: BookingRow) => {
    setRescheduleBooking(booking);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleSlots([]);
  };

  const handleRescheduleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setRescheduleDate(dateStr);
    if (rescheduleBooking) {
      loadRescheduleSlots(rescheduleBooking, dateStr);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) return;
    // Server-side guard: reject past dates
    if (rescheduleDate < today) {
      toast.error('لا يمكن الحجز في تواريخ سابقة');
      return;
    }
    setSubmittingReschedule(true);

    const duration = rescheduleBooking.services?.duration_min || 30;
    const [h, m] = rescheduleTime.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + duration;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: rescheduleDate,
        start_time: rescheduleTime,
        end_time: endTime,
        status: 'pending',
      })
      .eq('id', rescheduleBooking.id)
      .eq('customer_id', user!.id);

    setSubmittingReschedule(false);
    if (error) {
      toast.error('Reschedule failed: ' + error.message);
    } else {
      toast.success('Booking rescheduled!');
      setRescheduleBooking(null);
      await fetchBookings();
    }
  };

  const BookingCard = ({ booking }: { booking: BookingRow }) => {
    const canCancel = (booking.status === 'pending' || booking.status === 'confirmed') && booking.booking_date >= today;
    const canReschedule = (booking.status === 'pending' || booking.status === 'confirmed') && booking.booking_date >= today;
    const canReview = booking.status === 'completed' && !reviewedBookingIds.has(booking.id);

    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{booking.shops?.name || 'Shop'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{booking.services?.name} · {booking.stylists?.full_name || 'Any stylist'}</p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {booking.booking_date}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {booking.start_time}</span>
        </div>
        <p className="mt-2 text-xs font-medium text-primary">{Number(booking.total_price).toFixed(3)} KD</p>

        <div className="mt-3 flex gap-2 flex-wrap">
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="flex-1 text-xs" disabled={cancellingId === booking.id}>
                  {cancellingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  {t('common.cancel')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('common.confirm')} {t('common.cancel')}؟</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.back')}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancelBooking(booking.id)}>{t('common.cancel')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canReschedule && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-primary/30 text-xs text-primary"
              onClick={() => openReschedule(booking)}
            >
              {t('common.edit')}
            </Button>
          )}
          {canReview && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-primary/30 text-xs text-primary"
              onClick={() => setReviewBooking(booking)}
            >
              <Star className="mr-1 h-3 w-3" /> {t('common.edit')}
            </Button>
          )}
          {booking.status === 'completed' && reviewedBookingIds.has(booking.id) && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" /> Reviewed
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <CustomerLayout>
      <PageHeader title={t('customer.myBookings')} />
      <div className="px-4 pt-4 animate-fade-in">
        <Tabs defaultValue="upcoming">
          <TabsList className="w-full">
            <TabsTrigger value="upcoming" className="flex-1">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past" className="flex-1">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4 space-y-3 pb-4">
            {loading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : upcoming.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{t('customer.noBookings')}</p>
            ) : (
              upcoming.map(b => <BookingCard key={b.id} booking={b} />)
            )}
          </TabsContent>
          <TabsContent value="past" className="mt-4 space-y-3 pb-4">
            {loading ? (
              [1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
            ) : past.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{t('customer.noBookings')}</p>
            ) : (
              past.map(b => <BookingCard key={b.id} booking={b} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleBooking} onOpenChange={(o) => !o && setRescheduleBooking(null)}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('common.edit')} {t('booking.yourBooking')}</DialogTitle>
          </DialogHeader>
          {rescheduleBooking && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                <p className="font-medium text-foreground">{rescheduleBooking.shops?.name}</p>
                <p className="text-xs text-muted-foreground">{rescheduleBooking.services?.name} · {rescheduleBooking.stylists?.full_name}</p>
                <p className="text-xs text-muted-foreground">Current: {rescheduleBooking.booking_date} at {rescheduleBooking.start_time}</p>
              </div>

              {/* Date picker — past dates are disabled */}
              <div>
                <p className="mb-2 text-xs font-medium text-foreground">Select New Date</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {days.map((d, i) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const isPast = dateStr < today;
                    return (
                      <button
                        key={i}
                        onClick={() => !isPast && handleRescheduleDateSelect(d)}
                        disabled={isPast}
                        className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-xs transition-colors ${
                          isPast
                            ? 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed'
                            : rescheduleDate === dateStr
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:opacity-80'
                        }`}
                      >
                        <span className="font-medium uppercase">{format(d, 'EEE')}</span>
                        <span className="text-sm font-bold">{format(d, 'd')}</span>
                        <span>{format(d, 'MMM')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time picker */}
              {rescheduleDate && (
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground">Select New Time</p>
                  {loadingSlots ? (
                    <div className="grid grid-cols-4 gap-2">
                      {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-9 w-full" />)}
                    </div>
                  ) : rescheduleSlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No available slots for this date</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {rescheduleSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setRescheduleTime(time)}
                          className={`rounded-lg py-2 text-xs font-medium transition-colors ${
                            rescheduleTime === time
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:opacity-80'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full gold-gradient text-primary-foreground"
                disabled={!rescheduleDate || !rescheduleTime || submittingReschedule}
                onClick={handleReschedule}
              >
                {submittingReschedule ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('common.loading')}...</> : t('booking.confirm')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {reviewBooking && (
        <ReviewForm
          open={!!reviewBooking}
          onOpenChange={(open) => { if (!open) setReviewBooking(null); }}
          bookingId={reviewBooking.id}
          shopId={reviewBooking.shop_id}
          shopName={reviewBooking.shops?.name || 'Shop'}
          onReviewSubmitted={fetchBookings}
        />
      )}
    </CustomerLayout>
  );
};

export default MyBookings;
