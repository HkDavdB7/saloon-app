import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomerLayout from '@/components/CustomerLayout';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state as {
    bookingId?: string;
    shopName: string;
    service: { name: string; price: number; duration: number };
    stylist: string;
    date: string;
    time: string;
  } | null;

  return (
    <CustomerLayout>
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full rose-gradient">
          <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-foreground">Booking Confirmed!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your appointment has been booked successfully</p>

        {data && (
          <div className="mt-6 w-full max-w-xs rounded-xl border border-border bg-card p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shop</span>
              <span className="font-medium text-foreground">{data.shopName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium text-foreground">{data.service.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stylist</span>
              <span className="font-medium text-foreground">{data.stylist}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">When</span>
              <span className="font-medium text-primary">{data.date}, {data.time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="font-semibold text-primary">{data.service.price.toFixed(3)} KD</span>
            </div>
          </div>
        )}

        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Button onClick={() => navigate('/bookings')}>View My Bookings</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default BookingSuccess;
