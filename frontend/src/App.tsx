import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider, Header } from './layout';
import { FloatingRecordingPanel, MeetingDisplay } from './components/Audio';
import Dashboard from './pages/Dashboard';
import HotwordManagement from './pages/Hotwords/HotwordListPage';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/Meetings/MeetingDetail';
import RecordingManagement from './pages/Recordings';
import RecordingDetail from './pages/Recordings/components/RecordingDetail';

function App() {
  const [showFloatingPanel, setShowFloatingPanel] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const toggleFloatingPanel = () => {
    setShowFloatingPanel(!showFloatingPanel);
  };

  const minimizePanel = () => {
    setIsPanelMinimized(true);
  };

  const maximizePanel = () => {
    setIsPanelMinimized(false);
  };

  const closePanel = () => {
    setShowFloatingPanel(false);
    setIsPanelMinimized(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const exitFullscreen = () => {
    setIsFullscreen(false);
  };

  const startRecording = () => {
    setIsRecording(true);
    setPartialText('');
    setFinalText('');
    setRecordingTime(0);
    setIsConnected(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setPartialText('');
  };

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      setShowFloatingPanel(true);
      setIsPanelMinimized(false);
    }
  }, [isRecording]);

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Toaster />

          <Header
            onToggleRecordingPanel={toggleFloatingPanel}
            isRecording={isRecording}
            showRecordingPanel={showFloatingPanel}
          />

          <main className="container mx-auto px-4 py-8 animate-fade-in">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/recordings" element={<RecordingManagement />} />
              <Route path="/recordings/:id" element={<RecordingDetail />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/meetings/:id" element={<MeetingDetail />} />
              <Route path="/hotwords" element={<HotwordManagement />} />
            </Routes>
          </main>

          <FloatingRecordingPanel
            isVisible={showFloatingPanel && !isFullscreen}
            onMinimize={minimizePanel}
            onClose={closePanel}
            onMaximize={maximizePanel}
            isRecording={isRecording}
            isMinimized={isPanelMinimized}
            isFullscreen={isFullscreen}
            partialText={partialText}
            finalText={finalText}
            recordingTime={recordingTime}
            isConnected={isConnected}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onToggleFullscreen={toggleFullscreen}
          />
          
          <MeetingDisplay
            isVisible={isFullscreen}
            isRecording={isRecording}
            partialText={partialText}
            finalText={finalText}
            recordingTime={recordingTime}
            isConnected={isConnected}
            onStopRecording={stopRecording}
            onExitFullscreen={exitFullscreen}
            initialTitle=""
            initialAgenda=""
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;