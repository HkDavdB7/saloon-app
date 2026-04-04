import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomerLayout from '@/components/CustomerLayout';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/hooks/useLanguage';

interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
  is_active: boolean;
}

const GRADIENTS = [
  'from-amber-900/60 to-yellow-900/40',
  'from-slate-800/60 to-indigo-900/40',
  'from-emerald-900/60 to-teal-900/40',
  'from-violet-900/60 to-purple-900/40',
  'from-rose-900/60 to-red-900/40',
  'from-cyan-900/60 to-blue-900/40',
];

const CustomerHome = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [filterCity, setFilterCity] = useState('any');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage()

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('shops')
        .select('id, name, address, city, is_active')
        .eq('is_active', true);
      if (err) {
        setError(err.message);
      } else {
        setShops(data || []);
      }
      setLoading(false);
    };
    fetchShops();
  }, []);

  const filtered = shops.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.city?.toLowerCase().includes(search.toLowerCase())) return false;
    // rating filter disabled — ratings computed per-shop on detail page
    if (filterCity !== 'any' && s.city !== filterCity) return false;
    return true;
  });

  const cities = [...new Set(shops.map(s => s.city).filter(Boolean))];

  const resetFilters = () => {
    setFilterRating(0);
    setFilterCity('any');
  };

  return (
    <CustomerLayout>
      <div className="px-4 pt-6 animate-fade-in" dir="rtl">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {t('nav.shops')} <span className="gold-text">{t('nav.home')}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('common.search')}</p>

        <div className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('common.search') + '...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-card pr-10"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" className="shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl border-border bg-card">
              <SheetHeader>
                <SheetTitle className="text-foreground">{t('common.search')}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground">Minimum Rating</label>
                  <div className="mt-2 flex gap-2">
                    {[0, 3, 4, 4.5].map((r) => (
                      <button
                        key={r}
                        onClick={() => setFilterRating(r)}
                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterRating === r ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                      >
                        {r === 0 ? 'Any' : <><Star className="h-3 w-3" /> {r}+</>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">City</label>
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="mt-2 border-border bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any city</SelectItem>
                      {cities.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={resetFilters}>Reset</Button>
                  <Button className="flex-1" onClick={() => setFiltersOpen(false)}>{t('common.confirm')}</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-6 space-y-3 pb-4">
          {loading && (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                  <Skeleton className="h-28 w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </>
          )}

          {error && (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="mt-3 text-sm text-muted-foreground">Failed to load shops</p>
              <p className="text-xs text-muted-foreground/60">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
          )}

          {!loading && !error && filtered.map((shop, idx) => (
            <button
              key={shop.id}
              onClick={() => navigate(`/shop/${shop.id}`)}
              className="w-full rounded-xl border border-border bg-card card-hover text-left"
            >
              <div className={`h-28 rounded-t-xl bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} flex items-end p-4`} />
              <div className="p-4">
                <h3 className="font-display font-semibold text-foreground">{shop.name}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-primary" /> Tap to view
                  </span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {shop.city}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{shop.address}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerHome;
