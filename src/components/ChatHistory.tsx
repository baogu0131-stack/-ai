import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getHistory, ChatSession, getSearchHistory, SearchRecord, clearSearchHistory, getItineraryHistory, ItineraryRecord, clearItineraryHistory } from '../lib/store';
import { format } from 'date-fns';
import { Trash2, MapPin, Copy, Check, ListTodo } from 'lucide-react';

interface ChatHistoryProps {
  onNavigateToItinerary?: (data: any) => void;
}

export function ChatHistory({ onNavigateToItinerary }: ChatHistoryProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'itinerary'>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [itineraries, setItineraries] = useState<ItineraryRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(getHistory());
    setSearches(getSearchHistory());
    setItineraries(getItineraryHistory());
  }, []);

  const handleClearSearches = () => {
    clearSearchHistory();
    setSearches([]);
  };

  const handleClearItineraries = () => {
    clearItineraryHistory();
    setItineraries([]);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="w-full h-full pt-24 pb-12 px-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <h2 className="text-3xl font-light text-white/90 tracking-tight">历史记录</h2>
          
          <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10 w-full md:w-auto overflow-x-auto scrollbar-hide shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'chat' ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white/80'
              }`}
            >
              对话记录
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'search' ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white/80'
              }`}
            >
              搜索记录
            </button>
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'itinerary' ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white/80'
              }`}
            >
              行程规划
            </button>
          </div>
        </div>
        
        {activeTab === 'chat' ? (
          sessions.length === 0 ? (
            <div className="text-white/40 text-center py-20 font-light">
              暂无对话。开始聊天以查看历史记录。
            </div>
          ) : (
            <div className="space-y-16">
              {sessions.map((session) => (
                <div key={session.id} className="space-y-6">
                  <div className="sticky top-0 py-2 backdrop-blur-md z-10">
                    <h3 className="text-sm font-medium tracking-widest uppercase text-white/50">
                      {format(new Date(session.date), 'yyyy年MM月dd日')}
                    </h3>
                  </div>
                  
                  <div className="space-y-6">
                    {session.messages.map((msg) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-baseline gap-3 mb-1">
                          <span className="text-xs font-medium uppercase tracking-wider text-white/30">
                            {msg.role === 'user' ? '你' : '探宝'}
                          </span>
                          <span className="text-[10px] text-white/20">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                        </div>
                        <div
                          className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed relative group ${
                            msg.role === 'user'
                              ? 'bg-white/10 text-white rounded-tr-sm'
                              : 'bg-transparent border border-white/10 text-white/80 rounded-tl-sm'
                          }`}
                        >
                          {msg.text}
                          <button
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className={`absolute ${msg.role === 'user' ? '-left-10' : '-right-10'} top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 opacity-0 group-hover:opacity-100 transition-all`}
                            title="复制内容"
                          >
                            {copiedId === msg.id ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} className="text-white/50 hover:text-white" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'search' ? (
          <div>
            {searches.length > 0 && (
              <div className="flex justify-end mb-6">
                <button 
                  onClick={handleClearSearches}
                  className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors px-4 py-2 rounded-full hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                  清除搜索记录
                </button>
              </div>
            )}
            
            {searches.length === 0 ? (
              <div className="text-white/40 text-center py-20 font-light">
                暂无搜索记录。
              </div>
            ) : (
              <div className="space-y-4">
                {searches.map((search) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={search.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <div className="text-white font-medium">{search.keyword}</div>
                        {search.city && <div className="text-white/50 text-xs mt-1">{search.city}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white/30 text-xs">
                        {format(new Date(search.timestamp), 'MM月dd日 HH:mm')}
                      </div>
                      <button
                        onClick={() => handleCopy(`${search.keyword}${search.city ? ` (${search.city})` : ''}`, search.id)}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                        title="复制搜索内容"
                      >
                        {copiedId === search.id ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} className="text-white/50 hover:text-white" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {itineraries.length > 0 && (
              <div className="flex justify-end mb-6">
                <button
                  onClick={handleClearItineraries}
                  className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors px-4 py-2 rounded-full hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                  清除行程记录
                </button>
              </div>
            )}
            
            {itineraries.length === 0 ? (
              <div className="text-white/40 text-center py-20 font-light">
                暂无行程规划记录。
              </div>
            ) : (
              <div className="space-y-4">
                {itineraries.map((record) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={record.id}
                    onClick={() => onNavigateToItinerary && onNavigateToItinerary(record.data)}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <ListTodo size={20} />
                      </div>
                      <div>
                        <div className="text-white font-medium group-hover:text-blue-400 transition-colors">{record.destination} 行程规划</div>
                        <div className="text-white/50 text-xs mt-1">
                          {format(new Date(record.timestamp), 'MM月dd日 HH:mm')}
                          {record.data.isElderly && ` · 适老模式`}
                          {` · 包含 ${record.data.plans?.length || 0} 个方案`}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/30 group-hover:text-white/70 text-sm">
                      查看详情 →
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
