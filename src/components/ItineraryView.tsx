import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Heart, Navigation, Edit2, Clock, MapPin, AlertCircle, Info, Activity, DollarSign, Star, ExternalLink, Save, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';
import { RoutePreviewModal } from './RoutePreviewModal';
import { getUser } from '../lib/store';

export interface ItineraryNode {
  time: string;
  place: string;
  activity: string;
  transport: string;
  duration: string;
  notes: string;
  dianpingScore?: string;
}

export interface ItineraryPlan {
  id: string;
  name: string;
  tags: string[];
  intensity: string;
  budget: string;
  tips: string;
  nodes: ItineraryNode[];
}

export interface ItineraryData {
  destination: string;
  isElderly: boolean;
  plans: ItineraryPlan[];
}

interface ItineraryViewProps {
  data: ItineraryData;
}

export function ItineraryView({ data: initialData }: ItineraryViewProps) {
  const [data, setData] = useState(initialData);
  const [activePlanId, setActivePlanId] = useState<string>(data.plans[0]?.id || '');
  const [fontSizeScale, setFontSizeScale] = useState(data.isElderly ? 1.3 : 1);
  
  // 新增状态
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNodes, setEditNodes] = useState<ItineraryNode[]>([]);
  
  const user = getUser();

  const activePlan = data.plans.find((p) => p.id === activePlanId) || data.plans[0];

  // 检查收藏状态
  useEffect(() => {
    // 实际项目中这里应调用后端接口查询当前行程是否已收藏
    // 示例：fetch(`/api/itinerary/check?user_id=${user.id}&plan_id=${activePlan.id}`)
    const saved = localStorage.getItem(`saved_itinerary_${activePlan.id}`);
    setIsSaved(!!saved);
  }, [activePlan.id, user]);

  if (!activePlan) {
    return <div className="p-8 text-center text-white">无可用行程方案</div>;
  }

  // 1. 一键导航逻辑
  const handleNavigation = () => {
    const places = activePlan.nodes.map(n => n.place).filter(p => p && p !== '自由活动');
    if (places.length < 2) {
      alert('路线点位不足，无法导航');
      return;
    }
    
    const start = places[0];
    const end = places[places.length - 1];
    
    // 尝试唤起高德地图APP
    const amapScheme = `amapuri://route/plan/?sname=${encodeURIComponent(start)}&dname=${encodeURIComponent(end)}&dev=0&t=0`;
    // 回退到网页版
    const fallbackUrl = `https://uri.amap.com/navigation?to=,,${encodeURIComponent(end)}&mode=car&policy=1&src=tanbao`;

    // 移动端优先尝试唤起APP
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = amapScheme;
      // 设置一个延时，如果没唤起APP，则打开网页版
      setTimeout(() => {
        window.open(fallbackUrl, '_blank');
      }, 2000);
    } else {
      window.open(fallbackUrl, '_blank');
    }
  };

  // 2. 收藏行程逻辑
  const handleSave = async () => {
    if (!user) {
      alert('请先登录后再收藏行程！');
      // 实际项目中可以触发登录弹窗
      return;
    }

    try {
      if (isSaved) {
        // 取消收藏 (模拟后端请求)
        // await fetch(`/api/itinerary/save/${activePlan.id}`, { method: 'DELETE' });
        localStorage.removeItem(`saved_itinerary_${activePlan.id}`);
        setIsSaved(false);
        alert('已取消收藏');
      } else {
        // 收藏 (模拟后端请求)
        // await fetch('/api/itinerary/save', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ user_id: user.id, destination: data.destination, plan_data: activePlan })
        // });
        localStorage.setItem(`saved_itinerary_${activePlan.id}`, JSON.stringify(activePlan));
        setIsSaved(true);
        alert('收藏成功！可在个人中心查看');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('操作失败，请重试');
    }
  };

  // 3. 调整修改逻辑
  const handleEditToggle = () => {
    if (isEditing) {
      // 取消编辑
      setIsEditing(false);
    } else {
      // 进入编辑
      setEditNodes([...activePlan.nodes]);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    const updatedPlans = data.plans.map(p => {
      if (p.id === activePlan.id) {
        return { ...p, nodes: editNodes };
      }
      return p;
    });
    setData({ ...data, plans: updatedPlans });
    setIsEditing(false);
    alert('行程修改已保存');
  };

  const handleRegenerate = () => {
    if (window.confirm('确认调用AI重新生成当前行程吗？')) {
      alert('正在调用AI重新规划... (模拟)');
      setIsEditing(false);
    }
  };

  const moveNode = (index: number, direction: 'up' | 'down') => {
    const newNodes = [...editNodes];
    if (direction === 'up' && index > 0) {
      [newNodes[index - 1], newNodes[index]] = [newNodes[index], newNodes[index - 1]];
    } else if (direction === 'down' && index < newNodes.length - 1) {
      [newNodes[index + 1], newNodes[index]] = [newNodes[index], newNodes[index + 1]];
    }
    setEditNodes(newNodes);
  };

  const updateNode = (index: number, field: keyof ItineraryNode, value: string) => {
    const newNodes = [...editNodes];
    newNodes[index] = { ...newNodes[index], [field]: value };
    setEditNodes(newNodes);
  };

  const baseTextClass = fontSizeScale > 1 ? 'text-lg' : 'text-sm';
  const headingClass = fontSizeScale > 1 ? 'text-3xl' : 'text-xl';
  const titleClass = fontSizeScale > 1 ? 'text-4xl' : 'text-2xl';

  return (
    <div className="w-full h-full pt-24 pb-12 px-6 flex flex-col max-w-6xl mx-auto overflow-y-auto" style={{ fontSize: `${fontSizeScale}em` }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className={`font-light text-white/90 tracking-tight ${titleClass}`}>
            {data.destination} 行程规划
          </h2>
          {data.isElderly && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/30">
              已开启适老化显示模式
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFontSizeScale(s => s === 1 ? 1.3 : 1)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors"
          >
            {fontSizeScale > 1 ? '标准字体' : '大字模式'}
          </button>
        </div>
      </div>

      {/* 方案切换 Tabs */}
      <div className="flex gap-4 mb-8 overflow-visible pb-4">
        {data.plans.map((plan, index) => (
          <button
            key={plan.id}
            onClick={() => setActivePlanId(plan.id)}
            className={`flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all font-bold text-2xl shadow-lg ${
              activePlanId === plan.id
                ? 'bg-blue-600/50 border-blue-400 text-white shadow-blue-500/30 scale-110'
                : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white hover:border-white/40'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：方案概览 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h3 className={`font-medium text-white mb-4 ${headingClass}`}>{activePlan.name}</h3>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {activePlan.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/80">
                  {tag}
                </span>
              ))}
            </div>

            <div className="space-y-4 text-white/70">
              <div className="flex items-center gap-3">
                <Activity size={18} className="text-blue-400" />
                <span className={baseTextClass}>行程强度：{activePlan.intensity}</span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="text-green-400" />
                <span className={baseTextClass}>预估预算：{activePlan.budget}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <h4 className="flex items-center gap-2 text-white/90 font-medium mb-3">
                <AlertCircle size={18} className="text-orange-400" />
                避坑建议
              </h4>
              <p className={`text-white/60 leading-relaxed ${baseTextClass}`}>
                {activePlan.tips}
              </p>
            </div>
          </div>

          {/* 操作按钮区 */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setShowRouteMap(true)}
              className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              <Map size={18} /> 路线预览
            </button>
            <button 
              onClick={handleNavigation}
              className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              <Navigation size={18} /> 一键导航
            </button>
            <button 
              onClick={handleSave}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-white transition-colors ${
                isSaved ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <Heart size={18} className={isSaved ? "fill-current" : ""} /> 
              {isSaved ? '已收藏' : '收藏行程'}
            </button>
            <button 
              onClick={handleEditToggle}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-white transition-colors ${
                isEditing ? 'bg-blue-600 hover:bg-blue-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {isEditing ? <X size={18} /> : <Edit2 size={18} />}
              {isEditing ? '取消修改' : '调整修改'}
            </button>
          </div>

          {/* 编辑模式下的额外操作区 */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-3 mt-3"
              >
                <button 
                  onClick={handleRegenerate}
                  className="flex items-center justify-center gap-2 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl transition-colors border border-purple-500/30"
                >
                  <RefreshCw size={18} /> AI重生成
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors shadow-lg shadow-green-500/20"
                >
                  <Save size={18} /> 保存修改
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 右侧：时间线 */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <h3 className={`font-medium text-white mb-8 ${headingClass}`}>行程安排</h3>
            
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/20 before:to-transparent">
              {(isEditing ? editNodes : activePlan.nodes).map((node, index) => (
                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#050505] bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {index + 1}
                  </div>
                  
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    {isEditing && (
                      <div className="flex justify-end gap-2 mb-2 pb-2 border-b border-white/10">
                        <button onClick={() => moveNode(index, 'up')} disabled={index === 0} className="p-1 text-white/50 hover:text-white disabled:opacity-30"><ChevronUp size={16} /></button>
                        <button onClick={() => moveNode(index, 'down')} disabled={index === editNodes.length - 1} className="p-1 text-white/50 hover:text-white disabled:opacity-30"><ChevronDown size={16} /></button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white text-lg flex items-center gap-2 flex-1 mr-2">
                        <MapPin size={18} className="text-blue-400 shrink-0" />
                        {isEditing ? (
                          <input 
                            value={node.place} 
                            onChange={(e) => updateNode(index, 'place', e.target.value)}
                            className="bg-black/30 border border-white/20 rounded px-2 py-1 w-full text-white text-sm"
                          />
                        ) : (
                          node.place
                        )}
                      </h4>
                      {isEditing ? (
                        <input 
                          value={node.time} 
                          onChange={(e) => updateNode(index, 'time', e.target.value)}
                          className="bg-black/30 border border-white/20 rounded px-2 py-1 w-20 text-white text-sm font-mono text-center shrink-0"
                        />
                      ) : (
                        <span className="text-blue-400 text-sm font-mono bg-blue-500/10 px-2 py-1 rounded shrink-0">
                          {node.time}
                        </span>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <textarea 
                        value={node.activity}
                        onChange={(e) => updateNode(index, 'activity', e.target.value)}
                        className="bg-black/30 border border-white/20 rounded px-2 py-1 w-full text-white text-sm mb-3 min-h-[60px]"
                      />
                    ) : (
                      <p className={`text-white/80 mb-3 ${baseTextClass}`}>
                        {node.activity}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center justify-between gap-y-3 mt-4 pt-3 border-t border-white/10">
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-white/50 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> 
                          {isEditing ? <input value={node.duration} onChange={(e) => updateNode(index, 'duration', e.target.value)} className="bg-black/30 border border-white/20 rounded px-1 w-12" /> : node.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Navigation size={14} /> 
                          {isEditing ? <input value={node.transport} onChange={(e) => updateNode(index, 'transport', e.target.value)} className="bg-black/30 border border-white/20 rounded px-1 w-16" /> : node.transport}
                        </span>
                        {!isEditing && node.dianpingScore && node.dianpingScore !== '暂无评分' && (
                          <span className="flex items-center gap-1 text-orange-400 font-medium">
                            <Star size={14} fill="currentColor" /> {node.dianpingScore}
                          </span>
                        )}
                      </div>
                      
                      {!isEditing && (
                        <a 
                          href={`https://www.dianping.com/search/keyword/1/0_${encodeURIComponent(node.place)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#f63]/10 hover:bg-[#f63]/20 text-[#f63] rounded-lg text-xs font-medium transition-colors border border-[#f63]/20"
                          title={`在大众点评中查看 ${node.place}`}
                        >
                          大众点评 <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    {(node.notes || isEditing) && (
                      <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <div className="text-orange-300 text-xs flex items-start gap-2">
                          <Info size={14} className="shrink-0 mt-0.5" />
                          {isEditing ? (
                            <input 
                              value={node.notes} 
                              onChange={(e) => updateNode(index, 'notes', e.target.value)}
                              placeholder="添加注意事项..."
                              className="bg-black/30 border border-orange-500/30 rounded px-2 py-1 w-full text-orange-300 placeholder:text-orange-500/50"
                            />
                          ) : (
                            <span>{node.notes}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRouteMap && (
          <RoutePreviewModal 
            nodes={activePlan.nodes}
            destination={data.destination}
            isElderlyMode={data.isElderly}
            onClose={() => setShowRouteMap(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}