import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase, Profile } from '@/lib/supabase';
import { maskPhone } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, Loader2 } from 'lucide-react';

const roleBadge: Record<string, string> = {
  customer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stylist_admin: 'bg-primary/20 text-primary border-primary/30',
  barber: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  admin: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

const roleLabel: Record<string, string> = {
  customer: 'Customer',
  stylist_admin: 'Stylist Admin',
  barber: 'Barber',
  admin: 'Platform Admin',
};

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) setSelectedRole(selectedUser.role || '');
  }, [selectedUser]);

  const filtered = users.filter((u) => {
    const matchesSearch =
      (u.phone || '').includes(search) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setSavingRole(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role: selectedRole || null })
      .eq('id', selectedUser.id);

    setSavingRole(false);

    if (error) {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
      return;
    }

    setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, role: selectedRole as Profile['role'] } : u)));
    setSelectedUser((prev) => (prev ? { ...prev, role: selectedRole as Profile['role'] } : prev));
    toast({ title: 'Role updated' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">{users.length} total users</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, email, or phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="stylist_admin">Stylist Admin</SelectItem>
            <SelectItem value="barber">Barber</SelectItem>
            <SelectItem value="admin">Platform Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Joined</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-foreground">{user.full_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-foreground">{user.email || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{user.phone ? maskPhone(user.phone) : '—'}</td>
                  <td className="px-4 py-3">
                    {user.role ? (
                      <Badge className={roleBadge[user.role] + ' text-[10px]'}>{roleLabel[user.role] || user.role}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No role</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="border-border bg-card">
          <SheetHeader>
            <SheetTitle className="font-display text-foreground">User Details</SheetTitle>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm text-foreground">{selectedUser.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{selectedUser.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-mono text-sm text-foreground">{selectedUser.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <Select value={selectedRole || 'none'} onValueChange={(v) => setSelectedRole(v === 'none' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No role</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="stylist_admin">Stylist Admin</SelectItem>
                    <SelectItem value="barber">Barber</SelectItem>
                    <SelectItem value="admin">Platform Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm text-foreground">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="font-mono text-xs text-muted-foreground break-all">{selectedUser.id}</p>
              </div>

              <Button onClick={handleSaveRole} disabled={savingRole} className="w-full">
                {savingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Role
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminUsers;
