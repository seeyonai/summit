import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider, Header } from './layout';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { recordingPanelBus } from '@/services/recordingPanelBus';
import { RecordingPanelProvider, useRecordingPanel } from '@/contexts/RecordingPanelContext';
import Dashboard from './pages/Dashboard';
import HotwordManagement from './pages/Hotwords/HotwordListPage';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/Meetings/MeetingDetail';
import MeetingEdit from './pages/Meetings/MeetingEdit';
import RecordingManagement from './pages/Recordings';
import RecordingDetail from './pages/Recordings/components/RecordingDetail';
import LiveRecorderTest from './pages/LiveRecorderTest';
import FloatingRecordingPanel from './components/Audio/FloatingRecordingPanel';

function AppContent() {
  const { isRecording } = useAudioRecording();
  const { 
    showFloatingPanel, 
    isFullscreen,
    toggleFloatingPanel,
    closePanel
  } = useRecordingPanel();

  useEffect(() => {
    if (isRecording) {
      toggleFloatingPanel();
    }
  }, [isRecording]);

  // Listen to cross-app recording panel events
  useEffect(() => {
    const unsubscribe = recordingPanelBus.subscribe((event) => {
      if (event.type === 'open') {
        toggleFloatingPanel();
        return;
      }
      if (event.type === 'close') {
        closePanel();
        return;
      }
      // start/stop are now handled within FloatingRecordingPanel itself
    });
    return unsubscribe;
  }, [toggleFloatingPanel, closePanel]);

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Toaster />

          <Header
            isRecording={isRecording}
          />

          <main className="container mx-auto px-4 py-8 animate-fade-in">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/recordings" element={<RecordingManagement />} />
              <Route path="/recordings/:id" element={<RecordingDetail />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/meetings/:id" element={<MeetingDetail />} />
              <Route path="/meetings/:id/edit" element={<MeetingEdit />} />
              <Route path="/hotwords" element={<HotwordManagement />} />
              <Route path="/test-recorder" element={<LiveRecorderTest />} />
            </Routes>
          </main>

          <FloatingRecordingPanel isVisible={showFloatingPanel && !isFullscreen} />
        </div>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <RecordingPanelProvider>
      <AppContent />
    </RecordingPanelProvider>
  );
}

export default App;
