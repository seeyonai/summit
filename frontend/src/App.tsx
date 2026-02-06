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
import HotwordListPage from './pages/Hotwords/HotwordListPage';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/Meetings/MeetingDetail';
import MeetingEdit from './pages/Meetings/MeetingEdit';
import OngoingMeetingPage from './pages/Meetings/OngoingMeetingPage';
import RecordingManagement from './pages/Recordings';
import RecordingDetail from './pages/Recordings/components/RecordingDetail';
import NoteList from './pages/NoteList';
import NoteDetail from './pages/NoteDetail';
import NoteZenEditor from './pages/NoteZenEditor';
import FloatingRecordingPanel from './components/Audio/FloatingRecordingPanel';
import DebugInfo from './components/DebugInfo';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import CustomSignOn from '@/pages/Auth/CustomSignOn';
import AdminRoute from '@/components/AdminRoute';
import AdminUsers from '@/pages/Admin/Users';
import AdminAudit from '@/pages/Admin/AdminAudit';
import SystemHealth from '@/pages/Admin/SystemHealth';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { ColorThemeProvider } from '@/contexts/ThemeContext';
import { DebugProvider } from '@/contexts/DebugContext';

function AppContent() {
  const { isRecording } = useAudioRecording();
  const { showFloatingPanel, isFullscreen, toggleFloatingPanel, closePanel } = useRecordingPanel();

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
    <ColorThemeProvider>
      <DebugProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              {/* Fullscreen routes without Header/Layout */}
              <Route
                path="/meetings/:id/display"
                element={
                  <ProtectedRoute>
                    <OngoingMeetingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notes/:id/zen"
                element={
                  <ProtectedRoute>
                    <NoteZenEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notes/new/zen"
                element={
                  <ProtectedRoute>
                    <NoteZenEditor />
                  </ProtectedRoute>
                }
              />

              {/* Auth routes without Header/Layout */}
              <Route
                path="/login"
                element={
                  <>
                    <Toaster />
                    <Login />
                  </>
                }
              />
              <Route
                path="/register"
                element={
                  <>
                    <Toaster />
                    <Register />
                  </>
                }
              />
              <Route
                path="/custom-sign-on"
                element={
                  <>
                    <Toaster />
                    <CustomSignOn />
                  </>
                }
              />

              {/* Standard routes with Header/Layout */}
              <Route
                path="*"
                element={
                  <div className="min-h-screen bg-background">
                    <Toaster />
                    <DebugInfo />

                    <Header isRecording={isRecording} />

                    <main className="container mx-auto px-4 py-8 animate-fade-in">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/recordings"
                          element={
                            <ProtectedRoute>
                              <RecordingManagement />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/recordings/:id"
                          element={
                            <ProtectedRoute>
                              <RecordingDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/meetings"
                          element={
                            <ProtectedRoute>
                              <Meetings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/meetings/:id"
                          element={
                            <ProtectedRoute>
                              <MeetingDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/meetings/:id/edit"
                          element={
                            <ProtectedRoute>
                              <MeetingEdit />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/notes"
                          element={
                            <ProtectedRoute>
                              <NoteList />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/notes/:id"
                          element={
                            <ProtectedRoute>
                              <NoteDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/hotwords"
                          element={
                            <ProtectedRoute>
                              <HotwordListPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/users"
                          element={
                            <AdminRoute>
                              <AdminUsers />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/audit"
                          element={
                            <AdminRoute>
                              <AdminAudit />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/admin/health"
                          element={
                            <AdminRoute>
                              <SystemHealth />
                            </AdminRoute>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute>
                              <Profile />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/settings"
                          element={
                            <ProtectedRoute>
                              <Settings />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </div>
                }
              />
            </Routes>

            {/* Global Floating Recording Panel - rendered for all routes */}
            <FloatingRecordingPanel isVisible={showFloatingPanel && !isFullscreen} onClose={closePanel} />
          </Router>
        </ThemeProvider>
      </DebugProvider>
    </ColorThemeProvider>
  );
}

function App() {
  return (
    <RecordingPanelProvider>
      <AuthProvider>
        <ConfigProvider>
          <AppContent />
        </ConfigProvider>
      </AuthProvider>
    </RecordingPanelProvider>
  );
}

export default App;
