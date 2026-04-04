import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ShopContextType {
  shops: any[];
  activeShop: any | null;
  activeShopId: string | null;
  setActiveShopId: (id: string) => void;
  loading: boolean;
}

const ShopContext = createContext<ShopContextType>({
  shops: [],
  activeShop: null,
  activeShopId: null,
  setActiveShopId: () => {},
  loading: true,
});

export const useShop = () => useContext(ShopContext);

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [shops, setShops] = useState<any[]>([]);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at');
      const list = data || [];
      setShops(list);
      if (list.length > 0 && !activeShopId) {
        setActiveShopId(list[0].id);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const activeShop = shops.find(s => s.id === activeShopId) || null;

  return (
    <ShopContext.Provider value={{ shops, activeShop, activeShopId, setActiveShopId, loading }}>
      {children}
    </ShopContext.Provider>
  );
};
