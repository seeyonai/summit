import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Folder, Users, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const baseItems: NavItem[] = [
  { path: '/dashboard', label: '开始', icon: LayoutDashboard },
  { path: '/recordings', label: '录音', icon: Folder },
  { path: '/meetings', label: '会议', icon: Users },
];

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const navigationItems = useMemo(() => {
    if (!user) {
      // Logged out: show only public home
      return [{ path: '/', label: '首页', icon: LayoutDashboard }];
    }
    if (user.role === 'admin') {
      return [...baseItems, { path: '/admin/users', label: '管理', icon: Wrench }];
    }
    return baseItems;
  }, [user]);

  return (
    <nav className="flex gap-2">
      {navigationItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
              "flex items-center space-x-2 group",
              isActive 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:shadow-sm'
            )}
          >
            <Icon className={cn(
              "w-5 h-5 transition-transform duration-200",
              isActive ? 'scale-110' : 'group-hover:scale-105'
            )} />
            <span className="font-medium">{item.label}</span>
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-lg opacity-30" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
