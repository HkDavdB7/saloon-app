import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/constants';
import { Pencil, Plus, Check, X, Loader2, Store } from 'lucide-react';

interface PackageRow {
  id: string;
  name: string;
  price: number;
  max_seats: number | null;
  max_barbers: number | null;
  features: string[] | null;
  is_active: boolean | null;
}

const AdminPackages = () => {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; price: string; maxSeats: string; maxBarbers: string; features: string }>(
    { name: '', price: '', maxSeats: '', maxBarbers: '', features: '' }
  );
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', price: '', maxSeats: '', maxBarbers: '', features: '' });
  const [adding, setAdding] = useState(false);

  const loadPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('packages')
      .select('id, name, price, max_seats, max_barbers, features, is_active')
      .order('price', { ascending: true });

    if (error) {
      toast({ title: 'Failed to load packages', variant: 'destructive' });
      setLoading(false);
      return;
    }

    setPackages((data || []) as PackageRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const startEdit = (pkg: PackageRow) => {
    setEditingId(pkg.id);
    setEditForm({
      name: pkg.name,
      price: String(pkg.price ?? ''),
      maxSeats: String(pkg.max_seats ?? ''),
      maxBarbers: String(pkg.max_barbers ?? ''),
      features: (pkg.features || []).join(', '),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const payload = {
      name: editForm.name.trim(),
      price: Number(editForm.price),
      max_seats: editForm.maxSeats ? Number(editForm.maxSeats) : null,
      max_barbers: editForm.maxBarbers ? Number(editForm.maxBarbers) : null,
      features: editForm.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
    };

    const { error } = await supabase.from('packages').update(payload).eq('id', editingId);
    setSaving(false);

    if (error) {
      toast({ title: 'Failed to update package', variant: 'destructive' });
      return;
    }

    setEditingId(null);
    await loadPackages();
    toast({ title: 'Package updated' });
  };

  const toggleActive = async (pkg: PackageRow) => {
    const { error } = await supabase
      .from('packages')
      .update({ is_active: !pkg.is_active })
      .eq('id', pkg.id);

    if (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
      return;
    }

    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, is_active: !p.is_active } : p)));
    toast({ title: 'Package status updated' });
  };

  const handleAdd = async () => {
    if (!addForm.name || !addForm.price) return;
    setAdding(true);

    const payload = {
      name: addForm.name.trim(),
      price: Number(addForm.price),
      max_seats: addForm.maxSeats ? Number(addForm.maxSeats) : null,
      max_barbers: addForm.maxBarbers ? Number(addForm.maxBarbers) : null,
      features: addForm.features.split(',').map((f) => f.trim()).filter(Boolean),
      is_active: true,
    };

    const { error } = await supabase.from('packages').insert(payload);
    setAdding(false);

    if (error) {
      toast({ title: 'Failed to create package', variant: 'destructive' });
      return;
    }

    setShowAdd(false);
    setAddForm({ name: '', price: '', maxSeats: '', maxBarbers: '', features: '' });
    await loadPackages();
    toast({ title: 'Package created' });
  };

  const packagesCount = useMemo(() => packages.length, [packages]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Package Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">{packagesCount} packages</p>
        </div>
        <Button onClick={() => setShowAdd(true)} disabled={showAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add Package
        </Button>
      </div>

      {showAdd && (
        <Card className="border-primary/30 bg-card">
          <CardContent className="space-y-3 p-5">
            <h3 className="font-display text-base font-semibold text-foreground">New Package</h3>
            <div className="grid grid-cols-4 gap-3">
              <Input placeholder="Name" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Price (KD)" type="number" value={addForm.price} onChange={(e) => setAddForm((p) => ({ ...p, price: e.target.value }))} />
              <Input placeholder="Max seats" type="number" value={addForm.maxSeats} onChange={(e) => setAddForm((p) => ({ ...p, maxSeats: e.target.value }))} />
              <Input placeholder="Max barbers" type="number" value={addForm.maxBarbers} onChange={(e) => setAddForm((p) => ({ ...p, maxBarbers: e.target.value }))} />
            </div>
            <Input placeholder="Features (comma-separated)" value={addForm.features} onChange={(e) => setAddForm((p) => ({ ...p, features: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" disabled={adding || !addForm.name || !addForm.price} onClick={handleAdd}>
                {adding ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                <X className="mr-1 h-3 w-3" />Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">Loading packages…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`border-border bg-card border-l-2 border-l-primary ${!pkg.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="space-y-4 p-5">
                {editingId === pkg.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                      <Input type="number" value={editForm.price} onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} />
                      <Input type="number" value={editForm.maxSeats} onChange={(e) => setEditForm((p) => ({ ...p, maxSeats: e.target.value }))} placeholder="Seats" />
                      <Input type="number" value={editForm.maxBarbers} onChange={(e) => setEditForm((p) => ({ ...p, maxBarbers: e.target.value }))} placeholder="Barbers" />
                    </div>
                    <Input value={editForm.features} onChange={(e) => setEditForm((p) => ({ ...p, features: e.target.value }))} placeholder="Features (comma-separated)" />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={saveEdit}>
                        {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="mr-1 h-3 w-3" />Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display text-lg font-bold text-foreground">{pkg.name}</h3>
                        <p className="text-2xl font-bold text-primary">{formatPrice(pkg.price)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={!!pkg.is_active} onCheckedChange={() => toggleActive(pkg)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(pkg)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Max seats: {pkg.max_seats ?? '—'}</span>
                      <span>Max barbers: {pkg.max_barbers ?? '—'}</span>
                    </div>

                    <ul className="space-y-1">
                      {(pkg.features || []).length === 0 ? (
                        <li className="text-xs text-muted-foreground">No features listed</li>
                      ) : (
                        pkg.features?.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-3 w-3 text-primary" />
                            {f}
                          </li>
                        ))
                      )}
                    </ul>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Store className="h-3 w-3" />
                      <Badge variant="secondary" className="text-[10px]">Active shops: —</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPackages;
