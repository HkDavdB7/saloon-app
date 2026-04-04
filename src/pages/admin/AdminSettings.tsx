import { Settings } from 'lucide-react';

const AdminSettings = () => (
  <div className="animate-fade-in">
    <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
    <p className="mt-1 text-sm text-muted-foreground">Platform configuration</p>
    <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
      <Settings className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-muted-foreground">Platform settings will appear here</p>
    </div>
  </div>
);

export default AdminSettings;
