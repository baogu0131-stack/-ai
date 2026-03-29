import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Map as MapIcon, Search, ListTodo } from 'lucide-react';
import { sendTextMessage } from '../lib/gemini';
import { addMessageToHistory, getHistory, addSearchToHistory, addItineraryToHistory } from '../lib/store';
import { AmapView } from './AmapView';

interface VoiceAgentProps {
  onNavigateToMap?: (keyword: string) => void;
  onNavigateToItinerary?: (data: any) => void;
}

export function VoiceAgent({ onNavigateToMap, onNavigateToItinerary }: VoiceAgentProps) {
  const [status, setStatus] = useState('输入文字开始');
  const [aiText, setAiText] = useState('');
  const [inputText, setInputText] = useState('');
  const [mapQuery, setMapQuery] = useState<{ keyword: string; city?: string } | null>(null);
  const [isItineraryMode, setIsItineraryMode] = useState(false);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const handleMapRequest = (keyword: string, city?: string) => {
    setMapQuery({ keyword, city });
    addSearchToHistory(keyword, city);
  };

  const stopAll = () => {
    setStatus('输入文字开始');
    window.speechSynthesis.cancel();
  };

  const speakText = (text: string) => {
    // 保持语音播报功能（AI回复的声音），只是去掉了用户的语音输入
    if ('speechSynthesis' in window) {
      const cleanText = text.replace(/<[^>]*>?/gm, '');
      if (!cleanText) return;
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'zh-CN';
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn'));
      if (zhVoice) utterance.voice = zhVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTextSubmit = async (textToSend: string) => {
    addMessageToHistory('user', textToSend);
    setAiText(''); // Clear previous AI text while waiting
    setStatus('思考中...');

    try {
      let fullResponse = '';
      
      const sessions = getHistory();
      const today = new Date().toISOString().split('T')[0];
      const todaySession = sessions.find(s => s.date === today);
      const history = todaySession ? todaySession.messages.slice(0, -1) : [];

      let isItineraryCalled = false;
      let itineraryDataObj: any = null;

      await sendTextMessage(
        textToSend, 
        history, 
        (chunk) => {
          fullResponse += chunk;
          setAiText(fullResponse);
        },
        handleMapRequest,
        (data) => {
          isItineraryCalled = true;
          itineraryDataObj = data;
          addItineraryToHistory(data.destination || '未知目的地', data);
        },
        isItineraryMode // 传递模式标志
      );
      
      addMessageToHistory('ai', fullResponse);
      setStatus('输入文字开始');
      speakText(fullResponse);

      // 如果调用了行程规划，等待语音播报开始后，自动跳转到行程界面
      if (isItineraryCalled && itineraryDataObj && onNavigateToItinerary) {
        setTimeout(() => {
          onNavigateToItinerary(itineraryDataObj);
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to send text:', error);
      setStatus('连接错误');
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    handleTextSubmit(textToSend);
  };

  return (
    <div className="flex flex-col items-center justify-end h-full pb-24 px-6 relative">
      
      <AnimatePresence>
        {mapQuery && (
          <AmapView 
            keyword={mapQuery.keyword} 
            city={mapQuery.city} 
            onClose={() => setMapQuery(null)} 
          />
        )}
      </AnimatePresence>

      {/* Subtitles Display */}
      <div className="absolute bottom-80 left-0 right-0 flex flex-col items-center justify-end px-6 pointer-events-none z-10">
        <AnimatePresence>
          {(aiText || status === '思考中...') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6 py-3 max-w-3xl mx-auto pointer-events-auto"
            >
              <div className="text-xl md:text-3xl font-medium text-center leading-relaxed text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] flex items-center justify-center flex-wrap gap-1">
                {aiText && <span>{aiText}</span>}
                {status === '思考中...' && (
                  <span className="inline-flex gap-1.5 items-center ml-2 h-full py-2">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }} className="w-2 h-2 bg-white/80 rounded-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-2 h-2 bg-white/80 rounded-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-2 h-2 bg-white/80 rounded-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                  </span>
                )}
              </div>
              {mapQuery && onNavigateToMap && aiText && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => onNavigateToMap(mapQuery.keyword)}
                    className="px-6 py-3 bg-blue-500/80 hover:bg-blue-500 text-white rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md"
                  >
                    <MapIcon size={18} />
                    在全屏地图中查看 "{mapQuery.keyword}"
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-6 mt-8 w-full max-w-md z-20">
        <div className="text-sm tracking-widest uppercase text-white/50 font-medium">
          {status}
        </div>
        
        <div className="flex flex-col w-full gap-3">
          {/* Mode Switch */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setIsItineraryMode(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !isItineraryMode ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              普通聊天
            </button>
            <button
              onClick={() => setIsItineraryMode(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isItineraryMode ? 'bg-blue-500/80 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              <ListTodo size={14} /> 行程规划
            </button>
          </div>

          {/* Input Area */}
          <div className="flex items-center w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-2 shadow-2xl">
            <form onSubmit={handleSendText} className="flex-1 flex items-center px-4 py-1">
              <Search size={18} className="text-white/30 mr-2 shrink-0" />
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isItineraryMode ? "输入你想去哪里玩..." : "输入文字搜索地点或聊天..."}
                className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none text-base py-2"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="ml-2 p-2 bg-blue-500/80 rounded-full text-white hover:bg-blue-500 disabled:opacity-30 disabled:bg-white/10 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
