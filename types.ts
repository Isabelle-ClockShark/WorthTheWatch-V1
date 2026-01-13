
export enum MediaType {
  MOVIE = 'movie',
  TV = 'tv'
}

export enum WatchStatus {
  PLANNING = 'planning',
  WATCHING = 'watching',
  COMPLETED = 'completed',
  DROPPED = 'dropped'
}

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  posterPath: string;
  year: number;
  genre: string[];
  description: string;
}

export interface UserProgress {
  mediaId: string;
  status: WatchStatus;
  progress: number; // For TV: current episode, For Movie: percentage
  totalEpisodes?: number;
  userRating?: number;
  lastUpdated: number;
}

export interface Recommendation {
  title: string;
  type: MediaType;
  reasoning: string;
  year: number;
  genre: string[];
}

export interface CombinedMediaProgress extends MediaItem {
  progressData: UserProgress;
}

export interface WeatherData {
  temp: number;
  condition: string;
  location: string;
  recommendation: string;
}

export interface DailyRelease {
  title: string;
  type: MediaType;
  platform: string;
  description: string;
  releaseTiming?: 'today' | 'this_week' | 'this_month';
}

export interface UserSettings {
  selectedServices: string[];
  filterByServices: boolean;
  declinedMediaTitles: string[];
}
