import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, EditIcon, XIcon, SaveIcon, DownloadIcon, FileTextIcon, MicIcon, UsersIcon, FileIcon, RefreshCwIcon, CopyIcon, LinkIcon } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Recording, Meeting } from '@/types';
import { apiService } from '@/services/api'
import HotwordSelection from '@/components/HotwordSelection'

const BACKEND_BASE_URL = 'http://localhost:2591';
const API_BASE = BACKEND_BASE_URL;
const MEETINGS_API_BASE = `${BACKEND_BASE_URL}/api`;

const RecordingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<{ transcription?: string; verbatimTranscript?: string }>({})
  const [transcribing, setTranscribing] = useState(false)
  const [segmenting, setSegmenting] = useState(false)
  const [polishing, setPolishing] = useState(false)
  const [showHotwordSelection, setShowHotwordSelection] = useState(false)
  const [availableMeetings, setAvailableMeetings] = useState<Meeting[]>([])
  const [showAssociationModal, setShowAssociationModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'txt' | 'docx'>('txt')

  // Fetch recording details
  const fetchRecording = useCallback(async () => {
    try {
      setLoading(true)
      if (!id) throw new Error('Missing recording identifier')
      const data = await apiService.getRecording(id)
      setRecording(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Update recording
  const updateRecording = async () => {
    if (!recording) return

    try {
      const { message } = await apiService.updateRecording(recording._id, editForm)
      await fetchRecording()
      setIsEditing(false)
      setEditForm({})
      setSuccess(message || 'Recording updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Generate transcription
  const generateTranscription = async () => {
    if (!recording) return

    try {
      setTranscribing(true)
      const { message } = await apiService.transcribeRecording(recording._id)
      await fetchRecording()
      setSuccess(message || 'Transcription generated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setTranscribing(false)
    }
  }

  // Run speaker segmentation
  const runSpeakerSegmentation = async (oracleNumSpeakers?: number) => {
    if (!recording) return

    try {
      setSegmenting(true)
      const hasHint = typeof oracleNumSpeakers === 'number' && !Number.isNaN(oracleNumSpeakers)
      const { message } = await apiService.segmentRecording(
        recording._id,
        hasHint ? { oracleNumSpeakers } : {}
      )
      await fetchRecording()
      setSuccess(message || 'Speaker segmentation completed successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSegmenting(false)
    }
  }

  // Polish transcription
  const polishTranscription = async () => {
    if (!recording) return

    try {
      setPolishing(true)
      const { message } = await apiService.polishRecording(recording._id)
      await fetchRecording()
      setSuccess(message || 'Transcription polished successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setPolishing(false)
    }
  }

  // Handle hotword transcription
  const handleHotwordTranscribe = () => {
    // For now, just generate regular transcription
    // In a real implementation, this would use the selected hotwords
    setShowHotwordSelection(false)
    generateTranscription()
  }

  // Fetch meetings for association
  const fetchMeetings = async () => {
    try {
      const response = await fetch(`${MEETINGS_API_BASE}/meetings`)
      if (!response.ok) throw new Error('Failed to fetch meetings')
      const data = await response.json()
      setAvailableMeetings(data)
    } catch (err) {
      console.error('Failed to fetch meetings:', err)
    }
  }

  // Associate with meeting
  const associateWithMeeting = async (meetingId: string) => {
    if (!recording) return

    try {
      const response = await fetch(`${MEETINGS_API_BASE}/meetings/${meetingId}/recordings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: recording._id,
          filePath: recording.filePath,
          filename: recording.filename,
          createdAt: recording.createdAt,
          duration: recording.duration,
          transcription: recording.transcription,
          verbatimTranscript: recording.verbatimTranscript,
          sampleRate: recording.sampleRate,
          channels: recording.channels,
          format: recording.format,
        }),
      })

      if (!response.ok) throw new Error('Failed to associate with meeting')
      
      setShowAssociationModal(false)
      setSuccess('Recording associated with meeting successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Export transcription
  const exportTranscription = async () => {
    if (!recording || !recording.transcription) return

    try {
      const content = recording.transcription
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recording.filename.replace('.wav', '')}_transcription.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setSuccess('Transcription exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Copy transcription to clipboard
  const copyToClipboard = async () => {
    if (!recording || !recording.transcription) return

    try {
      await navigator.clipboard.writeText(recording.transcription)
      setSuccess('Transcription copied to clipboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Start editing
  const startEditing = () => {
    if (!recording) return
    
    setEditForm({
      transcription: recording.transcription,
      verbatimTranscript: recording.verbatimTranscript,
    })
    setIsEditing(true)
  }

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm({})
  }

  useEffect(() => {
    if (id) {
      fetchRecording()
    }
  }, [id, fetchRecording])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date)
    return dateObj.toLocaleString('zh-CN')
  }

  const truncateFilename = (filename: string, maxLength: number = 40) => {
    if (filename.length <= maxLength) return filename
    const ext = filename.substring(filename.lastIndexOf('.'))
    const name = filename.substring(0, filename.lastIndexOf('.'))
    const availableLength = maxLength - ext.length - 3 // 3 for ellipsis
    if (availableLength <= 0) return filename.substring(0, maxLength) + '...'
    return name.substring(0, availableLength) + '...' + ext
  }

  // Render speaker timeline visualization
  const renderSpeakerTimeline = () => {
    if (!recording?.speakerSegments || recording.speakerSegments.length === 0) {
      return null
    }

    const maxTime = Math.max(...recording.speakerSegments.map(s => s.endTime))
    const speakerColors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500']
    
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">说话人时间线</h4>
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="relative h-12 bg-gray-200 rounded-full overflow-hidden">
            {recording.speakerSegments.map((segment, index) => {
              const left = (segment.startTime / maxTime) * 100
              const width = ((segment.endTime - segment.startTime) / maxTime) * 100
              const colorClass = speakerColors[segment.speakerIndex % speakerColors.length]
              
              return (
                <div
                  key={index}
                  className={`absolute top-0 h-full ${colorClass} border-r border-white`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                  title={`说话人 ${segment.speakerIndex + 1}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
                />
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-600">
            <span>0:00</span>
            <span>{formatTime(maxTime)}</span>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || !recording) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800">加载失败</h3>
          <p className="text-sm text-red-700 mt-1">{error || '录音未找到'}</p>
          <button
            onClick={() => navigate('/recordings')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            返回录音列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/recordings')}
            className="text-blue-600 hover:text-blue-800 flex items-center space-x-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>返回列表</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{truncateFilename(recording.filename, 60)}</h1>
            <p className="text-gray-600 mt-1">录音详情</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={cancelEditing}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg flex items-center space-x-2"
              >
                <XIcon className="h-4 w-4" />
                <span>取消</span>
              </button>
              <button
                onClick={updateRecording}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <SaveIcon className="h-4 w-4" />
                <span>保存</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEditing}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <EditIcon className="h-4 w-4" />
                <span>编辑</span>
              </button>
              <button
                onClick={() => {
                  fetchMeetings()
                  setShowAssociationModal(true)
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <LinkIcon className="h-4 w-4" />
                <span>关联会议</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audio Player */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">音频播放</h2>
            <div className="space-y-4">
              <audio controls className="w-full">
                <source src={`${API_BASE}/recordings/${recording.filename}`} type="audio/wav" />
                您的浏览器不支持音频播放
              </audio>
              <div className="flex items-center space-x-4">
                <a
                  href={`${API_BASE}/recordings/${recording.filename}`}
                  download
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  下载录音文件
                </a>
                <span className="text-sm text-gray-500">
                  时长: {recording.duration ? formatTime(recording.duration) : '未知'}
                </span>
                <span className="text-sm text-gray-500">
                  大小: {formatFileSize(recording.fileSize)}
                </span>
              </div>
            </div>
          </div>

          {/* Transcription Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">转录文本</h2>
              <div className="flex items-center space-x-2">
                {!recording.transcription && (
                  <button
                    onClick={generateTranscription}
                    disabled={transcribing}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <MicIcon className="h-3 w-3" />
                    <span>{transcribing ? '转录中...' : '生成转录'}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowHotwordSelection(true)}
                  disabled={transcribing}
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <FileTextIcon className="h-3 w-3" />
                  <span>热词转录</span>
                </button>
                {recording.transcription && (
                  <>
                    <button
                      onClick={polishTranscription}
                      disabled={polishing}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <RefreshCwIcon className="h-3 w-3" />
                      <span>{polishing ? '优化中...' : 'AI优化'}</span>
                    </button>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx')}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="txt">TXT</option>
                      <option value="docx">DOCX</option>
                    </select>
                    <button
                      onClick={exportTranscription}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 flex items-center space-x-2"
                    >
                      <DownloadIcon className="h-3 w-3" />
                      <span>导出</span>
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <CopyIcon className="h-3 w-3" />
                      <span>复制</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">转录文本</label>
                  <textarea
                    value={editForm.transcription || ''}
                    onChange={(e) => setEditForm({...editForm, transcription: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[200px]"
                    placeholder="输入转录文本"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">逐字稿</label>
                  <textarea
                    value={editForm.verbatimTranscript || ''}
                    onChange={(e) => setEditForm({...editForm, verbatimTranscript: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[150px]"
                    placeholder="输入逐字稿"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {recording.transcription && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">转录文本</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-900 whitespace-pre-wrap">{recording.transcription}</p>
                    </div>
                  </div>
                )}
                {recording.verbatimTranscript && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">逐字稿</h4>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-purple-900 whitespace-pre-wrap">{recording.verbatimTranscript}</p>
                    </div>
                  </div>
                )}
                {!recording.transcription && !recording.verbatimTranscript && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">暂无转录内容</p>
                    <button
                      onClick={generateTranscription}
                      disabled={transcribing}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <MicIcon className="h-4 w-4" />
                      <span>{transcribing ? '转录中...' : '开始转录'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Speaker Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">说话人分析</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => runSpeakerSegmentation()}
                  disabled={segmenting}
                  className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <UsersIcon className="h-3 w-3" />
                  <span>{segmenting ? '分析中...' : '说话人分离'}</span>
                </button>
                <button
                  onClick={() => runSpeakerSegmentation(2)}
                  disabled={segmenting}
                  className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <UsersIcon className="h-3 w-3" />
                  <span>2人分离</span>
                </button>
                <button
                  onClick={() => runSpeakerSegmentation(3)}
                  disabled={segmenting}
                  className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-md hover:bg-cyan-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <UsersIcon className="h-3 w-3" />
                  <span>3人分离</span>
                </button>
              </div>
            </div>

            {recording.speakerSegments && recording.speakerSegments.length > 0 ? (
              <div className="space-y-4">
                {renderSpeakerTimeline()}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">说话人片段</h4>
                  <div className="space-y-2">
                    {recording.speakerSegments.map((segment, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {segment.speakerIndex + 1}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <div className="text-sm text-gray-600">
                            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                          </div>
                          <div className="text-xs text-gray-500">
                            时长: {formatTime(segment.endTime - segment.startTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无说话人分析结果</p>
                <button
                  onClick={() => runSpeakerSegmentation()}
                  disabled={segmenting}
                  className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <UsersIcon className="h-4 w-4" />
                  <span>{segmenting ? '分析中...' : '开始分析'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Recording Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">录音信息</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">文件名</p>
                <p className="text-sm font-medium" title={recording.filename}>{truncateFilename(recording.filename, 40)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">创建时间</p>
                <p className="text-sm font-medium">{formatDate(recording.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">时长</p>
                <p className="text-sm font-medium">{recording.duration ? formatTime(recording.duration) : '未知'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">文件大小</p>
                <p className="text-sm font-medium">{formatFileSize(recording.fileSize)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">格式</p>
                <p className="text-sm font-medium">{recording.format || 'WAV'}</p>
              </div>
              {recording.sampleRate && (
                <div>
                  <p className="text-sm text-gray-500">采样率</p>
                  <p className="text-sm font-medium">{recording.sampleRate} Hz</p>
                </div>
              )}
              {recording.numSpeakers && (
                <div>
                  <p className="text-sm text-gray-500">说话人数</p>
                  <p className="text-sm font-medium">{recording.numSpeakers} 人</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">统计信息</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">字数统计</p>
                <p className="text-sm font-medium">
                  {recording.transcription ? recording.transcription.length : 0} 字符
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">单词数量</p>
                <p className="text-sm font-medium">
                  {recording.transcription ? recording.transcription.split(/\s+/).length : 0} 词
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">说话人片段</p>
                <p className="text-sm font-medium">
                  {recording.speakerSegments ? recording.speakerSegments.length : 0} 个
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/recordings')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span>返回录音列表</span>
              </button>
              <button
                onClick={() => {
                  const url = `${API_BASE}/recordings/${recording.filename}`
                  window.open(url, '_blank')
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <FileIcon className="h-4 w-4" />
                <span>在新标签页打开</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg">
            {success}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg">
            {error}
          </div>
        </div>
      )}

      {/* Meeting Association Modal */}
      {showAssociationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">关联到会议</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">录音文件</p>
                <p className="font-medium" title={recording.filename}>{truncateFilename(recording.filename, 40)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择会议</label>
                <select
                  onChange={(e) => associateWithMeeting(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">请选择会议</option>
                  {availableMeetings.map((meeting) => (
                    <option key={meeting._id} value={meeting._id}>
                      {meeting.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssociationModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-2"
              >
                <XIcon className="h-4 w-4" />
                <span>取消</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hotword Selection Modal */}
      {showHotwordSelection && (
        <HotwordSelection
          isOpen={showHotwordSelection}
          onClose={() => setShowHotwordSelection(false)}
          onApply={handleHotwordTranscribe}
          currentHotwords={recording.transcription ? [recording.transcription] : []}
        />
      )}
    </div>
  )
};

export default RecordingDetail;
