
import React from 'react';
import { CombinedMediaProgress, WatchStatus, MediaType } from '../types';

interface MediaCardProps {
  item: CombinedMediaProgress;
  onUpdateProgress: (id: string, progress: number) => void;
  onUpdateStatus: (id: string, status: WatchStatus) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onUpdateProgress, onUpdateStatus }) => {
  const isTV = item.type === MediaType.TV;

  return (
    <div className="group relative glass rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/20">
      <div className="aspect-[2/3] relative overflow-hidden">
        <img 
          src={item.posterPath} 
          alt={item.title} 
          className="w-full h-full object-cover transition-transform group-hover:scale-110"
        />
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            item.type === MediaType.MOVIE ? 'bg-amber-500/90 text-black' : 'bg-blue-500/90 text-white'
          }`}>
            {item.type}
          </span>
          <span className="bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
            {item.year}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 truncate">{item.title}</h3>
        <p className="text-slate-400 text-xs mb-3 line-clamp-1">{item.genre.join(', ')}</p>
        
        {/* Progress Tracker */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-medium">
            <span>{item.progressData.status === WatchStatus.COMPLETED ? 'COMPLETED' : 'PROGRESS'}</span>
            <span>{isTV ? `Ep ${item.progressData.progress} / ${item.totalEpisodes || '?'}` : `${item.progressData.progress}%`}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500" 
              style={{ width: `${isTV ? (item.progressData.progress / (item.totalEpisodes || 1)) * 100 : item.progressData.progress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={() => onUpdateProgress(item.id, item.progressData.progress + (isTV ? 1 : 5))}
             disabled={item.progressData.status === WatchStatus.COMPLETED}
             className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white text-xs font-bold py-2 rounded transition-colors"
           >
             {isTV ? '+1 Episode' : '+5%'}
           </button>
           <select 
             value={item.progressData.status}
             onChange={(e) => onUpdateStatus(item.id, e.target.value as WatchStatus)}
             className="bg-slate-800 text-white text-xs px-2 rounded outline-none border border-slate-700"
           >
              {Object.values(WatchStatus).map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
           </select>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
