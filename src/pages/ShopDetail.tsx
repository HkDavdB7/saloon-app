import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Scissors, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerLayout from '@/components/CustomerLayout';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/hooks/useLanguage';

const GRADIENTS = [
  'from-amber-900/60 to-yellow-900/40',
  'from-slate-800/60 to-indigo-900/40',
  'from-emerald-900/60 to-teal-900/40',
];

const ShopDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage()

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);

      const [shopRes, servRes, barbRes, revRes] = await Promise.all([
        supabase.from('shops').select('*').eq('id', id).maybeSingle(),
        supabase.from('services').select('*').eq('shop_id', id).eq('is_active', true),
        supabase.from('stylists').select('*').eq('shop_id', id).eq('is_active', true),
        supabase.from('reviews').select('id, rating, comment, created_at, profiles(full_name)').eq('shop_id', id).order('created_at', { ascending: false }),
      ]);

      if (shopRes.error) {
        setError(shopRes.error.message);
        setLoading(false);
        return;
      }
      if (!shopRes.data) {
        setError('Shop not found');
        setLoading(false);
        return;
      }

      setShop(shopRes.data);
      setServices(servRes.data || []);
      setStylists(barbRes.data || []);
      setReviews(revRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <CustomerLayout>
        <Skeleton className="h-52 w-full rounded-none" />
        <div className="px-4 mt-4 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full mt-4" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </CustomerLayout>
    );
  }

  if (error || !shop) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-3 text-sm text-muted-foreground">{error || 'Shop not found'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/')}>{t('common.back')}</Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className={`relative h-52 bg-gradient-to-br ${GRADIENTS[0]}`}>
        <button onClick={() => navigate('/')} className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent p-4 pt-12">
          <h1 className="font-display text-xl font-bold text-foreground">{shop.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-primary" /> {avgRating} ({reviews.length})</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {shop.city}</span>
          </div>
        </div>
      </div>

      <div className="px-4">
        <p className="mt-3 text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{shop.address}, {shop.city}</p>

        <Tabs defaultValue="services" className="mt-5">
          <TabsList className="w-full">
            <TabsTrigger value="services" className="flex-1">{t('booking.selectService')} ({services.length})</TabsTrigger>
            <TabsTrigger value="stylists" className="flex-1">{t('booking.selectStylist')} ({stylists.length})</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-4 space-y-3 pb-4">
            {services.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No services available</p>}
            {services.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <Scissors className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.duration_min} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-primary">{Number(s.price_kd).toFixed(3)} KD</span>
                  <Button size="sm" onClick={() => navigate(`/book/${shop.id}/service?selected=${s.id}`)}>{t('booking.bookNow')}</Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="stylists" className="mt-4 space-y-3 pb-4">
            {stylists.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No stylists listed</p>}
            {stylists.map((b: any) => (
              <div key={b.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  {b.avatar_url ? <img src={b.avatar_url} alt={b.full_name} className="h-full w-full rounded-full object-cover" /> : <User className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{b.full_name}</p>
                  {b.bio && <p className="text-xs text-muted-foreground">{b.bio}</p>}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-3 pb-4">
            {reviews.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No reviews yet</p>}
            {reviews.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{(r.profiles as any)?.full_name || 'Customer'}</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="mt-2 text-xs text-muted-foreground">{r.comment}</p>}
                <p className="mt-2 text-[10px] text-muted-foreground/60">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
};

export default ShopDetail;
