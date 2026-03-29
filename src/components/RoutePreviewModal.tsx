import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Navigation } from 'lucide-react';
import AMapLoader from '@amap/amap-jsapi-loader';
import type { ItineraryNode } from './ItineraryView';

interface RoutePreviewModalProps {
  nodes: ItineraryNode[];
  destination: string;
  onClose: () => void;
  isElderlyMode?: boolean;
}

export function RoutePreviewModal({ nodes, destination, onClose, isElderlyMode = false }: RoutePreviewModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking' | 'transit'>('driving');
  const routePluginRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let map: any = null;

    const initMap = async () => {
      try {
        const amapKey = import.meta.env.VITE_AMAP_KEY;
        if (!amapKey) {
          setError('请在环境变量中配置高德地图 API Key (VITE_AMAP_KEY)');
          return;
        }

        if (import.meta.env.VITE_AMAP_SECURITY_CODE) {
          (window as any)._AMapSecurityConfig = {
            securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
          };
        }

        const AMap = await AMapLoader.load({
          key: amapKey,
          version: '2.0',
          plugins: ['AMap.Driving', 'AMap.Walking', 'AMap.Transfer', 'AMap.PlaceSearch', 'AMap.Geocoder'],
        });

        if (!mapContainerRef.current) return;

        map = new AMap.Map(mapContainerRef.current, {
          zoom: 12,
          viewMode: '3D',
          mapStyle: 'amap://styles/dark', // 保持深色主题
        });
        mapRef.current = map;

        drawRoute(AMap, map, transportMode);

      } catch (err) {
        console.error('Failed to load map:', err);
        setError('地图加载失败，请检查网络或配置');
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
      }
    };
  }, []);

  // 当出行方式改变时重新绘制
  useEffect(() => {
    if (mapRef.current && (window as any).AMap) {
      drawRoute((window as any).AMap, mapRef.current, transportMode);
    }
  }, [transportMode]);

  const drawRoute = async (AMap: any, map: any, mode: string) => {
    if (routePluginRef.current) {
      routePluginRef.current.clear();
    }

    const places = nodes.map(n => n.place).filter(p => p && p !== '自由活动');
    if (places.length < 2) {
      setError('路线点位不足，无法规划路线');
      return;
    }

    // 将地点名称转为坐标 (简单起见，这里直接用名称作为waypoint，高德API支持名称规划，但需要指定city)
    const points = places.map(p => ({ keyword: p, city: destination }));

    let routePlugin;
    if (mode === 'driving') {
      routePlugin = new AMap.Driving({ map: map, panel: 'route-panel', hideMarkers: false });
    } else if (mode === 'walking') {
      routePlugin = new AMap.Walking({ map: map, panel: 'route-panel', hideMarkers: false });
    } else {
      routePlugin = new AMap.Transfer({ map: map, panel: 'route-panel', city: destination });
    }
    
    routePluginRef.current = routePlugin;

    const start = points[0];
    const end = points[points.length - 1];
    const waypoints = points.slice(1, -1);

    routePlugin.search(start, end, { waypoints }, (status: string, result: any) => {
      if (status === 'complete') {
        setError(null);
      } else {
        console.error('Route planning failed:', result);
        setError(`路线规划失败：${result.info || '未知错误'}`);
      }
    });
  };

  const btnClass = isElderlyMode ? 'py-3 px-6 text-xl' : 'py-2 px-4 text-sm';
  const headerClass = isElderlyMode ? 'text-2xl' : 'text-lg';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative w-full max-w-5xl bg-[#111] border border-white/10 shadow-2xl flex flex-col overflow-hidden rounded-3xl h-[85vh]`}
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className={`font-bold text-white flex items-center gap-2 ${headerClass}`}>
            <Navigation className="text-blue-400" />
            {destination} 行程路线预览
          </h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
            <X size={isElderlyMode ? 32 : 24} />
          </button>
        </div>

        <div className="p-4 bg-white/5 border-b border-white/10 flex gap-4">
          <button 
            onClick={() => setTransportMode('driving')}
            className={`${btnClass} rounded-xl font-medium transition-colors ${transportMode === 'driving' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            驾车路线
          </button>
          <button 
            onClick={() => setTransportMode('transit')}
            className={`${btnClass} rounded-xl font-medium transition-colors ${transportMode === 'transit' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            公交/地铁
          </button>
          <button 
            onClick={() => setTransportMode('walking')}
            className={`${btnClass} rounded-xl font-medium transition-colors ${transportMode === 'walking' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            步行路线
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          <div ref={mapContainerRef} className="flex-1 h-1/2 md:h-full bg-[#1a1a1a]" />
          
          <div className="w-full md:w-80 h-1/2 md:h-full overflow-y-auto bg-[#111] border-t md:border-t-0 md:border-l border-white/10">
            {error ? (
              <div className="p-6 text-red-400 text-center">{error}</div>
            ) : (
              <div id="route-panel" className="p-2 amap-panel-dark-override" style={{ filter: 'invert(0.9) hue-rotate(180deg)' }} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}