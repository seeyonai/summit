import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Book, Users, Wrench, Mic, FileText, FileEditIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const baseItems: NavItem[] = [
  { path: '/dashboard', label: '开始', icon: LayoutDashboard },
  { path: '/recordings', label: '录音', icon: Mic },
  { path: '/meetings', label: '会议', icon: Users },
  { path: '/notes', label: '速记', icon: FileEditIcon },
  { path: '/hotwords', label: '热词', icon: Book },
];

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { config } = useConfig();
  const enableShorthandNotes = config.features?.shorthandNotes ?? false;
  const enabledItems = baseItems.filter((item) => {
    if (item.path === '/notes') {
      return enableShorthandNotes;
    }
    return true;
  });
  const navigationItems = useMemo(() => {
    if (!user) {
      // Logged out: show only public home
      return [];
    }
    if (user.role === 'admin') {
      return [
        ...enabledItems,
        { path: '/admin/users', label: '用户管理', icon: Wrench },
        { path: '/admin/audit', label: '审计日志', icon: FileText },
      ];
    }
    return enabledItems;
  }, [user, enableShorthandNotes]);

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
              'relative px-4 py-2.5 font-medium text-sm transition-all duration-200',
              'flex items-center space-x-2 group',
              isActive
                ? 'bg-accent text-accent-foreground shadow-sm rounded-full'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:shadow-none'
            )}
          >
            <Icon className={cn('w-5 h-5 transition-transform duration-200', isActive ? 'scale-110' : 'group-hover:scale-105')} />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
