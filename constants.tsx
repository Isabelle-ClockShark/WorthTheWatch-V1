
import { MediaItem, MediaType, WatchStatus } from './types';

export const INITIAL_MOCK_MEDIA: MediaItem[] = [
  {
    id: 'm1',
    title: 'Inception',
    type: MediaType.MOVIE,
    posterPath: 'https://picsum.photos/seed/inception/400/600',
    year: 2010,
    genre: ['Sci-Fi', 'Action'],
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.'
  },
  {
    id: 't1',
    title: 'The Bear',
    type: MediaType.TV,
    posterPath: 'https://picsum.photos/seed/thebear/400/600',
    year: 2022,
    genre: ['Drama', 'Comedy'],
    description: 'A young chef from the fine dining world returns to Chicago to run his family sandwich shop.'
  },
  {
    id: 'm2',
    title: 'Spider-Man: Across the Spider-Verse',
    type: MediaType.MOVIE,
    posterPath: 'https://picsum.photos/seed/spiderman/400/600',
    year: 2023,
    genre: ['Animation', 'Action', 'Adventure'],
    description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.'
  },
  {
    id: 't2',
    title: 'Succession',
    type: MediaType.TV,
    posterPath: 'https://picsum.photos/seed/succession/400/600',
    year: 2018,
    genre: ['Drama'],
    description: 'The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their father steps down from the company.'
  }
];

export const GENRES = [
  'Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Horror', 'Romance', 'Fantasy', 'Animation', 'Documentary'
];
