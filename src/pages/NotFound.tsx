import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4" dir="rtl">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <span className="text-3xl">🔍</span>
        </div>
        <h1 className="mb-3 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-2 text-xl font-medium text-foreground">الصفحة غير موجودة</p>
        <p className="mb-8 text-muted-foreground">عذراً، هذه الصفحة غير موجودة أو تم نقلها</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Home className="h-4 w-4" />
          العودة للرئيسية
        </a>
      </div>
      <p className="mt-16 text-xs text-muted-foreground">Saloon — صالون</p>
    </div>
  );
};

export default NotFound;
