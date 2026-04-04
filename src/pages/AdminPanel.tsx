import AppHeader from '@/components/AppHeader';
import { Shield } from 'lucide-react';

const AdminPanel = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-6">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">System administration</p>

          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Admin controls will appear here</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
