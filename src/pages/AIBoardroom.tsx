import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Users, Bot, User, Sparkles, Play, Square, Plus, Settings2, Search, X, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Agent, AGENT_CATALOG, DEFAULT_AGENTS } from '../data/agents';
import AgentLibrary from './AgentLibrary';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system' | 'summarizer';
  name: string;
  content: string;
  avatar?: string;
  sources?: { title: string; uri: string }[];
}

interface AIBoardroomProps {
  isReady: boolean;
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
}

export default function AIBoardroom({ isReady, agents, setAgents }: AIBoardroomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [meetingGoal, setMeetingGoal] = useState('');
  const [input, setInput] = useState('');
  const [isAutoDebating, setIsAutoDebating] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [addAgentTab, setAddAgentTab] = useState<'catalog' | 'custom'>('catalog');
  
  // New Agent Form
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('');
  const [newAgentAvatar, setNewAgentAvatar] = useState('🤖');
  const [newAgentSearch, setNewAgentSearch] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAutoDebatingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingAgent]);

  const runAgent = async (agent: Agent | { name: string; role: string; useSearch: boolean; avatar: string }, currentMessages: Message[], isSummarizer = false) => {
    const model = (window as any).geminiModel;
    if (!model) throw new Error("AI Model not ready");

    const formattedHistory = currentMessages.map(msg => `[${msg.name}]: ${msg.content}`).join('\n\n');
    
    let prompt = '';
    if (isSummarizer) {
      prompt = `MỤC TIÊU CUỘC HỌP: ${meetingGoal}\n\nLỊCH SỬ THẢO LUẬN:\n${formattedHistory}\n\n---\nNHIỆM VỤ CỦA BẠN:\nBạn là Thư ký Tổng kết (The Summarizer).\nHãy đọc toàn bộ lịch sử thảo luận trên và rút ra một Bản Kế hoạch Hành động (Action Plan) rõ ràng, rành mạch.\nBao gồm:\n1. Quyết định cuối cùng / Tóm tắt giải pháp.\n2. Các rủi ro / Điểm cần lưu ý.\n3. Các bước hành động tiếp theo.\nTrình bày bằng Markdown thật đẹp và dễ đọc. KHÔNG bịa đặt thông tin ngoài cuộc họp.`;
    } else {
      prompt = `MỤC TIÊU CUỘC HỌP: ${meetingGoal}\n\nLỊCH SỬ THẢO LUẬN:\n${formattedHistory}\n\n---\nNHIỆM VỤ CỦA BẠN:\nBạn là: ${agent.name}\nTính cách/Vai trò: ${agent.role}\n\nDựa vào mục tiêu cuộc họp và lịch sử thảo luận ở trên, hãy đưa ra ý kiến của bạn. \nHãy giữ đúng tính cách và vai trò được giao. KHÔNG lặp lại những gì người khác đã nói. KHÔNG đi lạc đề khỏi MỤC TIÊU CUỘC HỌP.\nChỉ trả lời nội dung phát biểu của bạn, không cần thêm tiền tố tên bạn.`;
    }

    const genConfig: any = {
      temperature: isSummarizer ? 0.2 : 0.7,
    };

    const request: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: genConfig
    };

    if (agent.useSearch) {
      request.tools = [{ googleSearch: {} }];
    }

    const result = await model.generateContent(request);

    const responseText = result.response.text();
    
    // Extract grounding metadata if available
    let sources: { title: string; uri: string }[] = [];
    try {
      const chunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        sources = chunks.map((chunk: any) => ({
          title: chunk.web?.title || 'Nguồn tham khảo',
          uri: chunk.web?.uri
        })).filter((s: any) => s.uri);
      }
    } catch (e) {
      console.error("Error extracting sources", e);
    }

    return { text: responseText, sources };
  };

  const handleUserMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !isReady || isAutoDebating || typingAgent) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      name: 'Chủ tọa (Bạn)',
      content: input.trim(),
      avatar: '👤'
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    if (!meetingGoal) {
      setMeetingGoal(input.trim());
    }
  };

  const handleCallAgent = async (agent: Agent) => {
    if (!isReady || isAutoDebating || typingAgent) return;
    if (!meetingGoal && messages.length === 0) {
      alert("Vui lòng nhập Mục tiêu cuộc họp trước khi mời Agent phát biểu!");
      return;
    }

    setTypingAgent(agent.name);
    try {
      const res = await runAgent(agent, messages);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'agent',
        name: agent.name,
        content: res.text,
        avatar: agent.avatar,
        sources: res.sources
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        name: 'Hệ thống',
        content: `⚠️ Lỗi khi gọi ${agent.name}: ${err.message}`
      }]);
    } finally {
      setTypingAgent(null);
    }
  };

  const handleAutoDebate = async () => {
    if (!isReady || isAutoDebating || typingAgent) return;
    if (!meetingGoal && messages.length === 0) {
      alert("Vui lòng nhập Mục tiêu cuộc họp trước khi bắt đầu thảo luận!");
      return;
    }

    setIsAutoDebating(true);
    isAutoDebatingRef.current = true;
    
    let currentMessages = [...messages];
    const rounds = 2; // 2 rounds per agent

    for (let r = 0; r < rounds; r++) {
      for (const agent of agents) {
        if (!isAutoDebatingRef.current) break;
        
        setTypingAgent(agent.name);
        try {
          const res = await runAgent(agent, currentMessages);
          const newMsg: Message = {
            id: crypto.randomUUID(),
            role: 'agent',
            name: agent.name,
            content: res.text,
            avatar: agent.avatar,
            sources: res.sources
          };
          currentMessages = [...currentMessages, newMsg];
          setMessages(currentMessages);
        } catch (err: any) {
          const errorMsg: Message = {
            id: crypto.randomUUID(),
            role: 'system',
            name: 'Hệ thống',
            content: `⚠️ ${agent.name} gặp sự cố và bị bỏ qua lượt.`
          };
          currentMessages = [...currentMessages, errorMsg];
          setMessages(currentMessages);
        }
        setTypingAgent(null);
        
        // Small pause between agents
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (!isAutoDebatingRef.current) break;
    }

    setIsAutoDebating(false);
    isAutoDebatingRef.current = false;
  };

  const stopAutoDebate = () => {
    isAutoDebatingRef.current = false;
    setIsAutoDebating(false);
    setTypingAgent(null);
  };

  const handleSummarize = async () => {
    if (!isReady || isAutoDebating || typingAgent || messages.length === 0) return;

    setTypingAgent('Thư ký Tổng kết');
    try {
      const summarizer = { name: 'Thư ký Tổng kết', role: '', useSearch: false, avatar: '📝' };
      const res = await runAgent(summarizer, messages, true);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'summarizer',
        name: summarizer.name,
        content: res.text,
        avatar: summarizer.avatar
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        name: 'Hệ thống',
        content: `⚠️ Lỗi khi tổng kết: ${err.message}`
      }]);
    } finally {
      setTypingAgent(null);
    }
  };

  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentRole.trim()) return;
    
    const newAgent: Agent = {
      id: crypto.randomUUID(),
      name: newAgentName.trim(),
      role: newAgentRole.trim(),
      avatar: newAgentAvatar,
      useSearch: newAgentSearch
    };
    
    setAgents(prev => [...prev, newAgent]);
    setNewAgentName('');
    setNewAgentRole('');
    setNewAgentSearch(false);
    setShowAddAgent(false);
  };

  const handleAddFromCatalog = (catalogAgent: Agent) => {
    if (agents.some(a => a.name === catalogAgent.name)) {
      alert(`${catalogAgent.name} đã có trong Phòng Họp AI!`);
      return;
    }
    const newAgent: Agent = {
      ...catalogAgent,
      id: crypto.randomUUID()
    };
    setAgents(prev => [...prev, newAgent]);
    setShowAddAgent(false);
  };

  const removeAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  if (showLibrary) {
    return (
      <div className="absolute inset-0 z-50 bg-white">
        <AgentLibrary 
          isReady={isReady} 
          agents={agents} 
          setAgents={setAgents} 
          onClose={() => setShowLibrary(false)} 
        />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Left Sidebar: Agents Management */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col hidden lg:flex shrink-0">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold">
            <Users size={20} />
            <span>Hội đồng AI ({agents.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowLibrary(true)}
              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 text-sm font-medium"
              title="Mở Kho Agent"
            >
              <Sparkles size={16} /> Kho
            </button>
            <button 
              onClick={() => setShowAddAgent(true)}
              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
              title="Thêm Agent Tùy chỉnh"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow relative group">
              <button 
                onClick={() => removeAgent(agent.id)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-xl shrink-0">
                  {agent.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{agent.name}</h3>
                  {agent.useSearch ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                      <Search size={10} /> Có Search
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full border border-gray-200">
                      <Zap size={10} /> Tốc độ cao
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                {agent.role}
              </p>
              
              <button
                onClick={() => handleCallAgent(agent)}
                disabled={!isReady || isAutoDebating || typingAgent !== null}
                className="mt-3 w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Play size={12} className={typingAgent === agent.name ? "animate-pulse" : ""} />
                {typingAgent === agent.name ? 'Đang suy nghĩ...' : 'Mời phát biểu'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Boardroom Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-3 shrink-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Sparkles size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Phòng Họp Ảo AI</h1>
                <p className="text-xs text-gray-500">Nơi các chuyên gia AI thảo luận và giải quyết vấn đề</p>
              </div>
            </div>
            
            {/* Mobile/Tablet Agent Library Button */}
            <button 
              onClick={() => setShowLibrary(true)}
              className="lg:hidden p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Mở Kho Agent"
            >
              <Sparkles size={18} />
              <span className="hidden sm:inline">Kho Agent</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">🎯 Mục tiêu:</span>
            <input 
              type="text"
              value={meetingGoal}
              onChange={(e) => setMeetingGoal(e.target.value)}
              placeholder="Nhập chủ đề cuộc họp (VD: Làm sao để bán cà phê 200k/ly?)"
              className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-800 placeholder-gray-400"
              disabled={isAutoDebating || typingAgent !== null}
            />
          </div>
        </header>

        {/* Chat History */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={40} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Chào mừng đến Phòng Họp AI</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  Hãy nhập mục tiêu cuộc họp ở trên, sau đó mời từng chuyên gia phát biểu hoặc bấm "Thảo luận tự động" để xem họ tranh luận.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm border ${
                  msg.role === 'user' ? 'bg-blue-50 border-blue-100' : 
                  msg.role === 'summarizer' ? 'bg-amber-50 border-amber-100' :
                  msg.role === 'system' ? 'bg-red-50 border-red-100' :
                  'bg-white border-gray-200'
                }`}>
                  {msg.avatar || (msg.role === 'user' ? '👤' : '🤖')}
                </div>
                
                <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 
                  msg.role === 'summarizer' ? 'bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-none' :
                  msg.role === 'system' ? 'bg-red-50 border border-red-100 text-red-700 rounded-tl-none text-sm' :
                  'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                }`}>
                  <div className={`text-xs font-bold mb-1.5 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {msg.name}
                  </div>
                  
                  <div className={`markdown-body ${msg.role === 'user' ? 'text-white' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Sources / Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100/20">
                      <div className="text-xs font-semibold flex items-center gap-1.5 mb-2 opacity-80">
                        <Search size={12} /> Nguồn tham khảo:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors max-w-[250px] truncate"
                            title={source.title}
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingAgent && (
              <div className="flex gap-4 flex-row">
                <div className="shrink-0 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <Loader2 size={18} className="animate-spin text-indigo-500" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm flex items-center gap-2">
                  <span className="text-gray-500 text-sm font-medium">{typingAgent} đang suy nghĩ và gõ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Control Panel */}
        <footer className="bg-white border-t border-gray-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-4xl mx-auto">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {!isAutoDebating ? (
                <button
                  onClick={handleAutoDebate}
                  disabled={!isReady || typingAgent !== null || (!meetingGoal && messages.length === 0)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Play size={16} className="fill-white" />
                  Thảo luận Tự động
                </button>
              ) : (
                <button
                  onClick={stopAutoDebate}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm animate-pulse"
                >
                  <Square size={16} className="fill-white" />
                  Dừng khẩn cấp
                </button>
              )}
              
              <button
                onClick={handleSummarize}
                disabled={!isReady || isAutoDebating || typingAgent !== null || messages.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ml-auto"
              >
                <CheckCircle2 size={16} />
                Chốt họp & Tổng kết
              </button>
            </div>

            {/* User Input */}
            <form onSubmit={handleUserMessage} className="relative flex items-end gap-2">
              <div className="relative w-full">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleUserMessage();
                    }
                  }}
                  placeholder="Nhập ý kiến của bạn với tư cách Chủ tọa..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none min-h-[56px] max-h-32 text-sm"
                  rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
                  disabled={!isReady || isAutoDebating || typingAgent !== null}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !isReady || isAutoDebating || typingAgent !== null}
                  className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </footer>

        {/* Add Agent Modal */}
        {showAddAgent && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-gray-800">Thư viện Chuyên gia</h3>
                <button onClick={() => setShowAddAgent(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 px-6 shrink-0">
                <button 
                  className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${addAgentTab === 'catalog' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setAddAgentTab('catalog')}
                >
                  Danh sách có sẵn
                </button>
                <button 
                  className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${addAgentTab === 'custom' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setAddAgentTab('custom')}
                >
                  Tạo mới tùy chỉnh
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {addAgentTab === 'catalog' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AGENT_CATALOG.map((agent, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-2xl shrink-0">
                            {agent.avatar}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{agent.name}</h4>
                            {agent.useSearch ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 mt-1">
                                <Search size={10} /> Có Search
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full border border-gray-200 mt-1">
                                <Zap size={10} /> Tốc độ cao
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-4 leading-relaxed flex-1 mb-4">
                          {agent.role}
                        </p>
                        <button
                          onClick={() => handleAddFromCatalog(agent)}
                          className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus size={16} /> Chọn Agent này
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleAddAgent} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl mx-auto space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên Chuyên gia</label>
                      <input 
                        type="text" 
                        required
                        value={newAgentName}
                        onChange={e => setNewAgentName(e.target.value)}
                        placeholder="VD: Chuyên gia Tâm lý học"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Avatar (Emoji)</label>
                      <input 
                        type="text" 
                        required
                        maxLength={2}
                        value={newAgentAvatar}
                        onChange={e => setNewAgentAvatar(e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center text-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò & Tính cách (System Prompt)</label>
                      <textarea 
                        required
                        value={newAgentRole}
                        onChange={e => setNewAgentRole(e.target.value)}
                        placeholder="VD: Bạn là một chuyên gia tâm lý học hành vi. Hãy phân tích vấn đề dưới góc độ cảm xúc của khách hàng..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-24 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-800">Quyền truy cập Internet</h4>
                        <p className="text-xs text-gray-500">Cho phép Agent tìm kiếm Google Live để lấy dữ liệu thực tế.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={newAgentSearch}
                          onChange={e => setNewAgentSearch(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setShowAddAgent(false)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        Hủy
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Thêm vào Hội đồng
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
