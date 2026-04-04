import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { KUWAIT_AREAS, HOUR_OPTIONS } from '@/lib/constants';
import { ImagePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

const defaultHours = (): Record<string, DayHours> =>
  Object.fromEntries(DAYS.map((d) => [d, { open: d !== 'Friday', from: '09:00', to: '22:00' }]));

const OwnerShop = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [hours, setHours] = useState<Record<string, DayHours>>(defaultHours);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const fetchShop = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setShopId(data.id);
        setName(data.name || '');
        setDescription(data.description || '');
        setPhone((data.phone || '').replace('+965', ''));
        setAddress(data.address || '');
        setArea(data.city || '');
        setIsActive(data.is_active ?? true);
        if (data.opening_hours && typeof data.opening_hours === 'object') {
          setHours({ ...defaultHours(), ...(data.opening_hours as Record<string, DayHours>) });
        }
      }
      setLoading(false);
    };
    fetchShop();
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Shop name is required';
    if (!address.trim()) e.address = 'Address is required';
    if (!phone.trim()) e.phone = 'Phone is required';
    else if (!/^\d{8}$/.test(phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 8-digit number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      phone: '+965' + phone.replace(/\s/g, ''),
      address: address.trim(),
      city: area,
      is_active: isActive,
      opening_hours: hours,
    };

    if (shopId) {
      const { error } = await supabase.from('shops').update(payload).eq('id', shopId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Shop saved!', description: 'Your shop details have been updated.' });
      }
    } else {
      const { data, error } = await supabase.from('shops').insert({ ...payload, owner_id: user.id }).select('id').single();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setShopId(data.id);
        toast({ title: 'Shop created!', description: 'Your stylistshop is now set up.' });
      }
    }
    setSaving(false);
  };

  const updateDay = (day: string, field: keyof DayHours, value: string | boolean) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">My Shop</h1>
        <p className="text-sm text-muted-foreground">Set up and manage your stylistshop details</p>
      </div>

      {/* Shop Status */}
      <section className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Shop Status</h2>
          <p className="text-xs text-muted-foreground">
            {isActive ? 'Your shop is visible to customers' : 'Your shop is hidden from customers'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isActive ? 'text-green-500' : 'text-muted-foreground'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </section>

      {/* Basic info */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-foreground">Basic Information</h2>
        <div className="space-y-1.5">
          <Label htmlFor="shopName">Shop Name *</Label>
          <Input id="shopName" placeholder="e.g. Al-Nakheel Stylists" value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" placeholder="Tell customers about your shop..." maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" />
          <p className="text-right text-xs text-muted-foreground">{description.length}/200</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number *</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground">+965</span>
            <Input id="phone" placeholder="55001234" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address *</Label>
          <Input id="address" placeholder="Block 5, Salem Al-Mubarak St" value={address} onChange={(e) => setAddress(e.target.value)} />
          {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Area / District</Label>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
            <SelectContent>
              {KUWAIT_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Hours */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-foreground">Opening Hours</h2>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const d = hours[day];
            return (
              <div key={day} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex w-28 items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{day.slice(0, 3)}</span>
                  <Switch checked={d.open} onCheckedChange={(v) => updateDay(day, 'open', v)} />
                </div>
                {d.open ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Select value={d.from} onValueChange={(v) => updateDay(day, 'from', v)}>
                      <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{HOUR_OPTIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-muted-foreground">–</span>
                    <Select value={d.to} onValueChange={(v) => updateDay(day, 'to', v)}>
                      <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{HOUR_OPTIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Photos */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-foreground">Shop Photos</h2>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 transition-colors hover:border-primary/40">
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Upload up to 3 photos of your shop (coming soon)</p>
      </section>

      <Button onClick={handleSave} disabled={saving} className="w-full gold-gradient font-semibold text-primary-foreground">
        {saving ? 'Saving...' : 'Save Shop'}
      </Button>
    </div>
  );
};

export default OwnerShop;
