import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider, Header } from './layout';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { recordingPanelBus } from '@/services/recordingPanelBus';
import { RecordingPanelProvider, useRecordingPanel } from '@/contexts/RecordingPanelContext';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import HotwordManagement from './pages/Hotwords/HotwordListPage';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/Meetings/MeetingDetail';
import MeetingEdit from './pages/Meetings/MeetingEdit';
import RecordingManagement from './pages/Recordings';
import RecordingDetail from './pages/Recordings/components/RecordingDetail';
import LiveRecorderTest from './pages/LiveRecorderTest';
import FloatingRecordingPanel from './components/Audio/FloatingRecordingPanel';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import AdminRoute from '@/components/AdminRoute';
import AdminUsers from '@/pages/Admin/Users';
import Profile from '@/pages/Profile';

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
  }, [isRecording, toggleFloatingPanel]);

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
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/recordings" element={<ProtectedRoute><RecordingManagement /></ProtectedRoute>} />
              <Route path="/recordings/:id" element={<ProtectedRoute><RecordingDetail /></ProtectedRoute>} />
              <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
              <Route path="/meetings/:id" element={<ProtectedRoute><MeetingDetail /></ProtectedRoute>} />
              <Route path="/meetings/:id/edit" element={<ProtectedRoute><MeetingEdit /></ProtectedRoute>} />
              <Route path="/hotwords" element={<ProtectedRoute><HotwordManagement /></ProtectedRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/test-recorder" element={<ProtectedRoute><LiveRecorderTest /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
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
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </RecordingPanelProvider>
  );
}

export default App;
