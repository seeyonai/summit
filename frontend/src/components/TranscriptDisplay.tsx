import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Clock, Circle } from 'lucide-react'
import AnnotatedMarkdown from './AnnotatedMarkdown'
import type { Meeting, TodoItem, DiscussionPoint } from '@/types';

interface TranscriptDisplayProps {
  meeting: Meeting
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ meeting }) => {

  // Extract todos and discussion points from transcript
  const extractAnnotations = (transcript: string) => {
    const todos: TodoItem[] = []
    const discussionPoints: DiscussionPoint[] = []
    
    const lines = transcript.split('\n')
    let todoId = 1
    let discussionId = 1
    
    lines.forEach(line => {
      if (line.includes('[待办事项]')) {
        const todoText = line.replace(/\*\*\[待办事项\]\*\*/, '').replace(/^[-*]\s*/, '').trim()
        if (todoText) {
          todos.push({
            id: todoId++,
            text: todoText,
            completed: false,
            priority: 'medium',
            category: '会议'
          })
        }
      }
      
      if (line.includes('[争论焦点]')) {
        const discussionText = line.replace(/\*\*\[争论焦点\]\*\*/, '').replace(/^[-*]\s*/, '').trim()
        if (discussionText) {
          discussionPoints.push({
            id: discussionId++,
            title: discussionText,
            description: discussionText,
            category: '讨论',
            priority: 'medium',
            status: 'ongoing'
          })
        }
      }
    })
    
    return { todos, discussionPoints }
  }

  const { todos: extractedTodos, discussionPoints: extractedDiscussionPoints } = meeting.finalTranscript 
    ? extractAnnotations(meeting.finalTranscript)
    : { todos: [], discussionPoints: [] }

  return (
    <div className="space-y-6">
      {/* Main Transcript */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">会议纪要</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>最后更新: {new Date(meeting.updatedAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        
        {meeting.finalTranscript ? (
          <div className="font-serif text-gray-700 leading-relaxed tracking-tight">
            <AnnotatedMarkdown content={meeting.finalTranscript} />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>暂无会议纪要</p>
          </div>
        )}
      </div>

      {/* Extracted Annotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discussion Points */}
        {(meeting.discussionPoints?.length || extractedDiscussionPoints.length) > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              争论焦点 ({(meeting.discussionPoints?.length || 0) + extractedDiscussionPoints.length})
            </h3>
            
            <div className="space-y-3">
              {meeting.discussionPoints?.map((point) => (
                <div key={point.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-yellow-800">{point.title}</h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        point.priority === 'high' ? 'border-red-500 text-red-700' :
                        point.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                        'border-green-500 text-green-700'
                      }`}
                    >
                      {point.priority === 'high' ? '高' : point.priority === 'medium' ? '中' : '低'}优先级
                    </Badge>
                  </div>
                  <p className="text-sm text-yellow-700 mb-2">{point.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {point.category}
                    </Badge>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      point.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      point.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {point.status === 'resolved' ? '已解决' : point.status === 'ongoing' ? '进行中' : '待处理'}
                    </span>
                  </div>
                </div>
              ))}
              
              {extractedDiscussionPoints.map((point) => (
                <div key={point.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-yellow-800">{point.title}</h4>
                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                      中优先级
                    </Badge>
                  </div>
                  <p className="text-sm text-yellow-700 mb-2">{point.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {point.category}
                    </Badge>
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      进行中
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todo Items */}
        {(meeting.parsedTodos?.length || extractedTodos.length) > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Circle className="w-5 h-5 text-blue-600" />
              待办事项 ({(meeting.parsedTodos?.length || 0) + extractedTodos.length})
            </h3>
            
            <div className="space-y-3">
              {meeting.parsedTodos?.map((todo) => (
                <div key={todo.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {todo.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {todo.text}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {todo.priority && (
                          <Badge variant="outline" className={`text-xs ${
                            todo.priority === 'high' ? 'border-red-500 text-red-700' :
                            todo.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                            'border-green-500 text-green-700'
                          }`}>
                            {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}优先级
                          </Badge>
                        )}
                        {todo.category && (
                          <Badge variant="secondary" className="text-xs">
                            {todo.category}
                          </Badge>
                        )}
                        {todo.dueDate && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            截止: {new Date(todo.dueDate).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {extractedTodos.map((todo) => (
                <div key={todo.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Circle className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {todo.text}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                          中优先级
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {todo.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TranscriptDisplay