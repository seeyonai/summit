import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';

interface BackButtonProps {
  url?: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
}

function BackButton({ url, className, variant = 'ghost', size = 'default', children }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (url) {
      navigate(url);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleClick} className={className}>
      <ArrowLeftIcon className="w-4 h-4 mr-2" />
      {children || 'Back'}
    </Button>
  );
}

export default BackButton;
