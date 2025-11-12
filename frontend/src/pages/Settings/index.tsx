import { useState, useMemo, useEffect } from 'react';
import { useDebug } from '@/contexts/DebugContext';
import { useTheme } from '@/layout/useTheme';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/SearchInput';
import PageHeader from '@/components/PageHeader';
import ColorCustomizer from './ColorCustomizer';
import {
  Bug,
  Sun,
  Moon,
  Settings as SettingsIcon,
  Palette,
  Bell,
  Shield,
  Database,
  Zap,
  Globe,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

function Settings() {
  const { debugMode, toggleDebugMode } = useDebug();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(() => {
    const saved = localStorage.getItem('noteAutoSave');
    return saved === 'true';
  });
  const [dataCollection, setDataCollection] = useState(false);

  // Persist auto-save setting to localStorage
  useEffect(() => {
    localStorage.setItem('noteAutoSave', String(autoSave));
  }, [autoSave]);

  // Mock statistics for the header
  const stats = useMemo(() => {
    return {
      settingsCount: 8,
      activeFeatures: [theme === 'dark', debugMode, notifications, autoSave].filter(Boolean).length,
      systemStatus: 'healthy',
      lastUpdated: new Date().toLocaleDateString('zh-CN')
    };
  }, [theme, debugMode, notifications, autoSave]);

  // Filter settings based on search
  const showGeneralSettings = searchQuery === '' || 
    '通用设置深色模式主题调试'.toLowerCase().includes(searchQuery.toLowerCase());
  const showAppearanceSettings = searchQuery === '' || 
    '外观颜色主题'.toLowerCase().includes(searchQuery.toLowerCase());
  const showNotificationSettings = searchQuery === '' || 
    '通知提醒'.toLowerCase().includes(searchQuery.toLowerCase());
  const showSystemSettings = searchQuery === '' || 
    '系统自动保存数据'.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div className="space-y-8">
      <PageHeader
        title="设置"
        subline="管理您的偏好设置和系统配置"
        actionButtons={
          <Button
            size="lg"
            variant="outline"
            className="bg-background text-primary hover:bg-primary/10 transition-all duration-300 shadow-lg"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            保存更改
          </Button>
        }
      >
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">配置项</p>
                <p className="stat-value">{stats.settingsCount}</p>
              </div>
              <SettingsIcon className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">已启用功能</p>
                <p className="stat-value">{stats.activeFeatures}</p>
              </div>
              <Zap className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">系统状态</p>
                <p className="stat-value text-lg">正常</p>
              </div>
              <CheckCircle className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">最后更新</p>
                <p className="stat-value text-base">{stats.lastUpdated}</p>
              </div>
              <Database className="stat-icon" />
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Search Bar */}
      <div className="flex gap-4">
        <SearchInput
          className="flex-1 max-w-md"
          placeholder="搜索设置项..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        {showGeneralSettings && (
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <SettingsIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>通用设置</CardTitle>
                  <CardDescription>基本系统配置和偏好</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">深色模式</div>
                    <div className="text-sm text-muted-foreground">
                      切换浅色和深色主题
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      使用 Ctrl / ⌘ + Shift + X 快速切换
                    </div>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">语言</div>
                    <div className="text-sm text-muted-foreground">
                      简体中文
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  更改
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appearance Settings */}
        {showAppearanceSettings && (
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Palette className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle>外观设置</CardTitle>
                  <CardDescription>自定义界面外观和颜色</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Bug className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">调试模式</div>
                    <div className="text-sm text-muted-foreground">
                      显示颜色自定义工具
                    </div>
                  </div>
                </div>
                <Switch
                  checked={debugMode}
                  onCheckedChange={toggleDebugMode}
                />
              </div>

              {debugMode && (
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    颜色自定义工具已启用
                  </div>
                  <p className="text-xs text-muted-foreground">
                    向下滚动查看颜色自定义面板
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notification Settings */}
        {debugMode && showNotificationSettings && (
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Bell className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <CardTitle>通知设置</CardTitle>
                  <CardDescription>管理通知和提醒</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">桌面通知</div>
                    <div className="text-sm text-muted-foreground">
                      接收系统通知提醒
                    </div>
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">重要提醒</div>
                    <div className="text-sm text-muted-foreground">
                      仅接收重要事项通知
                    </div>
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  disabled={!notifications}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Settings */}
        {showSystemSettings && (
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Database className="w-5 h-5 text-success" />
                </div>
                <div>
                  <CardTitle>系统设置</CardTitle>
                  <CardDescription>数据和性能配置</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">自动保存速记</div>
                    <div className="text-sm text-muted-foreground">
                      在专注模式下自动保存编辑内容（2秒延迟）
                    </div>
                  </div>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">数据收集</div>
                    <div className="text-sm text-muted-foreground">
                      帮助改进产品体验
                    </div>
                  </div>
                </div>
                <Switch
                  checked={dataCollection}
                  onCheckedChange={setDataCollection}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Color Customizer - Full Width */}
      {debugMode && (
        <div className="animate-reveal">
          <ColorCustomizer />
        </div>
      )}

      {/* Empty State */}
      {searchQuery && !showGeneralSettings && !showAppearanceSettings && !showNotificationSettings && !showSystemSettings && (
        <Card className="p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
              <SettingsIcon className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              没有找到匹配的设置
            </h3>
            <p className="text-muted-foreground mb-6">
              尝试使用不同的关键词搜索
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
            >
              清除搜索
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default Settings;
