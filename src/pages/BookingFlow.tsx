import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Star, Check, ChevronRight, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerLayout from '@/components/CustomerLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

const steps = ['Service', 'Stylist', 'Date & Time', 'Confirm'];

const BookingFlow = () => {
  const { shopId, step } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [shop, setShop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingShop, setLoadingShop] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState(searchParams.get('selected') || '');
  const [selectedBarberId, setSelectedBarberId] = useState('any');
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState('');
  const [barbersLoadError, setBarbersLoadError] = useState(false);
  const { t } = useLanguage()

  const currentStep = step === 'service' ? 0 : step === 'stylist' ? 1 : step === 'time' ? 2 : 3;
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i)), []);

  // Load shop + services + barbers
  useEffect(() => {
    const fetch = async () => {
      setLoadingShop(true);
      setBarbersLoadError(false);
      const [shopRes, servRes, barbRes] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shopId).maybeSingle(),
        supabase.from('services').select('*').eq('shop_id', shopId).eq('is_active', true),
        supabase.from('barbers').select('*').eq('shop_id', shopId),
      ]);
      setShop(shopRes.data);
      setServices(servRes.data || []);
      if (barbRes.error) {
        console.error('Barbers query failed:', barbRes.error.message);
        setBarbersLoadError(true);
        setBarbers([]);
      } else {
        setBarbers(barbRes.data || []);
      }
      setLoadingShop(false);
    };
    fetch();
  }, [shopId]);

  // Load availability when stylist + date change
  useEffect(() => {
    if (currentStep !== 2) return;
    // Don't query if barbers haven't loaded yet (race condition guard)
    if (barbers.length === 0) return;
    const barberId = selectedBarberId === 'any' ? barbers[0]?.id : selectedBarberId;

    const dateStr = format(days[selectedDay], 'yyyy-MM-dd');
    setLoadingSlots(true);
    setSelectedTime('');

    const fetchSlots = async () => {
      const { data } = await supabase
        .from('availability')
        .select('time_slot, is_booked')
        .eq('barber_id', barberId)
        .eq('date', dateStr)
        .order('time_slot');

      if (data && data.length > 0) {
        setTimeSlots(data.map((s: any) => ({ time: s.time_slot, available: !s.is_booked })));
      } else {
        // Fallback: generate default slots if no availability rows
        const defaults = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
        setTimeSlots(defaults.map(t => ({ time: t, available: true })));
      }
      setLoadingSlots(false);
    };
    fetchSlots();
  }, [currentStep, selectedBarberId, selectedDay, barbers, days]);

  const goNext = () => {
    // Guard: don't let user proceed to stylist step if barbers failed to load
    if (currentStep === 0 && barbersLoadError) {
      toast.error('Failed to load barbers. Please try again.');
      return;
    }
    // Guard: prevent skip to confirm if no barbers loaded
    if (currentStep === 1 && barbers.length === 0 && !barbersLoadError) {
      toast.error('No barbers available for this salon.');
      return;
    }
    const nextRoutes = ['stylist', 'time', 'confirm'];
    if (currentStep < 3) navigate(`/book/${shopId}/${nextRoutes[currentStep]}`);
  };
  const goBack = () => {
    const prevRoutes = ['/shop/' + shopId, 'service', 'stylist', 'time'];
    if (currentStep === 0) navigate(prevRoutes[0]);
    else navigate(`/book/${shopId}/${prevRoutes[currentStep]}`);
  };

  const confirmBooking = async () => {
    if (!user || !selectedService || !selectedTime) return;
    setSubmitting(true);

    const bookingDate = format(days[selectedDay], 'yyyy-MM-dd');

    // Resolve stylist — "Any stylist" picks first available; hard fail if none exist
    const resolvedBarberId = selectedBarberId === 'any' ? barbers[0]?.id : selectedBarberId;
    if (!resolvedBarberId) {
      toast.error('No stylist available for this shop. Please try again later.');
      setSubmitting(false);
      return;
    }

    // Calculate end time
    const [h, m] = selectedTime.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + (selectedService.duration_min || 30);
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    // Double-booking check
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('barber_id', resolvedBarberId)
      .eq('booking_date', bookingDate)
      .eq('start_time', selectedTime)
      .neq('status', 'cancelled')
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      toast.error('This time slot was just booked. Please pick another time.');
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.from('bookings').insert({
      customer_id: user.id,
      shop_id: shopId,
      barber_id: resolvedBarberId,
      service_id: selectedServiceId,
      booking_date: bookingDate,
      start_time: selectedTime,
      end_time: endTime,
      status: 'pending',
      total_price: selectedService.price_kd,
    }).select('id').single();

    setSubmitting(false);

    if (error) {
      toast.error('Booking failed: ' + error.message);
      return;
    }

    navigate('/book/success', {
      state: {
        bookingId: data.id,
        shopName: shop?.name,
        service: { name: selectedService.name, price: Number(selectedService.price_kd), duration: selectedService.duration_min },
        stylist: selectedBarberId === 'any' ? 'Any stylist' : selectedBarber?.name,
        date: format(days[selectedDay], 'EEE, MMM d'),
        time: selectedTime,
      },
    });
  };

  if (loadingShop) {
    return (
      <CustomerLayout>
        <div className="px-4 pt-6 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-lg">
        <button onClick={goBack} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div>
          <h1 className="font-display text-base font-bold text-foreground">{shop?.name}</h1>
          <p className="text-[10px] text-muted-foreground">Step {currentStep + 1} of 4</p>
        </div>
      </header>

      <div className="flex gap-1 px-4 pt-4">
        {steps.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= currentStep ? 'bg-primary' : 'bg-secondary'}`} />
        ))}
      </div>
      <p className="mt-2 px-4 text-xs font-medium text-primary">
        {[t('booking.selectService'), t('booking.selectStylist'), 'Date & Time', t('booking.confirm')][currentStep]}
      </p>

      <div className="mt-4 px-4 pb-4 animate-fade-in">
        {/* STEP 0 — SERVICE */}
        {currentStep === 0 && (
          <div className="space-y-3">
            {services.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No services available</p>}
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedServiceId(s.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${selectedServiceId === s.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  {s.duration_min ? <p className="text-xs text-muted-foreground">{s.duration_min} min</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">{s.price_kd && Number(s.price_kd) > 0 ? `${Number(s.price_kd).toFixed(3)} KD` : 'Free'}</span>
                  {selectedServiceId === s.id && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            ))}
            <Button className="mt-4 w-full" disabled={!selectedServiceId} onClick={goNext}>
              {t('common.continue')} <ChevronRight className="mr-1 h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        )}

        {/* STEP 1 — STYLIST */}
        {currentStep === 1 && (
          <div className="space-y-3">
            <button
              onClick={() => setSelectedBarberId('any')}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${selectedBarberId === 'any' ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg">🎲</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Any stylist</p>
                <p className="text-xs text-muted-foreground">First available</p>
              </div>
              {selectedBarberId === 'any' && <Check className="h-4 w-4 text-primary" />}
            </button>
            {barbersLoadError ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Failed to load barbers. Please go back and try again.
              </p>
            ) : barbers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No barbers listed for this salon yet.
              </p>
            ) : (
              barbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarberId(b.id)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${selectedBarberId === b.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    {b.avatar_url ? <img src={b.avatar_url} alt={b.name} className="h-full w-full rounded-full object-cover" /> : <User className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{b.name}</p>
                    {b.bio && <p className="text-xs text-muted-foreground">{b.bio}</p>}
                  </div>
                  {selectedBarberId === b.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))
            )}
            <Button className="mt-4 w-full" onClick={goNext}>
              {t('common.continue')} <ChevronRight className="mr-1 h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        )}

        {/* STEP 2 — DATE & TIME */}
        {currentStep === 2 && (
          <div>
            <p className="text-sm font-medium text-foreground">Select Date</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {days.map((d, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedDay(i); setSelectedTime(''); }}
                  className={`flex shrink-0 flex-col items-center rounded-xl px-4 py-3 transition-colors ${selectedDay === i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                >
                  <span className="text-[10px] font-medium uppercase">{format(d, 'EEE')}</span>
                  <span className="mt-0.5 text-lg font-bold">{format(d, 'd')}</span>
                  <span className="text-[10px]">{format(d, 'MMM')}</span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm font-medium text-foreground">Select Time</p>
            {loadingSlots ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : timeSlots.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No slots available for this date</p>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-lg py-2.5 text-xs font-medium transition-colors ${
                      !slot.available
                        ? 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                        : selectedTime === slot.time
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
            <Button className="mt-6 w-full" disabled={!selectedTime} onClick={goNext}>
              {t('common.continue')} <ChevronRight className="mr-1 h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        )}

        {/* STEP 3 — CONFIRM */}
        {currentStep === 3 && (
          <div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Shop</p>
                <p className="text-sm font-medium text-foreground">{shop?.name}</p>
                <p className="text-xs text-muted-foreground">{shop?.address}, {shop?.city}</p>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Service</p>
                  <p className="text-sm font-medium text-foreground">{selectedService?.name}</p>
                  {selectedService?.duration_min ? <p className="text-xs text-muted-foreground">{selectedService.duration_min} min</p> : null}
                </div>
                <p className="text-sm font-semibold text-primary">{selectedService?.price_kd && Number(selectedService.price_kd) > 0 ? `${Number(selectedService.price_kd).toFixed(3)} KD` : 'Free'}</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Stylist</p>
                <p className="text-sm font-medium text-foreground">{selectedBarberId === 'any' ? 'Any stylist' : selectedBarber?.name}</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Date & Time</p>
                <p className="text-sm font-medium text-foreground">{format(days[selectedDay], 'EEEE, MMMM d')}</p>
                <p className="text-xs text-primary font-medium">{selectedTime}</p>
              </div>
            </div>
            <button onClick={goBack} className="mt-3 text-xs text-primary underline">{t('common.edit')} {t('booking.yourBooking')}</button>
            <Button className="mt-4 w-full" onClick={confirmBooking} disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('common.loading')}...</> : t('booking.confirm')}
            </Button>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default BookingFlow;
