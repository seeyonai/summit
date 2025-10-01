import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const GroupChatPlaceholder: React.FC = () => {
  return (
    <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/20 backdrop-blur-sm shadow-xl shadow-accent/5">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 text-accent-400" />
          <span className="text-sm font-semibold text-accent-300 uppercase tracking-wider">
            群聊消息
          </span>
          <Badge className="ml-auto bg-accent/10 text-accent border-accent/20">
            即将推出
          </Badge>
        </div>
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-accent-400 mx-auto mb-3 opacity-50" />
          <p className="text-accent-200 text-sm">
            群聊功能正在开发中，敬请期待
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupChatPlaceholder;
