import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, FileText, Users, Zap, Search, Shield, Brain, Sparkles, Network, Clock } from 'lucide-react';

function Home() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const coreFeatures = [
    {
      icon: Mic,
      title: '实时流式转录',
      description: '基于 WebSocket 的实时语音识别，即说即转。通过 Echo Stream 服务提供毫秒级延迟的语音到文本转换，支持多种音频格式与采样率。'
    },
    {
      icon: Users,
      title: '说话人分离与识别',
      description: '采用深度学习模型自动识别并标注不同说话人。Echo Voices 服务提供精准的声纹分析，支持多说话人场景下的实时分离与追踪。'
    },
    {
      icon: Brain,
      title: 'AI 转录优化',
      description: '通过 OpenAI GPT 系列模型对原始转录进行智能优化，自动修正标点、大小写和语法错误，去除口语填充词，保持原意的同时提升可读性。'
    },
    {
      icon: Sparkles,
      title: '智能内容提取',
      description: '基于 Intext 库的结构化信息提取引擎。自动从会议对话中识别并提取争议点、待办事项、决策内容，支持多轮对话的语义理解与归纳。'
    },
    {
      icon: Clock,
      title: '词级时间对齐',
      description: 'Echo Aligner 服务提供音频与文本的精确同步，实现单词级别的时间戳标注。支持快速定位与回放，可精确到音素级别的对齐精度。'
    },
    {
      icon: Zap,
      title: '自定义热词训练',
      description: '支持行业专有术语、技术名词和特定领域词汇的模型微调。通过热词系统提升专业场景下的识别准确率，适配金融、医疗、法律等垂直行业。'
    }
  ];

  const advancedFeatures = [
    {
      icon: Network,
      title: '分布式服务架构',
      description: '采用微服务设计，转录、分离、对齐等功能独立部署。支持弹性扩展与负载均衡，满足高并发场景下的稳定性需求。'
    },
    {
      icon: Search,
      title: '语义搜索与检索',
      description: '基于向量嵌入的语义搜索引擎，支持跨会议的内容检索。可根据意图而非关键词进行查询，快速定位历史讨论内容。'
    },
    {
      icon: Shield,
      title: '私有化部署',
      description: '全部数据与 AI 处理均在您的基础设施内完成。支持本地化部署、离线运行，完全掌控录音、转录与分析的全流程。'
    }
  ];

  const useCases = [
    {
      title: '产品研发团队',
      description: '追踪需求讨论、技术方案评审与用户反馈。自动生成会议纪要，提取行动项与责任人，串联敏捷开发全流程。'
    },
    {
      title: '销售与客户成功',
      description: '记录客户需求与承诺细节，精确归因对话内容。通过说话人识别确保关键信息可溯源，支持合同条款的验证与审计。'
    },
    {
      title: '法律与合规',
      description: '创建可核查的会议记录，支持词级时间戳的证据链。满足法律取证与合规审计的高标准要求，保障数据完整性与隐私安全。'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Split Layout */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[600px] py-16 sm:py-24">
            {/* Left: Text Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  AI 驱动的会议智能平台
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  结合语音识别、说话人分离、内容提取与时间对齐的全栈 AI 技术，将会议对话转化为结构化知识资产。
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <a href="/register" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                  开始使用
                </a>
                <a href="/login" className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors font-semibold">
                  登录
                </a>
              </div>
            </div>

            {/* Right: Summit Photo */}
            <div className="relative lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-1/2">
              <div className="relative h-[400px] lg:h-full rounded-2xl lg:rounded-none overflow-hidden">
                <video src="/summit-day-light.mp4" autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/20 to-background lg:via-background/40 lg:to-background" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mb-20" />

        {/* Core Features */}
        <div className="mb-32">
          <h2 className="text-3xl font-bold text-center mb-12">核心 AI 能力</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced Features */}
        <div className="mb-32">
          <h2 className="text-3xl font-bold text-center mb-12">高级特性</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {advancedFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-32">
          <h2 className="text-3xl font-bold text-center mb-4">典型应用场景</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            从敏捷站会到董事会议，从客户沟通到法律取证，让每一次对话都产生可追溯的价值。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="bg-muted/30 rounded-lg p-6 border border-border">
                <h4 className="font-semibold mb-3 text-lg">{useCase.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Architecture */}
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">技术架构</h2>
          <p className="text-muted-foreground mb-8 max-w-3xl mx-auto">
            采用 Express + MongoDB + React 的全栈架构，集成 Echo Stream、Echo Voices、Echo Vault、Echo Aligner 四大 AI 微服务。
            支持 WebSocket 实时通信、OpenAI 模型集成与向量检索，提供企业级的稳定性与扩展性。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-sm">
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="font-mono text-primary mb-1">Echo Stream</div>
              <div className="text-muted-foreground text-xs">实时转录</div>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="font-mono text-primary mb-1">Echo Voices</div>
              <div className="text-muted-foreground text-xs">说话人分离</div>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="font-mono text-primary mb-1">Echo Vault</div>
              <div className="text-muted-foreground text-xs">转录服务</div>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="font-mono text-primary mb-1">Echo Aligner</div>
              <div className="text-muted-foreground text-xs">时间对齐</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
