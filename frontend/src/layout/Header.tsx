import React, { useCallback, useEffect } from 'react';
import { Navigation } from './Navigation';
import UserMenu from '@/components/UserMenu';
import AppLogo from '@/components/AppLogo';
import { useRecordingPanel } from '@/contexts/RecordingPanelContext';
import { useAuthOptional } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

export const Header: React.FC<{
  isRecording: boolean;
}> = ({ isRecording }) => {
  const { toggleFloatingPanel, showFloatingPanel } = useRecordingPanel();
  const auth = useAuthOptional();
  const user = auth?.user ?? null;
  const onAuthPage = !user;

  const handleTogglePanel = useCallback(() => {
    if (user) toggleFloatingPanel();
  }, [user, toggleFloatingPanel]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '.') {
        e.preventDefault();
        handleTogglePanel();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePanel]);

  return (
    <header className={`${onAuthPage ? 'bg-background' : 'bg-card border-b border-border shadow-sm'} sticky top-0 z-50`}>
      <div className="container mx-auto px-4 py-4">
        <div className={`flex items-center justify-between`}>
          <div className="flex items-center space-x-8 flex-grow-1">
            <Link to="/" className="flex items-center">
              <AppLogo />
            </Link>
            <div className="flex items-center grow-2">
              <Navigation />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {user && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleFloatingPanel}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 hover:shadow-sm"
                    >
                      <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-destructive animate-recording-pulse' : 'bg-muted-foreground'}`}></div>
                      {showFloatingPanel ? '隐藏' : '显示'}录音面板
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="flex items-center gap-2">
                      {showFloatingPanel ? '隐藏' : '显示'}录音面板
                      <KbdGroup><Kbd>⌘</Kbd><Kbd>⇧</Kbd><Kbd>.</Kbd></KbdGroup>
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <UserMenu user={user} onLogout={auth?.logout} />
          </div>
        </div>
      </div>
    </header>
  );
};
