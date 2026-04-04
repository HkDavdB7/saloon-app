import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { DURATION_OPTIONS } from '@/lib/constants';
import { Plus, Pencil, Trash2, Clock, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const OwnerServices = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [shopId, setShopId] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDuration, setFormDuration] = useState('30');
  const [formPrice, setFormPrice] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchServices = async () => {
    if (!user) return;
    setLoading(true);
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).limit(1).maybeSingle();
    if (!shop) { setLoading(false); return; }
    setShopId(shop.id);
    const { data } = await supabase.from('services').select('*').eq('shop_id', shop.id).eq('is_active', true).order('created_at');
    setServices(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, [user]);

  const openAddSheet = () => {
    setEditingId(null);
    setFormName(''); setFormDuration('30'); setFormPrice(''); setFormDesc(''); setFormErrors({});
    setSheetOpen(true);
  };

  const openEditSheet = (s: any) => {
    setEditingId(s.id);
    setFormName(s.name);
    setFormDuration(String(s.duration_min));
    setFormPrice(Number(s.price_kd).toFixed(3));
    setFormDesc(s.description || '');
    setFormErrors({});
    setSheetOpen(true);
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formName.trim()) e.name = 'Service name is required';
    const p = parseFloat(formPrice);
    if (!formPrice || isNaN(p) || p <= 0) e.price = 'Enter a valid price';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !shopId) return;
    setSaving(true);

    const payload = {
      name: formName.trim(),
      duration_min: parseInt(formDuration),
      price: parseFloat(parseFloat(formPrice).toFixed(3)),
      description: formDesc.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from('services').update(payload).eq('id', editingId);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
      else { toast({ title: 'Service updated' }); }
    } else {
      const { error } = await supabase.from('services').insert({ ...payload, shop_id: shopId, is_active: true });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
      else { toast({ title: 'Service added' }); }
    }

    setSaving(false);
    setSheetOpen(false);
    fetchServices();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('services').update({ is_active: false }).eq('id', deleteId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Service deleted' }); }
    setDeleteId(null);
    fetchServices();
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Skeleton className="h-8 w-1/2" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground">{services.length} services</p>
        </div>
        <Button onClick={openAddSheet} className="rose-gradient text-primary-foreground">
          <Plus className="mr-1 h-4 w-4" /> Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Wrench className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">No services yet. Add your first service to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{s.name}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5">
                    <Clock className="h-3 w-3" /> {s.duration_min} min
                  </span>
                  <span className="font-semibold text-primary">{Number(s.price_kd).toFixed(3)} KD</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEditSheet(s)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-destructive/70" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="border-border bg-card">
          <SheetHeader><SheetTitle className="text-foreground">{editingId ? 'Edit Service' : 'Add Service'}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Service Name *</Label>
              <Input placeholder="e.g. Haircut" value={formName} onChange={(e) => setFormName(e.target.value)} />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={formDuration} onValueChange={setFormDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DURATION_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price (KD) *</Label>
              <Input type="number" step="0.001" min="0" placeholder="5.000" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} onBlur={() => { const n = parseFloat(formPrice); if (!isNaN(n)) setFormPrice(n.toFixed(3)); }} />
              {formErrors.price && <p className="text-xs text-destructive">{formErrors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea placeholder="Brief description..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="resize-none" maxLength={200} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full rose-gradient text-primary-foreground">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Service</AlertDialogTitle>
            <AlertDialogDescription>This service will be deactivated and hidden from customers.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OwnerServices;
