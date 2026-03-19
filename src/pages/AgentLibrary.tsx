import React, { useState } from 'react';
import { Search, Plus, Sparkles, Zap, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AGENT_CATALOG, Agent } from '../data/agents';

interface AgentLibraryProps {
  isReady: boolean;
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  onClose?: () => void;
}

export default function AgentLibrary({ isReady, agents, setAgents, onClose }: AgentLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const filteredAgents = AGENT_CATALOG.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kho Agent</h1>
            <p className="text-sm text-gray-500">Khám phá và chọn các AI Agent chuyên gia cho phòng họp của bạn</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc vai trò..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow shadow-sm"
            />
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent, index) => (
              <div 
                key={index}
                onClick={() => setSelectedAgent(agent)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col h-full group"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl border border-blue-100 shadow-sm group-hover:scale-110 transition-transform">
                        {agent.avatar}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1">{agent.name}</h3>
                        {agent.useSearch && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mt-1 border border-blue-100">
                            <Search size={10} /> Có Google Search
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-4 leading-relaxed">
                    {agent.role}
                  </p>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Xem chi tiết <Sparkles size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredAgents.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Search size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Không tìm thấy Agent</h3>
              <p className="text-gray-500">Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </div>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-4xl shadow-sm border border-gray-100">
                  {selectedAgent.avatar}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedAgent.name}</h2>
                  {selectedAgent.useSearch && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full mt-2 border border-blue-100">
                      <Search size={12} /> Được cấp quyền Google Search
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Vai trò & Nhiệm vụ</h3>
              <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100/50">
                <p className="text-gray-700 leading-relaxed text-lg">
                  {selectedAgent.role}
                </p>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Tính năng nổi bật</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 text-green-500"><CheckCircle2 size={18} /></div>
                    <span className="text-gray-600">Được tối ưu hóa prompt chuyên sâu cho lĩnh vực chuyên môn.</span>
                  </li>
                  {selectedAgent.useSearch ? (
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 text-blue-500"><Zap size={18} /></div>
                      <span className="text-gray-600">Có khả năng truy cập Internet theo thời gian thực để cập nhật thông tin mới nhất.</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 text-amber-500"><AlertCircle size={18} /></div>
                      <span className="text-gray-600">Sử dụng kiến thức nội tại của mô hình, không cần kết nối Internet.</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedAgent(null)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 font-medium rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button 
                onClick={() => {
                  const isAlreadyAdded = agents.some(a => a.name === selectedAgent.name);
                  if (isAlreadyAdded) {
                    alert(`${selectedAgent.name} đã có trong Phòng Họp AI!`);
                  } else {
                    const newAgent = { ...selectedAgent, id: crypto.randomUUID() };
                    setAgents([...agents, newAgent]);
                    alert(`Đã thêm ${selectedAgent.name} vào Phòng Họp AI!`);
                  }
                  setSelectedAgent(null);
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm shadow-blue-200 transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Thêm vào Phòng Họp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
