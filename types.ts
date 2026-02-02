export enum DifficultyLevel {
  BEGINNER = 'Principiante',
  INTERMEDIATE = 'Intermedio',
  ADVANCED = 'Avanzado'
}

export interface ClassItem {
  id: number;
  title: string;
  description: string;
  isCompleted?: boolean;
}

export interface Curriculum {
  language: string;
  level: DifficultyLevel;
  classes: ClassItem[];
}

export interface GeneratedLesson {
  title: string;
  content: string; // Markdown formatted content
}

export interface FavoriteClass {
  id: string; // Unique ID: language-level-title
  language: string;
  level: DifficultyLevel;
  classItem: ClassItem;
  addedAt: number;
}

export interface AppState {
  currentView: 'HOME' | 'CURRICULUM' | 'LESSON' | 'FAVORITES';
  selectedLanguage: string | null;
  selectedLevel: DifficultyLevel;
  curriculum: ClassItem[] | null;
  currentLesson: GeneratedLesson | null;
  isLoading: boolean;
  error: string | null;
}