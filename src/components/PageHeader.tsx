import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  backTo?: string;
  transparent?: boolean;
}

const PageHeader = ({ title, backTo, transparent }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className={`sticky top-0 z-40 flex items-center gap-3 px-4 py-3 ${transparent ? '' : 'border-b border-border bg-card/90 backdrop-blur-lg'}`}>
      {backTo && (
        <button onClick={() => navigate(backTo)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
    </header>
  );
};

export default PageHeader;
