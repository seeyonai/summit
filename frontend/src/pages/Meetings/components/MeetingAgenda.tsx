import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  Circle,
  Target
} from 'lucide-react';
import type { AgendaItem } from '@/types';

interface MeetingAgendaProps {
  agenda?: AgendaItem[];
  recordingTime: number;
}

export function MeetingAgenda({ agenda, recordingTime }: MeetingAgendaProps) {
  const getAgendaStatus = (item: AgendaItem, index: number) => {
    // Simulate agenda item status based on recording time
    const timePerItem = 300; // 5 minutes per item
    const currentItemIndex = Math.floor(recordingTime / timePerItem);
    
    if (index < currentItemIndex) return 'completed';
    if (index === currentItemIndex) return 'active';
    return 'pending';
  };

  return (
    <Card className="bg-black/40 backdrop-blur-xl border-white/10 flex-1 flex flex-col">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">议题</h2>
          <Target className="w-5 h-5 text-accent" />
        </div>
        
        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {agenda && agenda.length > 0 ? (
            agenda.map((item, index) => {
              const status = getAgendaStatus(item, index);
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    status === 'active'
                      ? 'bg-gradient-to-r from-chart-4/20 to-primary/20 border-chart-4/30 scale-105'
                      : status === 'completed'
                      ? 'bg-success/10 border-success/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : status === 'active' ? (
                        <div className="relative">
                          <Circle className="w-5 h-5 text-accent" />
                          <div className="absolute inset-0 w-5 h-5 bg-primary rounded-full animate-ping" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5 text-white/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium mb-1 ${
                        status === 'active' 
                          ? 'text-white' 
                          : status === 'completed'
                          ? 'text-green-400'
                          : 'text-white/60'
                      }`}>
                        {item.text}
                      </h3>
                      <div className="flex items-center gap-3 text-xs mt-1">
                        <span className={`px-2 py-0.5 rounded-full ${
                          item.status === 'resolved' 
                            ? 'bg-success/20 text-success'
                            : item.status === 'ongoing'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-muted/20 text-muted-foreground'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-white/40">Item {item.order}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">议题列表为空</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
