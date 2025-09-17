import { Link } from 'react-router-dom'

export default function Tools() {
  const tools = [
    {
      path: '/',
      label: '语音识别',
      description: '实时语音识别与转录',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor"/>
        </svg>
      )
    },
    {
      path: '/segmentation',
      label: '说话人分割',
      description: '识别和区分不同的说话人',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
        </svg>
      )
    },
    {
      path: '/offline',
      label: '离线转录',
      description: '对音频文件进行离线转录处理',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" fill="currentColor"/>
        </svg>
      )
    }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">工具集</h1>
        <p className="text-muted-foreground">语音识别与处理工具集合</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className="group block p-6 rounded-lg border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 bg-card"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-primary">
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                  {tool.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 p-6 rounded-lg bg-muted/50">
        <h2 className="text-xl font-semibold mb-4">使用说明</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>• <strong>语音识别</strong>：实时语音转文字，支持多种语言</p>
          <p>• <strong>说话人分割</strong>：自动识别音频中的不同说话人并标注</p>
          <p>• <strong>离线转录</strong>：上传音频文件进行批量转录处理</p>
        </div>
      </div>
    </div>
  )
}