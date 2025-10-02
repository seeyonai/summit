import { Clock, Users, MessageSquare, Activity } from 'lucide-react';

interface MeetingStatsProps {
  transcriptionStats: {
    charCount: number;
    wordCount: number;
    segmentCount: number;
  };
  recordingTime: number;
  participantCount: number;
}

function MeetingStats({ transcriptionStats, recordingTime, participantCount }: MeetingStatsProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="page-header">
      <div className="page-header-content">
        <div className="page-header-title">
          <h1>会议统计</h1>
          <p>实时追踪会议进度和参与情况</p>
        </div>
        
        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">会议时长</p>
                <p className="stat-value">{formatTime(recordingTime)}</p>
              </div>
              <Clock className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">参与人数</p>
                <p className="stat-value">{participantCount}</p>
              </div>
              <Users className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">总字数</p>
                <p className="stat-value">{transcriptionStats.wordCount.toLocaleString()}</p>
              </div>
              <MessageSquare className="stat-icon" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">对话段数</p>
                <p className="stat-value">{transcriptionStats.segmentCount}</p>
              </div>
              <Activity className="stat-icon" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="header-decoration header-decoration-top-right" />
      <div className="header-decoration header-decoration-bottom-left" />
    </div>
  );
}

export default MeetingStats;
