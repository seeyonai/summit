import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, LogIn, UserPlus, Wrench, User, Flame, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function getInitials(name?: string, email?: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
    return initials || 'U';
  }
  if (email) return email[0]?.toUpperCase() || 'U';
  return 'U';
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="px-3 py-2 rounded-lg text-sm font-medium bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
        >
          <LogIn className="inline w-4 h-4 mr-1" /> 登录
        </Link>
        <Link
          to="/register"
          className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all"
        >
          <UserPlus className="inline w-4 h-4 mr-1" /> 注册
        </Link>
      </div>
    );
  }

  const initials = getInitials(user.name, user.email);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted/30 text-foreground hover:bg-muted/60 transition-all"
      >
        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary grid place-items-center font-semibold">
          {initials}
        </div>
        <span className="hidden sm:inline">{user.name || user.email}</span>
        <ChevronDown className="w-4 h-4 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-lg border border-border bg-popover shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-sm font-semibold">{user.name || '账户'}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <div className="text-[11px] mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground">
              角色：{user.role === 'admin' ? '管理员' : '用户'}
            </div>
          </div>
          <div className="py-1">
            <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50">
              <User className="w-4 h-4" /> 个人资料
            </Link>
            <Link to="/hotwords" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50">
              <Flame className="w-4 h-4" /> 热词
            </Link>
            <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50">
              <Settings className="w-4 h-4" /> 设置
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin/users" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50">
                <Wrench className="w-4 h-4" /> 管理
              </Link>
            )}
          </div>
          <div className="py-1 border-t border-border">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50 text-destructive"
            >
              <LogOut className="w-4 h-4" /> 退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
