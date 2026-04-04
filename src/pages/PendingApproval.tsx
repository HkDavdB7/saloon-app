import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, LogOut, MessageCircle, Scissors, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PendingApprovalProps {
  isRejected?: boolean;
  adminNotes?: string | null;
  onResubmit?: () => void;
}

const PendingApproval = ({ isRejected, adminNotes, onResubmit }: PendingApprovalProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in text-center">
        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border ${
          isRejected
            ? 'border-destructive/30 bg-destructive/10'
            : 'border-primary/30 bg-primary/10'
        }`}>
          {isRejected
            ? <XCircle className="h-10 w-10 text-destructive" />
            : <Clock className="h-10 w-10 text-primary" />
          }
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground">
          {isRejected ? 'Request Rejected' : 'Pending Approval'}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isRejected
            ? 'Your shop request was not approved. Please review the feedback below.'
            : 'Your shop request is under review. We\'ll notify you once your account has been approved.'}
        </p>

        {/* Status card */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <Scissors className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Application Status</p>
              <p className={`text-xs ${isRejected ? 'text-destructive' : 'text-amber-400'}`}>
                {isRejected ? 'Rejected' : 'Under Review'}
              </p>
            </div>
          </div>
        </div>

        {/* Admin notes for rejection */}
        {isRejected && adminNotes && (
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left">
            <p className="text-xs font-medium text-muted-foreground mb-1">Admin feedback:</p>
            <p className="text-sm text-foreground">{adminNotes}</p>
          </div>
        )}

        {/* Resubmit button for rejected */}
        {isRejected && onResubmit && (
          <Button
            className="mt-6 w-full"
            onClick={onResubmit}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Submit New Request
          </Button>
        )}

        <Button
          variant="outline"
          className="mt-4 w-full border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => window.open('mailto:support@salon.app', '_blank')}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Contact Support
        </Button>

        <Button
          variant="ghost"
          className="mt-3 w-full text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default PendingApproval;
