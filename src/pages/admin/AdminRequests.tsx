import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { maskPhone } from '@/lib/constants';
import { Check, X, Eye, RotateCcw, Loader2, Inbox } from 'lucide-react';

interface PlatformRequest {
  id: string;
  barber_admin_id: string;
  shop_name: string;
  contact_phone: string;
  city: string;
  notes: string | null;
  admin_notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-destructive/20 text-destructive border-destructive/30',
  };
  return styles[status] || '';
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-12 text-center">
    <Inbox className="h-8 w-8 text-muted-foreground/50" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="border-border bg-card">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const AdminRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PlatformRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<Record<string, string>>({});
  const [trialDays, setTrialDays] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('platform_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      toast({ title: 'Failed to load requests', variant: 'destructive' });
      return;
    }
    setRequests(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const pending = requests.filter((r) => r.status === 'pending');
  const approved = requests.filter((r) => r.status === 'approved');
  const rejected = requests.filter((r) => r.status === 'rejected');

  const handleApprove = async (req: PlatformRequest) => {
    const packageId = selectedPackages[req.id];
    if (!packageId) {
      toast({ title: 'Please select a package first', variant: 'destructive' });
      return;
    }

    setActionId(req.id);
    try {
      // 1. Update request status
      const { error: updateError } = await supabase
        .from('platform_requests')
        .update({
          status: 'approved',
          admin_notes: notes[req.id] || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', req.id);

      if (updateError) throw updateError;

      // 2. Try to create subscription
      const days = trialDays[req.id] || 30;
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + days);

      await supabase.from('subscriptions').insert({
        barber_admin_id: req.barber_admin_id,
        package_id: packageId,
        status: 'trial',
        trial_ends_at: trialEnd.toISOString(),
      });

      await fetchRequests();
      toast({ title: 'Request approved', description: `${req.shop_name} has been approved.` });
    } catch (err: any) {
      console.error('Approve error:', err);
      toast({ title: 'Failed to approve', description: err?.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (req: PlatformRequest) => {
    setActionId(req.id);
    try {
      const { error } = await supabase
        .from('platform_requests')
        .update({
          status: 'rejected',
          admin_notes: notes[req.id] || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', req.id);

      if (error) throw error;

      await fetchRequests();
      toast({ title: 'Request rejected', description: `${req.shop_name} has been rejected.`, variant: 'destructive' });
    } catch (err: any) {
      console.error('Reject error:', err);
      toast({ title: 'Failed to reject', description: err?.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleReconsider = async (req: PlatformRequest) => {
    setActionId(req.id);
    try {
      const { error } = await supabase
        .from('platform_requests')
        .update({ status: 'pending', admin_notes: null, reviewed_at: null, reviewed_by: null })
        .eq('id', req.id);

      if (error) throw error;

      await fetchRequests();
      toast({ title: 'Moved to pending', description: 'Request moved back for review.' });
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const renderPendingCard = (req: PlatformRequest) => (
    <Card key={req.id} className="border-border bg-card border-l-2 border-l-orange-500">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">{req.shop_name}</h3>
            <p className="text-sm text-muted-foreground">{maskPhone(req.contact_phone)} · {req.city}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted: {new Date(req.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge className={statusBadge('pending') + ' text-[10px]'}>Pending</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Package</label>
            <PackageSelector
              value={selectedPackages[req.id] || ''}
              onChange={(v) => setSelectedPackages((p) => ({ ...p, [req.id]: v }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Trial days</label>
            <Input
              type="number"
              className="h-9 text-sm"
              value={trialDays[req.id] ?? 30}
              onChange={(e) => setTrialDays((p) => ({ ...p, [req.id]: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Admin notes (optional)</label>
          <Textarea
            className="text-sm"
            rows={2}
            placeholder="Internal notes..."
            value={notes[req.id] || ''}
            onChange={(e) => setNotes((p) => ({ ...p, [req.id]: e.target.value }))}
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={actionId === req.id || !selectedPackages[req.id]}
            onClick={() => handleApprove(req)}
          >
            {actionId === req.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
            Approve
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" className="flex-1" disabled={actionId === req.id}>
                <X className="mr-1 h-3 w-3" />
                Reject
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject this request?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reject the shop request from "{req.shop_name}". You can reconsider later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleReject(req)}>Reject</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );

  const renderApprovedCard = (req: PlatformRequest) => (
    <Card key={req.id} className="border-border bg-card border-l-2 border-l-emerald-500">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">{req.shop_name}</h3>
          <p className="text-sm text-muted-foreground">{maskPhone(req.contact_phone)} · {req.city}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Approved: {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Eye className="mr-1 h-3 w-3" />
          View Shop
        </Button>
      </CardContent>
    </Card>
  );

  const renderRejectedCard = (req: PlatformRequest) => (
    <Card key={req.id} className="border-border bg-card border-l-2 border-l-destructive opacity-70">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">{req.shop_name}</h3>
          <p className="text-sm text-muted-foreground">{maskPhone(req.contact_phone)} · {req.city}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rejected: {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '—'}
          </p>
          {req.admin_notes && <p className="mt-1 text-xs italic text-muted-foreground">Note: {req.admin_notes}</p>}
        </div>
        <Button variant="outline" size="sm" disabled={actionId === req.id} onClick={() => handleReconsider(req)}>
          {actionId === req.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
          Reconsider
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Platform Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and manage shop registration requests</p>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="bg-secondary">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-4">
            {pending.length === 0 ? <EmptyState message="No pending requests" /> : pending.map(renderPendingCard)}
          </TabsContent>
          <TabsContent value="approved" className="mt-4 space-y-3">
            {approved.length === 0 ? <EmptyState message="No approved requests yet" /> : approved.map(renderApprovedCard)}
          </TabsContent>
          <TabsContent value="rejected" className="mt-4 space-y-3">
            {rejected.length === 0 ? <EmptyState message="No rejected requests" /> : rejected.map(renderRejectedCard)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

/** Fetches packages from Supabase for the dropdown */
function PackageSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [packages, setPackages] = useState<{ id: string; name: string; price: number }[]>([]);

  useEffect(() => {
    supabase
      .from('packages')
      .select('id, name, price')
      .eq('is_active', true)
      .order('price')
      .then(({ data }) => {
        if (data) setPackages(data);
      });
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select package" /></SelectTrigger>
      <SelectContent>
        {packages.map((pkg) => (
          <SelectItem key={pkg.id} value={pkg.id}>
            {pkg.name} — {pkg.price.toFixed(3)} KD
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default AdminRequests;
