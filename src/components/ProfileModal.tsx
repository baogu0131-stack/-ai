import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Camera, Heart, Map, Calendar, ChevronRight } from 'lucide-react';
import type { UserProfile as UserType } from '../lib/store';

interface ProfileModalProps {
  user: UserType;
  onClose: () => void;
  onUpdateUser: (user: UserType) => void;
}

export function ProfileModal({ user, onClose, onUpdateUser }: ProfileModalProps) {
  const [nickname, setNickname] = useState(user.nickname || '');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'saved'>('profile');
  const [savedItems, setSavedItems] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'saved') {
      // 模拟从后端/本地获取收藏列表
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('saved_itinerary_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}');
            items.push(item);
          } catch (e) {}
        }
      }
      setSavedItems(items);
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setIsSaving(true);
    try {
      // 这里可以添加真实的后端更新逻辑，目前直接更新本地
      await new Promise(resolve => setTimeout(resolve, 500));
      onUpdateUser({
        ...user,
        nickname: nickname.trim(),
      });
      alert('保存成功');
    } catch (error) {
      console.error('Update profile failed:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-[#111] border border-white/10 shadow-2xl flex flex-col overflow-hidden rounded-3xl min-h-[500px]"
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`text-lg font-bold transition-colors ${activeTab === 'profile' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              个人信息
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`text-lg font-bold transition-colors ${activeTab === 'saved' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              我的收藏
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-white/5 overflow-hidden flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-white/50" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-2">点击修改头像（暂未实现）</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70 font-medium ml-1">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入您的昵称"
                  maxLength={20}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-white/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/70 font-medium ml-1">登录账号</label>
                <input
                  type="text"
                  value={user.phone || '未绑定'}
                  disabled
                  className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white/50 cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving || !nickname.trim() || nickname === user.nickname}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-4"
              >
                {isSaving ? '保存中...' : '保存修改'}
              </button>
            </form>
          ) : (
            <div className="p-6 space-y-4">
              {savedItems.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <Heart size={48} className="mx-auto mb-4 opacity-20" />
                  <p>暂无收藏的行程</p>
                  <p className="text-sm mt-2">在行程规划页面点击"收藏行程"即可保存</p>
                </div>
              ) : (
                savedItems.map((item, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white text-lg">{item.name || '已收藏行程'}</h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if(window.confirm('确认取消收藏吗？')) {
                            localStorage.removeItem(`saved_itinerary_${item.id}`);
                            setSavedItems(savedItems.filter(i => i.id !== item.id));
                          }
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Heart size={16} className="fill-current" />
                      </button>
                    </div>
                    <div className="flex gap-3 text-white/50 text-sm mb-3">
                      <span className="flex items-center gap-1"><Map size={14} /> {item.nodes?.length || 0} 个地点</span>
                      <span className="flex items-center gap-1"><Calendar size={14} /> {item.intensity || '适中'}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
                      <div className="flex gap-2">
                        {item.tags?.slice(0, 2).map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-white/10 rounded-lg text-xs text-white/70">{tag}</span>
                        ))}
                      </div>
                      <span className="text-blue-400 text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        查看详情 <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}