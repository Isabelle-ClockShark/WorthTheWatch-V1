
import React, { useState, useEffect, useMemo } from 'react';
import { 
  MediaItem, 
  MediaType, 
  WatchStatus, 
  UserProgress, 
  CombinedMediaProgress, 
  Recommendation,
  WeatherData,
  DailyRelease,
  UserSettings
} from './types';
import { INITIAL_MOCK_MEDIA } from './constants';
import { 
  getAiRecommendations, 
  searchNewMedia, 
  getDailyReleases, 
  getWeatherWatchPlan,
  getHolidayRecommendations
} from './services/geminiService';
import Navbar from './components/Navbar';
import MediaCard from './components/MediaCard';

const STREAMING_SERVICES = [
  'Netflix', 'HBO Max', 'Disney+', 'Hulu', 'Amazon Prime', 'Apple TV+', 'Paramount+', 'Peacock', 'Crunchyroll'
];

interface Holiday {
  name: string;
  icon: string;
  month: number; 
  day: number;
  color: string;
  activeColor: string;
}

const ALL_HOLIDAYS: Holiday[] = [
  { name: 'New Year', icon: '🎇', month: 0, day: 1, color: 'hover:bg-indigo-600', activeColor: 'bg-indigo-600' },
  { name: 'Valentines', icon: '💖', month: 1, day: 14, color: 'hover:bg-pink-600', activeColor: 'bg-pink-600' },
  { name: 'Oscars', icon: '🏆', month: 2, day: 10, color: 'hover:bg-amber-600', activeColor: 'bg-amber-600' },
  { name: 'Easter', icon: '🐰', month: 3, day: 20, color: 'hover:bg-emerald-600', activeColor: 'bg-emerald-600' },
  { name: 'Summer Hits', icon: '🏖️', month: 5, day: 21, color: 'hover:bg-yellow-600', activeColor: 'bg-yellow-600' },
  { name: 'Independence Day', icon: '🇺🇸', month: 6, day: 4, color: 'hover:bg-blue-700', activeColor: 'bg-blue-700' },
  { name: 'Halloween', icon: '🎃', month: 9, day: 31, color: 'hover:bg-orange-600', activeColor: 'bg-orange-600' },
  { name: 'Thanksgiving', icon: '🦃', month: 10, day: 25, color: 'hover:bg-amber-800', activeColor: 'bg-amber-800' },
  { name: 'Christmas', icon: '🎄', month: 11, day: 25, color: 'hover:bg-red-600', activeColor: 'bg-red-600' },
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'library' | 'ai'>('dashboard');
  const [showAccountModal, setShowAccountModal] = useState(false);
  
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('worth-the-watch-settings');
    if (saved) return JSON.parse(saved);
    return {
      selectedServices: ['Netflix', 'Disney+'],
      filterByServices: false,
      declinedMediaTitles: [],
      isDarkMode: true
    };
  });

  const [mediaList, setMediaList] = useState<MediaItem[]>(INITIAL_MOCK_MEDIA);
  const [userProgress, setUserProgress] = useState<UserProgress[]>(() => {
    const saved = localStorage.getItem('worth-the-watch-progress');
    if (saved) return JSON.parse(saved);
    return INITIAL_MOCK_MEDIA.map(m => ({
      mediaId: m.id,
      status: WatchStatus.WATCHING,
      progress: m.type === MediaType.MOVIE ? 15 : 2,
      totalEpisodes: m.type === MediaType.TV ? 10 : undefined,
      lastUpdated: Date.now()
    }));
  });

  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[]>([]);
  const [dailyReleases, setDailyReleases] = useState<DailyRelease[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [holidayRecs, setHolidayRecs] = useState<Recommendation[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isHolidayLoading, setIsHolidayLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reorder holidays based on what is coming next
  const sortedHolidays = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const sorted = [...ALL_HOLIDAYS].sort((a, b) => {
      const aComingThisYear = (a.month > currentMonth) || (a.month === currentMonth && a.day >= currentDay);
      const bComingThisYear = (b.month > currentMonth) || (b.month === currentMonth && b.day >= currentDay);

      if (aComingThisYear && !bComingThisYear) return -1;
      if (!aComingThisYear && bComingThisYear) return 1;

      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    });

    return sorted;
  }, []);

  // Filter and sort releases
  const filteredReleases = useMemo(() => {
    let list = dailyReleases;
    
    // Apply service filter if enabled
    if (userSettings.filterByServices) {
      list = list.filter(release => 
        userSettings.selectedServices.some(service => 
          release.platform.toLowerCase().includes(service.toLowerCase())
        )
      );
    }

    // Order: today -> this_week -> this_month
    const order = { 'today': 0, 'this_week': 1, 'this_month': 2 };
    return [...list].sort((a, b) => {
      const aVal = order[a.releaseTiming || 'this_month'];
      const bVal = order[b.releaseTiming || 'this_month'];
      return aVal - bVal;
    });
  }, [dailyReleases, userSettings]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('worth-the-watch-progress', JSON.stringify(userProgress));
  }, [userProgress]);

  useEffect(() => {
    localStorage.setItem('worth-the-watch-settings', JSON.stringify(userSettings));
  }, [userSettings]);

  // Initial Data Fetching
  useEffect(() => {
    const initData = async () => {
      const { releases } = await getDailyReleases();
      setDailyReleases(releases);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const mockConditions = ["Sunny", "Rainy", "Cloudy", "Snowing", "Stormy"];
          const condition = mockConditions[Math.floor(Math.random() * mockConditions.length)];
          const temp = Math.floor(Math.random() * 63) + 32;
          const recommendation = await getWeatherWatchPlan(condition, temp);
          
          setWeather({
            temp,
            condition,
            location: "Current Location",
            recommendation
          });
        });
      }
    };
    initData();
  }, []);

  const combinedLibrary: CombinedMediaProgress[] = mediaList.map(m => {
    const prog = userProgress.find(p => p.mediaId === m.id) || {
      mediaId: m.id,
      status: WatchStatus.PLANNING,
      progress: 0,
      lastUpdated: Date.now()
    };
    return { ...m, progressData: prog };
  });

  const handleUpdateProgress = (id: string, newProgress: number) => {
    setUserProgress(prev => prev.map(p => {
      if (p.mediaId === id) {
        let finalProgress = newProgress;
        const media = mediaList.find(m => m.id === id);
        if (media?.type === MediaType.MOVIE && finalProgress > 100) finalProgress = 100;
        if (media?.type === MediaType.TV && p.totalEpisodes && finalProgress > p.totalEpisodes) finalProgress = p.totalEpisodes;
        
        return { 
          ...p, 
          progress: finalProgress, 
          status: finalProgress === (media?.type === MediaType.MOVIE ? 100 : p.totalEpisodes) ? WatchStatus.COMPLETED : p.status,
          lastUpdated: Date.now() 
        };
      }
      return p;
    }));
  };

  const handleUpdateStatus = (id: string, status: WatchStatus) => {
    setUserProgress(prev => prev.map(p => p.mediaId === id ? { ...p, status, lastUpdated: Date.now() } : p));
  };

  const generateRecommendations = async () => {
    setIsAiLoading(true);
    const recs = await getAiRecommendations(combinedLibrary, userSettings.declinedMediaTitles);
    setAiRecommendations(recs);
    setIsAiLoading(false);
  };

  const fetchHolidayRecs = async (holiday: string) => {
    setIsHolidayLoading(true);
    setSelectedHoliday(holiday);
    const recs = await getHolidayRecommendations(holiday);
    setHolidayRecs(recs);
    setIsHolidayLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchNewMedia(searchQuery);
    setSearchResults(results.map(r => ({
        ...r,
        posterPath: r.posterPath || `https://picsum.photos/seed/${r.title}/400/600`
    })));
    setIsSearching(false);
  };

  const addToLibrary = (item: MediaItem) => {
    if (mediaList.find(m => m.id === item.id)) return;
    setMediaList(prev => [...prev, item]);
    setUserProgress(prev => [...prev, {
        mediaId: item.id,
        status: WatchStatus.PLANNING,
        progress: 0,
        totalEpisodes: item.type === MediaType.TV ? 12 : undefined,
        lastUpdated: Date.now()
    }]);
  };

  const toggleService = (service: string) => {
    setUserSettings(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(service)
        ? prev.selectedServices.filter(s => s !== service)
        : [...prev.selectedServices, service]
    }));
  };

  const declineRecommendation = (title: string) => {
    setUserSettings(prev => ({
      ...prev,
      declinedMediaTitles: [...new Set([...prev.declinedMediaTitles, title])]
    }));
    // Filter out of current UI list
    setAiRecommendations(prev => prev.filter(r => r.title !== title));
  };

  const resetDeclinedItems = () => {
    setUserSettings(prev => ({ ...prev, declinedMediaTitles: [] }));
  };

  return (
    <div className={`min-h-screen pb-20 relative transition-colors duration-300 ${
      userSettings.isDarkMode 
        ? 'text-slate-100' 
        : 'text-slate-900 bg-white'
    }`}>
      <Navbar 
        onNavigate={setActiveView} 
        activeView={activeView} 
        onOpenAccount={() => setShowAccountModal(true)}
        isDarkMode={userSettings.isDarkMode}
      />

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className={`absolute inset-0 backdrop-blur-sm transition-colors duration-300 ${
            userSettings.isDarkMode ? 'bg-black/60' : 'bg-black/40'
          }`} onClick={() => setShowAccountModal(false)} />
          <div className={`relative glass w-full max-w-xl p-8 rounded-[2.5rem] shadow-2xl border animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] transition-colors duration-300 ${
            userSettings.isDarkMode 
              ? 'border-white/10' 
              : 'border-slate-300 bg-slate-50'
          }`}>
            <button 
              onClick={() => setShowAccountModal(false)}
              className={`absolute top-6 right-6 transition-colors p-2 ${
                userSettings.isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h2 className={`text-3xl font-bold mb-6 flex items-center gap-3 transition-colors duration-300 ${
              userSettings.isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <span className="p-2 bg-indigo-600 rounded-xl">👤</span>
              My Account
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 transition-colors duration-300 ${
                  userSettings.isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>Your Services</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {STREAMING_SERVICES.map(service => (
                    <button
                      key={service}
                      onClick={() => toggleService(service)}
                      className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                        userSettings.selectedServices.includes(service)
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                          : userSettings.isDarkMode
                          ? 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/20'
                          : 'bg-slate-200 border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
                userSettings.isDarkMode
                  ? 'bg-slate-800/40 border-white/5'
                  : 'bg-slate-100 border-slate-300'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className={`font-bold mb-1 transition-colors duration-300 ${
                      userSettings.isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>Service Filter</h4>
                    <p className={`text-xs transition-colors duration-300 ${
                      userSettings.isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>Only show releases from your selected services in "New Today".</p>
                  </div>
                  <button 
                    onClick={() => setUserSettings(prev => ({ ...prev, filterByServices: !prev.filterByServices }))}
                    className={`relative w-14 h-8 rounded-full transition-all ${
                      userSettings.filterByServices ? 'bg-indigo-600' : userSettings.isDarkMode ? 'bg-slate-700' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full transition-all ${
                      userSettings.isDarkMode ? 'bg-white' : 'bg-slate-50'
                    } ${
                      userSettings.filterByServices ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
                userSettings.isDarkMode
                  ? 'bg-slate-800/40 border-white/5'
                  : 'bg-slate-100 border-slate-300'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className={`font-bold mb-1 transition-colors duration-300 ${
                      userSettings.isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>Dark Mode</h4>
                    <p className={`text-xs transition-colors duration-300 ${
                      userSettings.isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>Switch between light and dark theme.</p>
                  </div>
                  <button 
                    onClick={() => setUserSettings(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }))}
                    className={`relative w-14 h-8 rounded-full transition-all ${
                      userSettings.isDarkMode ? 'bg-indigo-600' : 'bg-slate-400'
                    }`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full transition-all ${
                      userSettings.isDarkMode ? 'bg-white' : 'bg-slate-50'
                    } ${
                      userSettings.isDarkMode ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              {userSettings.declinedMediaTitles.length > 0 && (
                <div className={`p-6 rounded-3xl border transition-colors duration-300 ${
                  userSettings.isDarkMode
                    ? 'bg-slate-800/40 border-white/5'
                    : 'bg-slate-100 border-slate-300'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h4 className={`font-bold transition-colors duration-300 ${
                      userSettings.isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>Improve Recommendations</h4>
                    <button 
                      onClick={resetDeclinedItems}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                    >
                      Reset All
                    </button>
                  </div>
                  <p className={`text-xs mb-4 transition-colors duration-300 ${
                    userSettings.isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>You've declined {userSettings.declinedMediaTitles.length} items. We're using this to refine your matches.</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 no-scrollbar">
                    {userSettings.declinedMediaTitles.map(t => (
                      <span key={t} className={`px-2 py-1 rounded text-[10px] border transition-colors duration-300 ${
                        userSettings.isDarkMode
                          ? 'bg-slate-900/60 text-slate-500 border-white/5'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowAccountModal(false)}
                className={`w-full font-black py-4 rounded-2xl transition-all shadow-xl uppercase tracking-widest text-sm ${
                  userSettings.isDarkMode
                    ? 'bg-white text-black hover:bg-indigo-50'
                    : 'bg-slate-900 text-white hover:bg-indigo-600'
                }`}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 pt-32">
        {activeView === 'dashboard' && (
          <section className="space-y-12">
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-4xl font-extrabold mb-2 text-white">WorthTheWatch.</h2>
                <p className="text-slate-400">Welcome back! You have {combinedLibrary.filter(i => i.progressData.status === WatchStatus.WATCHING).length} items in your active watch list.</p>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto self-start">
                <input 
                  type="text" 
                  placeholder="Search movies/TV..." 
                  className="glass px-4 py-3 rounded-xl outline-none w-full md:w-64 focus:ring-2 focus:ring-indigo-500 transition-all text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap text-white"
                >
                  {isSearching ? '...' : 'Search'}
                </button>
              </form>
            </header>

            {/* Combined Releases Section (New Today + New This Week + New This Month) */}
            {filteredReleases.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <span className="w-2 h-8 bg-pink-500 rounded-full"></span>
                    New Releases
                  </h3>
                  {userSettings.filterByServices && (
                    <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 uppercase tracking-widest">
                      Filtered by your services
                    </span>
                  )}
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {filteredReleases.map((release, i) => (
                    <div key={i} className="min-w-[280px] glass p-4 rounded-2xl border border-white/5 hover:border-pink-500/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          release.releaseTiming === 'today' 
                            ? 'bg-pink-500/20 text-pink-400' 
                            : release.releaseTiming === 'this_week'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {release.releaseTiming === 'today' ? 'New Today' : release.releaseTiming === 'this_week' ? 'This Week' : 'This Month'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{release.platform}</span>
                      </div>
                      <h4 className="font-bold text-white mb-1">{release.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{release.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weather Component */}
            {weather && (
              <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                  Atmospheric Watch
                </h3>
                <div className="glass p-6 rounded-3xl flex items-center gap-6 border-l-4 border-indigo-500 w-full animate-in fade-in slide-in-from-left-4 duration-700">
                  <div className="text-5xl">
                    {weather.condition === 'Sunny' ? '☀️' : weather.condition === 'Rainy' ? '🌧️' : '☁️'}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-indigo-400 uppercase tracking-tighter mb-1">{weather.condition} • {weather.temp}°F</p>
                    <p className="text-slate-200 text-lg font-medium leading-relaxed">"{weather.recommendation}"</p>
                  </div>
                </div>
              </div>
            )}

            {searchResults.length > 0 && (
                <div className="p-6 rounded-2xl glass border-2 border-indigo-500/30">
                    <div className="flex justify-between mb-4">
                        <h3 className="text-xl font-bold">Search Results</h3>
                        <button onClick={() => setSearchResults([])} className="text-slate-400 text-sm hover:text-white underline font-medium">Clear results</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {searchResults.map(item => (
                            <div key={item.id} className="relative group rounded-xl overflow-hidden glass h-56 shadow-lg">
                                <img src={item.posterPath} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/80 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="font-bold text-sm mb-2 leading-tight">{item.title}</p>
                                    <p className="text-[10px] text-slate-400 mb-4">{item.year}</p>
                                    <button 
                                        onClick={() => addToLibrary(item)}
                                        className="bg-white text-black text-[10px] font-bold py-2 px-3 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors"
                                    >
                                        Add to Library
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                Continue Watching
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {combinedLibrary
                  .filter(i => i.progressData.status === WatchStatus.WATCHING)
                  .sort((a, b) => b.progressData.lastUpdated - a.progressData.lastUpdated)
                  .map(item => (
                    <MediaCard 
                      key={item.id} 
                      item={item} 
                      onUpdateProgress={handleUpdateProgress}
                      onUpdateStatus={handleUpdateStatus}
                    />
                  ))
                }
                {combinedLibrary.filter(i => i.progressData.status === WatchStatus.WATCHING).length === 0 && (
                   <div className="col-span-full py-12 text-center glass rounded-2xl border-dashed border-2 border-white/5">
                      <p className="text-slate-500">No active watches. Find something new to start!</p>
                   </div>
                )}
              </div>
            </div>

            <div className="glass p-8 rounded-3xl flex flex-col items-center text-center gap-4 bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
               <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center text-4xl shadow-lg shadow-indigo-500/40 transform rotate-6">✨</div>
               <div>
                 <h4 className="text-2xl font-bold mb-2">AI-Powered Recommendations</h4>
                 <p className="text-slate-400 max-w-md">Let Gemini analyze your habits and find the perfect match for you.</p>
               </div>
               <button 
                 onClick={() => { setActiveView('ai'); generateRecommendations(); }}
                 className="mt-2 bg-white text-indigo-900 hover:bg-indigo-50 px-8 py-3 rounded-full font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
               >
                 Go to Insights
               </button>
            </div>

            <div className="space-y-6 pt-12 border-t border-white/5">
               <h3 className="text-2xl font-bold flex items-center gap-3">
                  <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
                  Holiday Specials
                </h3>
                <p className="text-slate-400 text-sm">Sorted by upcoming dates.</p>
                <div className="flex flex-wrap gap-3">
                  {sortedHolidays.map(h => (
                    <button
                      key={h.name}
                      onClick={() => fetchHolidayRecs(h.name)}
                      className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border border-white/5 ${
                        selectedHoliday === h.name ? `${h.activeColor} shadow-lg shadow-white/10` : `glass ${h.color}`
                      }`}
                    >
                      <span>{h.icon}</span>
                      <span>{h.name}</span>
                    </button>
                  ))}
                </div>

                {selectedHoliday && (
                  <div className="mt-6 p-6 rounded-3xl glass border border-indigo-500/20 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-xl font-bold flex items-center gap-2">
                         Perfect for {selectedHoliday}
                      </h4>
                      <button onClick={() => {setSelectedHoliday(null); setHolidayRecs([]);}} className="text-slate-400 text-sm hover:text-white">Close Specials</button>
                    </div>
                    
                    {isHolidayLoading ? (
                      <div className="flex items-center justify-center py-12">
                         <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {holidayRecs.map((rec, i) => (
                          <div key={i} className="glass rounded-2xl overflow-hidden group border border-white/5 hover:border-white/20 transition-all">
                             <div className="aspect-[16/9] relative">
                                <img src={`https://picsum.photos/seed/holiday-${rec.title}/400/225`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                                   <span className="text-[10px] text-indigo-300 font-bold uppercase mb-1">{rec.type} • {rec.year}</span>
                                   <h5 className="font-bold text-sm truncate">{rec.title}</h5>
                                </div>
                             </div>
                             <div className="p-4 bg-slate-900/40">
                                <p className="text-[11px] text-slate-300 line-clamp-2 italic mb-3">"{rec.reasoning}"</p>
                                <button 
                                  onClick={() => addToLibrary({
                                      id: `holiday-${i}-${Date.now()}`,
                                      title: rec.title,
                                      type: rec.type,
                                      year: rec.year,
                                      genre: rec.genre,
                                      description: rec.reasoning,
                                      posterPath: `https://picsum.photos/seed/${rec.title}/400/600`
                                  })}
                                  className="w-full bg-white text-black py-2 rounded-lg text-xs font-black uppercase hover:bg-indigo-500 hover:text-white transition-all"
                                >
                                  Add to Watchlist
                                </button>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </section>
        )}

        {activeView === 'library' && (
          <section className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-3xl font-bold text-white">My Library</h2>
              <div className="flex gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                <button className="px-5 py-2 rounded-lg bg-indigo-600 text-xs font-bold shadow-lg text-white">All Media</button>
                <button className="px-5 py-2 rounded-lg hover:bg-slate-700 text-xs font-bold text-slate-400 transition-colors">Movies</button>
                <button className="px-5 py-2 rounded-lg hover:bg-slate-700 text-xs font-bold text-slate-400 transition-colors">TV Shows</button>
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {combinedLibrary.map(item => (
                <MediaCard 
                  key={item.id} 
                  item={item} 
                  onUpdateProgress={handleUpdateProgress}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          </section>
        )}

        {activeView === 'ai' && (
          <section className="space-y-12">
            <header className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4">Gemini Intelligence</div>
              <h2 className="text-5xl font-extrabold tracking-tight text-white">Worth The Watch.</h2>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Deep Taste Analysis</h1>
              <p className="text-slate-400 text-lg leading-relaxed">
                We've combined your history with global trends to find gems that are actually worth your time.
              </p>
              <button 
                onClick={generateRecommendations}
                disabled={isAiLoading}
                className={`inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold transition-all shadow-lg ${
                    isAiLoading ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                }`}
              >
                {isAiLoading ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        Thinking...
                    </>
                ) : 'Refresh Analysis'}
              </button>
            </header>

            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-8">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute top-0 w-24 h-24 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-indigo-400 text-xl font-bold">Scanning Global Databases</p>
                    <p className="text-slate-500 text-sm">Mapping your taste profile...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {aiRecommendations.length === 0 && (
                  <div className="col-span-full py-20 text-center glass rounded-3xl">
                    <p className="text-slate-400 italic">No recommendations yet. Click "Refresh Analysis" to start.</p>
                  </div>
                )}
                {aiRecommendations.map((rec, idx) => (
                  <div key={idx} className="glass p-8 rounded-[2rem] border border-white/5 flex flex-col md:flex-row gap-8 hover:border-indigo-500/40 transition-all group shadow-xl relative">
                    <button 
                      onClick={() => declineRecommendation(rec.title)}
                      className="absolute top-6 right-6 p-2 rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all z-10"
                      title="Not interested"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="w-full md:w-2/5 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl relative">
                      <img src={`https://picsum.photos/seed/${rec.title}/400/600`} alt={rec.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                    </div>
                    <div className="flex-1 space-y-5">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">{rec.type}</span>
                        <span className="text-slate-400 text-xs font-bold">{rec.year}</span>
                      </div>
                      <h3 className="text-3xl font-bold leading-tight group-hover:text-indigo-400 transition-colors text-white">{rec.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        {rec.genre.map(g => (
                          <span key={g} className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded-md text-slate-300 font-medium">{g}</span>
                        ))}
                      </div>
                      <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20">
                        <p className="text-sm italic text-indigo-100/90 leading-relaxed font-medium">
                          "{rec.reasoning}"
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => addToLibrary({
                              id: `ai-${idx}-${Date.now()}`,
                              title: rec.title,
                              type: rec.type,
                              year: rec.year,
                              genre: rec.genre,
                              description: rec.reasoning,
                              posterPath: `https://picsum.photos/seed/${rec.title}/400/600`
                          })}
                          className="flex-1 bg-white text-black hover:bg-indigo-500 hover:text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-black/20"
                        >
                          Add to Watchlist
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-[10px] text-slate-600 bg-slate-950/90 backdrop-blur border-t border-white/5 uppercase tracking-[0.2em]">
        WorthTheWatch Intelligence Engine • v2.7 • Weekly Releases Integrated
      </footer>
    </div>
  );
};

export default App;
