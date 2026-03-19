import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles, Film, X, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  videoUrl?: string;
}

interface VideoAnalyzerProps {
  isReady: boolean;
}

export default function VideoAnalyzer({ isReady }: VideoAnalyzerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Xin chào! Hãy tải lên một đoạn video và đặt câu hỏi. Tôi sẽ trích xuất các khung hình và phân tích nội dung video giúp bạn (Lưu ý: Không hỗ trợ âm thanh).'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert("Vui lòng chọn video có dung lượng dưới 50MB để đảm bảo hiệu suất.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedVideo(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const extractFrames = async (file: File, numFrames: number = 15): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        if (!duration || !isFinite(duration)) {
          reject(new Error("Không thể xác định độ dài video."));
          return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Lỗi khởi tạo canvas."));
          return;
        }
        
        // Resize video maintaining aspect ratio, max width 640
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const frames: string[] = [];
        let currentFrame = 0;
        
        const captureFrame = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          frames.push(base64);
          
          currentFrame++;
          if (currentFrame < numFrames) {
            video.currentTime = (duration / numFrames) * currentFrame;
          } else {
            URL.revokeObjectURL(video.src);
            resolve(frames);
          }
        };
        
        video.onseeked = captureFrame;
        video.onerror = (e) => reject(e);
        
        // Start capturing
        video.currentTime = 0;
      };
    });
  };

  const sendMessage = async (text: string, videoFile?: File | null, previewUrl?: string | null) => {
    if ((!text.trim() && !videoFile) || !isReady || isLoading) return;

    const newUserMsg: Message = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      text: text || (videoFile ? 'Hãy mô tả video này.' : ''), 
      videoUrl: previewUrl || undefined
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const model = (window as any).geminiModel;
      const parts: any[] = [];

      if (videoFile) {
        setStatusText('Đang trích xuất khung hình từ video...');
        const frames = await extractFrames(videoFile, 15); // Extract 15 frames
        
        setStatusText('Đang gửi dữ liệu cho AI phân tích...');
        parts.push({ text: `Đây là các khung hình được trích xuất theo thứ tự thời gian từ một đoạn video. Dựa vào các khung hình này, hãy trả lời yêu cầu của tôi.` });
        
        frames.forEach(frameData => {
          parts.push({
            inlineData: { data: frameData, mimeType: 'image/jpeg' }
          });
        });
        
        if (text.trim()) {
          parts.push({ text: `Yêu cầu của tôi: "${text}"` });
        } else {
          parts.push({ text: `Yêu cầu của tôi: "Hãy mô tả chi tiết những gì diễn ra trong video này."` });
        }
      } else {
        setStatusText('Đang xử lý...');
        parts.push({ text });
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: { 
          temperature: 0.4
        }
      });
      
      const responseText = result.response.text();
      
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        text: responseText
      }]);
    } catch (err: any) {
      console.error("Video analysis error:", err);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        text: `Lỗi: ${err.message || 'Không thể kết nối tới AI. Vui lòng thử lại.'}` 
      }]);
    } finally {
      setIsLoading(false);
      setStatusText('');
      setSelectedVideo(null);
      setVideoPreview(null);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedVideo) || !isReady || isLoading) return;
    const userText = input.trim();
    setInput('');
    await sendMessage(userText, selectedVideo, videoPreview);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600 hidden sm:block">
            <Film size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Phân tích Video</h1>
            <div className="mt-1">
              <div className="flex items-center gap-2 px-2.5 py-1 bg-purple-50 border border-purple-100 rounded-md text-xs font-medium text-purple-700">
                <Sparkles size={12} />
                <span>Trích xuất khung hình & Phân tích hành động</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto">
        <div className="flex flex-col gap-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-500 text-white'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}>
                {msg.videoUrl && (
                  <video src={msg.videoUrl} controls className="max-w-full h-auto max-h-64 rounded-lg mb-2 bg-black/5" />
                )}
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 flex-row">
              <div className="shrink-0 w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-2">
                <Loader2 size={18} className="animate-spin text-purple-500" />
                <span className="text-gray-500 text-sm animate-pulse">{statusText || 'Đang xử lý...'}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 p-4 sm:p-6 shrink-0">
        <div className="max-w-4xl mx-auto relative">
          {videoPreview && (
            <div className="relative inline-block mb-3">
              <video src={videoPreview} className="h-24 rounded-lg border border-gray-200 object-cover bg-black/5" />
              <button 
                type="button" 
                onClick={() => { setSelectedVideo(null); setVideoPreview(null); }} 
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleVideoChange} 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isReady || isLoading}
              className="shrink-0 p-3.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-[56px] w-[56px]"
              title="Tải video lên"
            >
              <Upload size={22} />
            </button>
            <div className="relative w-full">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi về video hoặc để trống để AI tự mô tả..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[56px] max-h-32"
                rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
                disabled={!isReady || isLoading}
              />
              <button
                type="submit"
                disabled={(!input.trim() && !selectedVideo) || !isReady || isLoading}
                className="absolute right-2 bottom-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
}
