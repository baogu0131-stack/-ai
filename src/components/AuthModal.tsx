import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Fingerprint, Users, User, ShieldCheck, X, ChevronRight, Lock, Map, Mail, Eye, EyeOff } from 'lucide-react';
import { setElderlyMode as setStoreElderlyMode, saveUser } from '../lib/store';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

type AuthStep = 'privacy' | 'demo' | 'options' | 'phone_login' | 'child_assist';

interface AuthModalProps {
  isElderlyMode: boolean;
  onElderlyModeChange: (isElderly: boolean) => void;
  onClose: () => void;
  onLoginSuccess: () => void;
  isForcedLogin?: boolean;
}

export function AuthModal({ isElderlyMode, onElderlyModeChange, onClose, onLoginSuccess, isForcedLogin = false }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('privacy');
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // 老年模式下，文字和图标放大
  const baseText = isElderlyMode ? 'text-2xl' : 'text-base';
  const titleText = isElderlyMode ? 'text-4xl font-bold' : 'text-2xl font-bold';
  const subText = isElderlyMode ? 'text-xl' : 'text-sm';
  const btnClass = isElderlyMode ? 'py-6 text-2xl rounded-2xl' : 'py-3 text-base rounded-xl';
  const iconSize = isElderlyMode ? 32 : 20;

  useEffect(() => {
    let timer: any;
    if (step === 'demo') {
      timer = setTimeout(() => setStep('phone_login'), 3000); // 演示完直接去登录
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [step]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email || !password) {
      setErrorMsg('请填写邮箱和密码');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('密码至少需要6位');
      return;
    }
    
    setIsLoading(true);

    try {
      // 如果配置了 Supabase，则使用真实的认证逻辑
      if (supabase) {
        if (isLoginTab) {
          // 登录
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            console.error('Supabase login error:', error.message);
            if (error.message === 'Invalid login credentials') {
              setErrorMsg('邮箱或密码错误');
            } else if (error.message === 'Email not confirmed') {
              setErrorMsg('请先前往邮箱点击确认链接（或在 Supabase 后台关闭邮箱验证）');
            } else {
              setErrorMsg(error.message);
            }
            return;
          }

          if (data.user) {
            saveUser({
              id: data.user.id,
              phone: data.user.email || email,
              nickname: data.user.email?.split('@')[0] || '探宝用户',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + data.user.id,
              isElderlyMode,
            });
            onLoginSuccess();
          }
        } else {
          // 注册
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) {
            console.error('Supabase signup error:', error.message);
            setErrorMsg(error.message === 'User already registered' ? '该邮箱已注册，请直接登录' : error.message);
            return;
          }

          if (data.user) {
            // 如果需要邮箱验证，这里不能直接认为登录成功
            if (data.user.identities && data.user.identities.length === 0) {
              setErrorMsg('该邮箱已存在，请直接登录');
              return;
            }
            
            // 提示用户去邮箱确认（或者如果关闭了验证，这里直接就是 confirmed 状态）
            if (!data.session) {
               alert('注册成功！请前往您的邮箱点击确认链接，然后回来登录。');
               setIsLoginTab(true);
               return;
            }

            saveUser({
              id: data.user.id,
              phone: data.user.email || email,
              nickname: data.user.email?.split('@')[0] || '探宝用户',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + data.user.id,
              isElderlyMode,
            });
            alert('注册成功！');
            onLoginSuccess();
          }
        }
      } else {
        // 如果没有配置 Supabase，使用本地模拟登录（方便测试）
        console.log(`[Mock] ${isLoginTab ? 'Login' : 'Register'} Success:`, { email });
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 800));
        
        saveUser({
          id: uuidv4(),
          phone: email, 
          nickname: email.split('@')[0] || '探宝用户',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + email,
          isElderlyMode,
        });
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg('发生未知错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    if (isForcedLogin) return; // 强制登录时不能用游客模式
    onClose();
  };

  const renderPrivacy = () => (
    <div className="flex flex-col h-full justify-between">
      <div>
        <h2 className={`${titleText} text-white mb-6 flex items-center gap-3`}>
          <ShieldCheck className="text-green-400" size={isElderlyMode ? 40 : 28} />
          探宝AI 隐私保护提示
        </h2>
        <div className={`space-y-4 text-white/80 ${baseText}`}>
          <p className="font-bold text-white">为了帮您规划行程，我们仅收集必要信息：</p>
          <ul className="list-disc pl-6 space-y-3">
            <li><span className="text-green-400 font-bold">只收集</span>：邮箱(用于登录/提醒)、历史行程和偏好(用于精准规划)</li>
            <li><span className="text-red-400 font-bold">绝不收集</span>：您的通讯录、位置历史、相册、短信等非必要隐私！</li>
            <li><span className="text-blue-400 font-bold">绝不泄露</span>：未经您同意，绝不向任何第三方泄露数据。</li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col gap-3 mt-8">
        <button 
          onClick={() => setStep('demo')}
          className={`w-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors ${btnClass}`}
        >
          同意并继续
        </button>
        <button 
          onClick={() => onClose()} // 严格意义上不同意应该退出App，这里简化为关闭
          className={`w-full bg-white/5 hover:bg-white/10 text-white/60 font-medium transition-colors ${btnClass}`}
        >
          不同意
        </button>
      </div>
    </div>
  );

  const renderDemo = () => {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Map className="text-blue-400" size={40} />
        </div>
        <h2 className={`${titleText} text-white mb-4`}>
          探宝AI 行程规划
        </h2>
        <p className={`${baseText} text-white/70 max-w-sm`}>
          输入「重庆西南大学附近玩一天」<br/>
          <span className="text-blue-400 font-bold mt-2 inline-block">3秒生成 3条差异化行程</span>
        </p>
      </div>
    );
  };

  const renderOptions = () => (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex justify-between items-center mb-8">
          <h2 className={`${titleText} text-white`}>
            {isElderlyMode ? '登录/注册探宝，存行程更方便' : '登录/注册 探宝AI'}
          </h2>
          {/* 老年模式切换入口 */}
          <button 
            onClick={() => {
              const newMode = !isElderlyMode;
              onElderlyModeChange(newMode);
              setStoreElderlyMode(newMode);
            }}
            className={`px-4 py-2 rounded-full border ${isElderlyMode ? 'bg-green-600/20 border-green-500 text-green-400 text-xl' : 'bg-white/10 border-white/20 text-white/80 text-sm'}`}
          >
            {isElderlyMode ? '退出大字模式' : '切换长辈模式'}
          </button>
        </div>

        <div className="space-y-4">
          {isElderlyMode && (
            <button 
              onClick={() => setStep('child_assist')}
              className={`w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-400 text-white font-bold transition-colors ${btnClass}`}
            >
              <Users size={iconSize} /> 子女帮我弄
            </button>
          )}

          <button 
            onClick={() => setStep('phone_login')}
            className={`w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors ${btnClass}`}
          >
            <Mail size={iconSize} /> 
            {isElderlyMode ? '邮箱一键注册/登录' : '邮箱登录/注册'}
          </button>

          {isElderlyMode ? (
            <button className={`w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-medium transition-colors ${btnClass}`}>
              <Fingerprint size={iconSize} /> 用指纹/脸登
            </button>
          ) : (
            <div className="flex gap-3">
                <button 
                  onClick={() => alert('请点击上方的邮箱登录体验完整流程')}
                  className={`flex-1 flex items-center justify-center gap-2 bg-[#24292F]/80 text-white hover:bg-[#24292F] font-medium transition-colors ${btnClass}`}
                >
                  GitHub登录
                </button>
                <button 
                  onClick={() => alert('请点击上方的邮箱登录体验完整流程')}
                  className={`flex-1 flex items-center justify-center gap-2 bg-[#07C160]/20 text-[#07C160] hover:bg-[#07C160]/30 font-medium transition-colors ${btnClass}`}
                >
                  微信登录
                </button>
              </div>
          )}
        </div>
      </div>

      {!isForcedLogin && (
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <button 
            onClick={handleGuest}
            className={`text-white/50 hover:text-white transition-colors ${baseText}`}
          >
            {isElderlyMode ? '游客先试1次规划 ↗' : '游客模式体验 ↗'}
          </button>
        </div>
      )}
    </div>
  );

  const renderPhoneLogin = () => (
    <div className="flex flex-col h-full w-full bg-white rounded-3xl overflow-hidden relative">
      <button onClick={() => setStep('privacy')} className="absolute top-4 left-4 text-black/50 hover:text-black z-50 p-2">
        <ChevronRight size={iconSize} className="rotate-180" />
      </button>
      
      {/* 灵感菇风格登录界面 */}
      <div className="flex-1 flex flex-col px-8 pt-12 pb-8 items-center bg-gradient-to-b from-green-50/50 to-white">
        
        {/* Logo区域 */}
        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="w-16 h-16 bg-[#18B854] rounded-2xl flex items-center justify-center mb-4 shadow-[0_8px_20px_rgba(24,184,84,0.3)]">
             {/* 简单的植物/叶子图标替代灵感菇图标 */}
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M12 22c0-4.5-2.5-8-6-10 4 0 8 1.5 10 5" />
               <path d="M12 22c0-8.5 5-14 10-14-3.5 0-7 2.5-9 6" />
               <path d="M12 22V10" />
             </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">探宝 AI</h2>
          <p className="text-sm text-gray-500">种下灵感，收获创意</p>
        </div>

        {/* 登录注册卡片 */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 mb-6">
          
          {/* 切换 Tab */}
          <div className="flex bg-gray-100/80 p-1 rounded-2xl mb-6">
            <button 
              onClick={() => { setIsLoginTab(true); setErrorMsg(''); }}
              className={`flex-1 py-2.5 text-[15px] font-medium rounded-xl transition-all duration-300 ${isLoginTab ? 'bg-white text-[#18B854] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              登录
            </button>
            <button 
              onClick={() => { setIsLoginTab(false); setErrorMsg(''); }}
              className={`flex-1 py-2.5 text-[15px] font-medium rounded-xl transition-all duration-300 ${!isLoginTab ? 'bg-white text-[#18B854] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              注册
            </button>
          </div>

          {/* 表单区域 */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border ${errorMsg && email.length === 0 ? 'border-red-300 focus:ring-red-200' : 'border-gray-100 focus:ring-[#18B854]/20 focus:border-[#18B854]'} rounded-2xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400`}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码 (至少6位)"
                className={`w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border ${errorMsg && password.length < 6 ? 'border-red-300 focus:ring-red-200' : 'border-gray-100 focus:ring-[#18B854]/20 focus:border-[#18B854]'} rounded-2xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400`}
                required
                minLength={6}
                disabled={isLoading}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {errorMsg && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs pl-2"
              >
                {errorMsg}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 py-3.5 bg-[#18B854] hover:bg-[#15A64A] active:scale-[0.98] text-white text-[15px] font-medium rounded-2xl transition-all shadow-[0_4px_12px_rgba(24,184,84,0.2)] flex justify-center items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isLoginTab ? '进入探宝世界' : '注册并进入'}
            </button>
          </form>
        </div>

        {/* 底部协议 */}
        <div className="text-xs text-gray-400 mt-auto">
          使用即表示同意用户协议和隐私政策
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={!isForcedLogin && step !== 'privacy' && step !== 'demo' ? onClose : undefined} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full max-w-md ${step === 'phone_login' ? 'bg-transparent shadow-none' : 'bg-[#111] border border-white/10 shadow-2xl'} flex flex-col overflow-hidden ${
          isElderlyMode ? 'rounded-[2rem] min-h-[600px]' : 'rounded-3xl min-h-[500px]'
        } ${step !== 'phone_login' && (isElderlyMode ? 'p-8' : 'p-6')}`}
      >
        {/* 关闭按钮 (不在强制流程中显示) */}
        {!isForcedLogin && step !== 'privacy' && step !== 'demo' && step !== 'phone_login' && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X size={isElderlyMode ? 32 : 24} />
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col h-full"
          >
            {step === 'privacy' && renderPrivacy()}
            {step === 'demo' && renderDemo()}
            {step === 'options' && renderOptions()}
            {step === 'phone_login' && renderPhoneLogin()}
            {step === 'child_assist' && (
              <div className="flex flex-col h-full items-center justify-center text-center">
                <Users className="text-orange-400 mb-6" size={64} />
                <h2 className={`${titleText} text-white mb-4`}>子女代填专属流程</h2>
                <p className={`${baseText} text-white/70 mb-8`}>
                  请让您的子女使用他们的微信扫码，绑定您的手机号，并帮您设置出行偏好。
                </p>
                <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center">
                  <span className="text-black/50 font-bold">模拟二维码</span>
                </div>
                <button onClick={() => setStep('options')} className={`mt-8 text-white/50 ${baseText}`}>返回</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}