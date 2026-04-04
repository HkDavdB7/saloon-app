import { ReactNode } from 'react';
import BottomNav from './BottomNav';

const CustomerLayout = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-20" dir="rtl">
    {children}
    <BottomNav />
  </div>
);

export default CustomerLayout;
