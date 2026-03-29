/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ParticleSphere } from './components/ParticleSphere';
import { VoiceAgent } from './components/VoiceAgent';
import { StandaloneMap } from './components/StandaloneMap';
import { ChatHistory } from './components/ChatHistory';
import { ItineraryView, ItineraryData } from './components/ItineraryView';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { Mic, Clock, Map as MapIcon, MessageSquare, ListTodo, User, LogOut, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getUser, 
  getElderlyMode, 
  getHasSeenOnboarding, 
  setHasSeenOnboarding, 
  saveUser,
  UserProfile 
} from './lib/store';
import { supabase } from './lib/supabase';

export default function App() {
  const [view, setView] = useState<'home' | 'history' | 'map' | 'itinerary'>('home');
  const [mapInitialQuery, setMapInitialQuery] = useState<string>('');
  const [itineraryData, setItineraryData] = useState<ItineraryData | null>(null);
  
  // 认证与模式状态
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isElderlyMode, setIsElderlyMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isForcedLogin, setIsForcedLogin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭用户菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // 初始化加载状态
    const initApp = async () => {
      const currentMode = getElderlyMode();
      setIsElderlyMode(currentMode);
      
      let currentUser = getUser();
      
      if (supabase) {
        // 1. 获取当前会话
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          saveUser(null);
          currentUser = null;
        } else {
          // 2. 如果有会话，更新用户信息
          currentUser = {
            id: session.user.id,
            phone: session.user.phone || '',
            nickname: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '用户',
            avatar: session.user.user_metadata?.avatar_url,
            isElderlyMode: currentMode
          };
          saveUser(currentUser);
        }

        // 3. 监听登录状态变化 (例如第三方登录回调)
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            const updatedUser = {
              id: session.user.id,
              phone: session.user.phone || '',
              nickname: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '用户',
              avatar: session.user.user_metadata?.avatar_url,
              isElderlyMode: getElderlyMode()
            };
            saveUser(updatedUser);
            setUser(updatedUser);
            setShowAuthModal(false);
          } else {
            saveUser(null);
            setUser(null);
          }
        });
      }
      
      setUser(currentUser);
      
      const seenOnboarding = getHasSeenOnboarding();
      if (!seenOnboarding && !currentUser) {
        setShowAuthModal(true);
      }
    };
    
    initApp();
  }, []);

  const handleAuthClose = () => {
    setHasSeenOnboarding(true);
    setShowAuthModal(false);
    setIsForcedLogin(false);
  };

  const handleLoginSuccess = () => {
    setUser(getUser());
    setHasSeenOnboarding(true);
    setShowAuthModal(false);
    setIsForcedLogin(false);
  };

  const handleNavigateToMap = (query: string) => {
    setMapInitialQuery(query);
    setView('map');
  };

  const handleNavigateToItinerary = (data: ItineraryData) => {
    setItineraryData(data);
    setView('itinerary');
  };

  // 请求地理位置权限
  useState(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('地理位置获取成功:', position);
        },
        (error) => {
          console.warn('地理位置获取失败:', error.message);
        }
      );
    }
  });

  return (
    <div className="relative w-full h-screen bg-[#050505] text-white overflow-hidden font-sans">
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 bg-white overflow-hidden shrink-0">
          <img src="/logo.png" alt="探宝 AI Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-white font-medium tracking-wide text-base md:text-lg drop-shadow-md whitespace-nowrap">
          探宝 AI
        </h1>
      </div>
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
          <ParticleSphere />
        </Canvas>
      </div>

      {/* Header Navigation */}
      <header className="absolute top-0 right-0 z-20 p-4 md:p-6 flex justify-end items-center pointer-events-none w-full md:w-auto">
        <nav className="flex gap-2 md:gap-4 pointer-events-auto items-center mt-12 md:mt-0 overflow-x-auto pb-2 md:pb-0 px-4 md:px-0 scrollbar-hide max-w-full">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <div 
                className="px-3 py-1.5 bg-white/10 rounded-full flex items-center gap-2 cursor-pointer hover:bg-white/20 transition-colors border border-white/5"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User size={12} className="text-blue-400" />
                  </div>
                )}
                <span className="text-sm text-white font-medium pr-1">
                  {user.nickname || (user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '探宝用户')}
                </span>
              </div>

              {/* 下拉菜单 */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 origin-top-right"
                  >
                    <div className="p-4 border-b border-white/10 bg-white/5">
                      <div className="font-medium text-white truncate">{user.nickname || '探宝用户'}</div>
                      <div className="text-xs text-white/50 truncate mt-0.5">{user.phone}</div>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <Settings size={16} />
                        个人信息设置
                      </button>
                      <button 
                        onClick={async () => {
                          // 1. 先记录要执行登出，但不立即卸载组件
                          // 2. 发送网络请求
                          if (supabase) {
                            try {
                              // 不使用 await 阻塞，或者等待它完成再清理本地状态
                              await supabase.auth.signOut();
                            } catch (e) {
                              console.error('Sign out exception:', e);
                            }
                          }
                          // 3. 网络请求完成后（或出错后），再清理本地状态并关闭菜单
                          localStorage.removeItem('token');
                          saveUser(null);
                          setUser(null);
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors mt-1"
                      >
                        <LogOut size={16} />
                        退出登录
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white text-sm font-medium transition-colors"
            >
              登录/注册
            </button>
          )}

          <div className="w-px h-6 bg-white/10 mx-2"></div>

          <button
            onClick={() => setView('home')}
            className={`p-2.5 md:p-3 rounded-full backdrop-blur-md transition-all shrink-0 ${
              view === 'home' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            <Mic size={18} className="md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setView('history')}
            className={`p-2.5 md:p-3 rounded-full backdrop-blur-md transition-all shrink-0 ${
              view === 'history' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            <Clock size={18} className="md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setView('map')}
            className={`p-2.5 md:p-3 rounded-full backdrop-blur-md transition-all shrink-0 ${
              view === 'map' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            <MapIcon size={18} className="md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setView('itinerary')}
            className={`p-2.5 md:p-3 rounded-full backdrop-blur-md transition-all shrink-0 ${
              view === 'itinerary' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            <ListTodo size={18} className="md:w-5 md:h-5" />
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full pointer-events-none">
        <AnimatePresence mode="wait">
          {showAuthModal && (
            <AuthModal 
              isElderlyMode={isElderlyMode} 
              onElderlyModeChange={setIsElderlyMode}
              onClose={handleAuthClose}
              onLoginSuccess={handleLoginSuccess}
              isForcedLogin={isForcedLogin}
            />
          )}

          {showProfileModal && user && (
            <ProfileModal
              user={user}
              onClose={() => setShowProfileModal(false)}
              onUpdateUser={(updatedUser) => {
                saveUser(updatedUser);
                setUser(updatedUser);
              }}
            />
          )}

          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
              className="w-full h-full pointer-events-auto absolute inset-0"
            >
              <VoiceAgent 
                onNavigateToMap={handleNavigateToMap} 
                onNavigateToItinerary={handleNavigateToItinerary}
              />
            </motion.div>
          )}
          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
              className="w-full h-full pointer-events-auto bg-black/40 backdrop-blur-sm absolute inset-0"
            >
              <ChatHistory onNavigateToItinerary={handleNavigateToItinerary} />
            </motion.div>
          )}
          {view === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
              className="w-full h-full pointer-events-auto absolute inset-0 bg-black/60 backdrop-blur-md"
            >
              <StandaloneMap initialQuery={mapInitialQuery} />
            </motion.div>
          )}
          {view === 'itinerary' && (
            <motion.div
              key="itinerary"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
              className="w-full h-full pointer-events-auto absolute inset-0 bg-black/60 backdrop-blur-md"
            >
              {itineraryData ? (
                <ItineraryView data={itineraryData} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  请通过语音助手发起行程规划需求
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
