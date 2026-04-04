import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  shopId: string;
  shopName: string;
  onReviewSubmitted: () => void;
}

const ReviewForm = ({ open, onOpenChange, bookingId, shopId, shopName, onReviewSubmitted }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      customer_id: user.id,
      shop_id: shopId,
      booking_id: bookingId,
      rating,
      comment: comment.trim() || null,
    });
    if (error) {
      if (error.code === '23505') {
        toast.error('You already reviewed this booking');
      } else {
        toast.error('Failed to submit review: ' + error.message);
      }
    } else {
      toast.success('Review submitted!');
      onReviewSubmitted();
      onOpenChange(false);
      setRating(0);
      setComment('');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Review {shopName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoverRating || rating)
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            className="resize-none border-border bg-secondary"
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full rose-gradient text-primary-foreground"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
