import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface MeetingInfoCardProps {
  title: string;
  agenda: string;
  showAgenda: boolean;
  themeClasses: {
    card: string;
    cardInner: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
  };
}

const MeetingInfoCard: React.FC<MeetingInfoCardProps> = ({
  title,
  agenda,
  showAgenda,
  themeClasses
}) => {
  return (
    <Card className={`${themeClasses.card} backdrop-blur-sm`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>会议信息</h3>
        </div>
        <div className="space-y-3">
          <div className={`p-3 ${themeClasses.cardInner} rounded-lg border`}>
            <span className={`text-xs font-medium ${themeClasses.text.muted} uppercase tracking-wider`}>标题</span>
            <p className={`${themeClasses.text.primary} mt-1 font-medium`}>{title || '未设置标题'}</p>
          </div>
          {showAgenda && (
            <div className={`p-3 ${themeClasses.cardInner} rounded-lg border`}>
              <span className={`text-xs font-medium ${themeClasses.text.muted} uppercase tracking-wider`}>议程</span>
              <p className={`${themeClasses.text.secondary} mt-1 text-sm leading-relaxed`}>
                {agenda || '未设置议程'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MeetingInfoCard;
