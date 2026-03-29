import { useState, useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { Search } from 'lucide-react';
import { addSearchToHistory } from '../lib/store';

interface StandaloneMapProps {
  initialQuery?: string;
}

export function StandaloneMap({ initialQuery }: StandaloneMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState(initialQuery || '');
  const [searchQuery, setSearchQuery] = useState(initialQuery || '餐厅'); // Default search
  const placeSearchRef = useRef<any>(null);

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
        } else {
          console.warn('VITE_AMAP_SECURITY_CODE is missing. Map tiles may not load.');
          setError('地图加载可能不完整：缺少高德地图安全密钥 (VITE_AMAP_SECURITY_CODE)，请在左侧 .env 文件中配置。');
        }

        const AMap = await AMapLoader.load({
          key: amapKey,
          version: '2.0',
          plugins: ['AMap.PlaceSearch', 'AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation'],
        });

        if (!mapContainerRef.current) return;

        map = new AMap.Map(mapContainerRef.current, {
          zoom: 16,
          viewMode: '3D',
          pitch: 45,
          // mapStyle: 'amap://styles/dark', // 移除暗色主题以显示更详细的地图图层
        });

        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar());

        // 添加精准定位插件
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true, // 是否使用高精度定位
          timeout: 10000,          // 超过10秒后停止定位
          buttonPosition: 'RB',    // 定位按钮的停靠位置
          buttonOffset: new AMap.Pixel(10, 20), // 定位按钮与设置的停靠位置的偏移量
          zoomToAccuracy: true,    // 定位成功后是否自动调整地图视野到定位点
          useNative: true,         // 是否使用安卓定位sdk用来进行定位，默认：false
          getCityWhenFail: true    // 定位失败之后是否返回基本城市定位信息
        });
        map.addControl(geolocation);
        
        // 初始化时自动定位
        geolocation.getCurrentPosition((status: string, result: any) => {
          if (status === 'complete') {
            console.log('定位成功', result);
            // 如果没有初始搜索词，就在定位成功后搜索周边
            if (!initialQuery) {
              placeSearchRef.current.searchNearBy('餐厅', result.position, 2000);
            }
          } else {
            console.warn('定位失败', result);
            // 如果定位失败，执行默认搜索
            if (!initialQuery) {
              placeSearchRef.current.search(searchQuery);
            }
          }
        });

        placeSearchRef.current = new AMap.PlaceSearch({
          map: map,
          panel: panelRef.current,
          autoFitView: true, // 搜索后自动调整视野
        });

        // 监听 marker 点击事件，使用自定义信息窗体覆盖默认行为
        placeSearchRef.current.on('markerClick', (e: any) => {
           if (e && e.data && e.data.location) {
              // 构造大众点评搜索链接
              const dianpingUrl = `https://www.dianping.com/search/keyword/1/0_${encodeURIComponent(e.data.name)}`;
              
              // 获取更多可用数据，高德 POI 数据中可能包含 tel, type, photos 等
              const tel = e.data.tel ? `<p style="margin: 4px 0; font-size: 13px; color: #333;">📞 电话：${e.data.tel}</p>` : '';
              const type = e.data.type ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">🏷️ 类型：${e.data.type}</p>` : '';
              const address = e.data.address ? `<p style="margin: 4px 0; font-size: 13px; color: #333;">📍 地址：${e.data.address}</p>` : '';
              
              let photosHtml = '';
              if (e.data.photos && e.data.photos.length > 0) {
                // 取第一张图片展示
                photosHtml = `<img src="${e.data.photos[0].url}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-top: 8px;" />`;
              }

              // 自定义信息窗体内容
              const infoContent = `
                <div style="padding: 4px; min-width: 220px; max-width: 300px; background: white;">
                  <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #333;">${e.data.name}</h4>
                  ${type}
                  ${address}
                  ${tel}
                  ${photosHtml}
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; text-align: center;">
                    <a href="${dianpingUrl}" target="_blank" rel="noopener noreferrer" 
                       style="display: inline-block; background-color: #f63; color: white !important; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: 500; transition: background 0.2s;">
                      去大众点评查看评价及详情 ↗
                    </a>
                  </div>
                </div>
              `;

              const infoWindow = new AMap.InfoWindow({
                  isCustom: false, // 使用默认的信息窗体外框，以确保箭头和关闭按钮正常显示
                  content: infoContent,
                  offset: new AMap.Pixel(0, -30)
              });

              // 关闭高德默认的 detail info window，打开我们自定义的
              setTimeout(() => {
                 map.clearInfoWindow();
                 infoWindow.open(map, e.data.location);
              }, 10);
           }
        });

        // 监听列表点击事件，点击列表项时自动放大并居中，同时触发上面的 marker 点击逻辑
        placeSearchRef.current.on('listElementClick', (e: any) => {
           if (e && e.data && e.data.location) {
              map.setZoomAndCenter(18, e.data.location); // 放大到更精细的级别
           }
        });

        // 如果有初始搜索词，直接搜索
        if (initialQuery) {
          placeSearchRef.current.search(searchQuery);
        }
      } catch (err: any) {
        console.error('Failed to load Amap:', err);
        setError(err.message || '加载地图失败，请检查 API Key 配置');
      }
    };

    initMap();

    return () => {
      if (map) {
        map.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (placeSearchRef.current && searchQuery) {
      placeSearchRef.current.search(searchQuery);
    }
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      setSearchQuery(keyword.trim());
      addSearchToHistory(keyword.trim());
    }
  };

  return (
    <div className="w-full h-full pt-20 md:pt-24 pb-12 px-4 md:px-6 flex flex-col max-w-6xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-light mb-6 md:mb-8 text-white/90 tracking-tight">地图探索</h2>
      
      <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden backdrop-blur-sm flex flex-col md:flex-row relative">
        {/* Map Area */}
        <div className="flex-1 relative min-h-[300px] md:min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0" />
          
          {/* Error Overlay */}
          {error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 md:p-6 rounded-xl md:rounded-2xl max-w-md text-center shadow-2xl">
                <p className="font-medium mb-2 text-sm md:text-base">{error}</p>
                <p className="text-xs md:text-sm text-red-400/80">请在 AI Studio 的设置 (Settings) 中添加环境变量 VITE_AMAP_KEY 和 VITE_AMAP_SECURITY_CODE。</p>
              </div>
            </div>
          )}
        </div>

        {/* Search Panel Overlay - Mobile Bottom / Desktop Right */}
        <div className="w-full md:w-[360px] bg-[#1a1a1a]/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/10 flex flex-col max-h-[50vh] md:max-h-none z-10 shrink-0">
          <div className="p-4 md:p-6 shrink-0">
            <form onSubmit={handleSearch} className="flex items-center bg-white/10 rounded-xl md:rounded-2xl p-2 md:p-3 border border-white/5 focus-within:border-blue-500/50 transition-colors">
              <Search size={18} className="text-white/40 ml-2 mr-3 shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索地点、餐厅或路线..."
                className="w-full bg-transparent text-white placeholder-white/40 focus:outline-none text-sm md:text-base"
              />
              <button
                type="submit"
                className="ml-2 px-3 md:px-4 py-1.5 md:py-2 bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl text-white text-xs md:text-sm font-medium transition-colors whitespace-nowrap"
              >
                搜索
              </button>
            </form>
          </div>
          
          <div 
            ref={panelRef} 
            className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 md:pb-6 custom-scrollbar amap-dark-panel"
            style={{ minHeight: '200px' }}
          ></div>
        </div>
      </div>
    </div>
  );
}
