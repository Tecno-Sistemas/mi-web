import React, { useState, useEffect, useRef } from 'react';
import { DifficultyLevel, ClassItem, GeneratedLesson, FavoriteClass } from './types';
import { POPULAR_LANGUAGES, ICONS, CHANNEL_NAME } from './constants';
import { YouTubeCTA } from './components/YouTubeCTA';
import { generateCurriculum, generateLessonContent } from './services/geminiService';
import { MarkdownRenderer } from './components/MarkdownRenderer';

const App: React.FC = () => {
  // State
  const [currentView, setCurrentView] = useState<'HOME' | 'CURRICULUM' | 'LESSON' | 'FAVORITES'>('HOME');
  const [returnToView, setReturnToView] = useState<'CURRICULUM' | 'FAVORITES'>('CURRICULUM');
  
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>(DifficultyLevel.BEGINNER);
  const [customLanguage, setCustomLanguage] = useState('');
  
  const [curriculum, setCurriculum] = useState<ClassItem[]>([]);
  const [currentLesson, setCurrentLesson] = useState<GeneratedLesson | null>(null);
  
  const [favorites, setFavorites] = useState<FavoriteClass[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Refs to handle cancellation
  const abortControllerRef = useRef<boolean>(false);

  // Storage Helpers
  const getStorageKey = (lang: string, level: string) => `curriculum-${lang}-${level}`;

  const saveCurriculumToStorage = (lang: string, level: DifficultyLevel, data: ClassItem[]) => {
    localStorage.setItem(getStorageKey(lang, level), JSON.stringify(data));
  };

  const getCurriculumFromStorage = (lang: string, level: DifficultyLevel): ClassItem[] | null => {
    const data = localStorage.getItem(getStorageKey(lang, level));
    return data ? JSON.parse(data) : null;
  };

  const clearHistory = () => {
    if (window.confirm("¿Estás seguro de que deseas eliminar todo el historial de progreso?")) {
      localStorage.clear();
      setCurriculum([]);
      setFavorites([]);
      setSelectedLanguage(null);
      setCurrentView('HOME');
      if (selectedLanguage) {
        setCurriculum([]); 
      }
    }
  };

  // Favorites Helpers
  useEffect(() => {
    const savedFavs = localStorage.getItem('eltecno-favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error("Error loading favorites", e);
      }
    }
  }, []);

  const saveFavorites = (favs: FavoriteClass[]) => {
    setFavorites(favs);
    localStorage.setItem('eltecno-favorites', JSON.stringify(favs));
  };

  const getCompositeId = (lang: string, level: string, title: string) => `${lang}-${level}-${title}`;

  const toggleFavorite = (e: React.MouseEvent, item: ClassItem, lang: string, level: DifficultyLevel) => {
    e.stopPropagation(); // Prevent card click
    const compositeId = getCompositeId(lang, level, item.title);
    const exists = favorites.find(f => f.id === compositeId);

    if (exists) {
      saveFavorites(favorites.filter(f => f.id !== compositeId));
    } else {
      saveFavorites([...favorites, {
        id: compositeId,
        language: lang,
        level: level,
        classItem: item,
        addedAt: Date.now()
      }]);
    }
  };

  const isFavorite = (title: string, lang: string, level: DifficultyLevel) => {
    return favorites.some(f => f.id === getCompositeId(lang, level, title));
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handlers
  const handleLanguageSelect = (lang: string) => {
    setSelectedLanguage(lang);
    setCurriculum([]); // Clear previous curriculum
    setError(null);
    setCurrentView('CURRICULUM');
    
    // Check storage first
    const savedData = getCurriculumFromStorage(lang, selectedLevel);
    if (savedData && savedData.length > 0) {
      setCurriculum(savedData);
    } else {
      fetchCurriculum(lang, selectedLevel);
    }
  };

  const handleCustomLanguageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLanguage.trim()) {
      handleLanguageSelect(customLanguage.trim());
    }
  };

  const handleLevelChange = (level: DifficultyLevel) => {
    setSelectedLevel(level);
    if (selectedLanguage) {
      // Check storage for new level
      const savedData = getCurriculumFromStorage(selectedLanguage, level);
      if (savedData && savedData.length > 0) {
        setCurriculum(savedData);
      } else {
        fetchCurriculum(selectedLanguage, level);
      }
    }
  };

  const cancelLoading = () => {
    abortControllerRef.current = true;
    setIsLoading(false);
    if (currentView === 'LESSON' && !currentLesson) {
       setCurrentView(returnToView);
    } else if (currentView === 'CURRICULUM' && !curriculum.length) {
       setCurrentView('HOME');
       setSelectedLanguage(null);
    }
  };

  const fetchCurriculum = async (lang: string, level: DifficultyLevel) => {
    abortControllerRef.current = false;
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateCurriculum(lang, level);
      if (!abortControllerRef.current) {
        setCurriculum(data);
        saveCurriculumToStorage(lang, level, data);
      }
    } catch (err) {
      if (!abortControllerRef.current) {
        setError("No se pudo generar el plan de estudios. Por favor verifica tu conexión o intenta de nuevo.");
      }
    } finally {
      if (!abortControllerRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleClassSelect = async (classItem: ClassItem, origin: 'CURRICULUM' | 'FAVORITES', lang: string, level: DifficultyLevel) => {
    abortControllerRef.current = false;
    setIsLoading(true);
    setError(null);
    
    // Set context if coming from favorites
    if (origin === 'FAVORITES') {
      setSelectedLanguage(lang);
      setSelectedLevel(level);
    }

    setReturnToView(origin);
    setCurrentView('LESSON');
    
    try {
      const lessonData = await generateLessonContent(lang, level, classItem.title);
      if (!abortControllerRef.current) {
        setCurrentLesson(lessonData);
      }
    } catch (err) {
      if (!abortControllerRef.current) {
        setError("Error al cargar la clase. Intenta nuevamente.");
        setCurrentView(origin);
      }
    } finally {
      if (!abortControllerRef.current) {
        setIsLoading(false);
      }
    }
  };

  const goBack = () => {
    if (currentView === 'LESSON') {
      setCurrentView(returnToView);
      setCurrentLesson(null);
    } else if (currentView === 'CURRICULUM') {
      setCurrentView('HOME');
      setSelectedLanguage(null);
      setCurriculum([]);
    } else if (currentView === 'FAVORITES') {
      setCurrentView('HOME');
    }
  };

  const completeLesson = () => {
    // Only mark as completed if we are in the context of the current curriculum
    // If accessed via favorites, we might not have the full curriculum loaded in state
    // But we should try to update storage if possible.
    
    if (currentLesson && selectedLanguage) {
      // Update in current loaded curriculum if matches
      if (curriculum.length > 0) {
        const updatedCurriculum = curriculum.map(c => {
          if (c.title === currentLesson.title) {
            return { ...c, isCompleted: true };
          }
          return c;
        });
        setCurriculum(updatedCurriculum);
        saveCurriculumToStorage(selectedLanguage, selectedLevel, updatedCurriculum);
      } else {
        // If curriculum not loaded (e.g. from Favorites), try to load from storage, update, and save back
        const stored = getCurriculumFromStorage(selectedLanguage, selectedLevel);
        if (stored) {
           const updatedStored = stored.map(c => {
             if (c.title === currentLesson.title) return { ...c, isCompleted: true };
             return c;
           });
           saveCurriculumToStorage(selectedLanguage, selectedLevel, updatedStored);
        }
      }
    }
    setCurrentView(returnToView);
    setCurrentLesson(null);
  };

  // Render Functions
  const renderHeader = () => (
    <header className="py-4 md:py-6 border-b border-dark-800 bg-dark-950 sticky top-0 z-40">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentView('HOME'); setSelectedLanguage(null); }}>
          <div className="text-brand-500 w-8 h-8" dangerouslySetInnerHTML={{__html: ICONS.CODE}} />
          <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-purple-500 text-center md:text-left">
            {CHANNEL_NAME} Academy
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
          {currentView === 'HOME' && (
             <>
               <button 
                 onClick={() => setCurrentView('FAVORITES')}
                 className="flex items-center gap-2 text-sm text-gray-300 hover:text-brand-400 border border-gray-800 hover:border-brand-500/50 bg-dark-900 px-3 py-1.5 rounded-full transition-all"
               >
                 <div className="w-4 h-4 text-red-500" dangerouslySetInnerHTML={{__html: ICONS.HEART_FILLED}} />
                 Favoritos
               </button>
               <button 
                 onClick={clearHistory}
                 className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:bg-red-900/20 px-3 py-1.5 rounded-full transition-colors"
               >
                 Borrar Todo
               </button>
             </>
          )}

          {currentView !== 'HOME' && (
            <button 
              onClick={goBack} 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
               <div className="w-4 h-4" dangerouslySetInnerHTML={{__html: ICONS.BACK}} />
               Volver
            </button>
          )}
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <div className="text-center mb-10 md:mb-16">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-4 md:mb-6 tracking-tight leading-tight">
          Aprende a programar <br className="md:hidden" /><span className="text-brand-500">cualquier cosa</span>
        </h2>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-2">
          Selecciona un lenguaje o escribe el que quieras aprender. Nuestra IA generará un curso personalizado para ti.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <h3 className="text-gray-300 font-semibold mb-4 ml-1 uppercase text-xs tracking-wider">Lenguajes Populares</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {POPULAR_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageSelect(lang)}
              className="bg-dark-800 hover:bg-brand-600 hover:text-white text-gray-200 py-3 md:py-4 px-4 md:px-6 rounded-xl font-mono font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-1 border border-dark-800 hover:border-brand-400 text-sm md:text-base"
            >
              {lang}
            </button>
          ))}
        </div>

        <div className="mt-8 md:mt-12 bg-dark-800 p-6 md:p-8 rounded-2xl border border-gray-800 relative overflow-hidden">
          <h3 className="text-lg md:text-xl font-bold mb-4">¿Buscas otro lenguaje?</h3>
          <form onSubmit={handleCustomLanguageSubmit} className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Ej: Cobol, Haskell, Lua..."
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              className="flex-1 bg-dark-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 z-10 w-full"
            />
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg font-bold transition-colors z-10 w-full sm:w-auto"
            >
              Aprender
            </button>
          </form>
          
          <div className="flex flex-col items-center justify-center pt-4 border-t border-gray-700/50 mt-6">
             <p className="text-red-400 font-semibold mb-2 animate-pulse text-sm md:text-base">¡Apóyanos!</p>
             <svg className="w-6 h-6 text-red-500 animate-bounce" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <line x1="12" y1="5" x2="12" y2="19"></line>
               <polyline points="19 12 12 19 5 12"></polyline>
             </svg>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFavorites = () => (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="text-red-500 w-8 h-8" dangerouslySetInnerHTML={{__html: ICONS.HEART_FILLED}} />
        <h2 className="text-3xl font-bold text-white">Clases Favoritas</h2>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 opacity-20" dangerouslySetInnerHTML={{__html: ICONS.HEART}} />
          <p className="text-xl">No tienes clases guardadas en favoritos.</p>
          <button 
            onClick={() => setCurrentView('HOME')}
            className="mt-6 text-brand-400 hover:text-brand-300 underline underline-offset-4"
          >
            Explorar cursos
          </button>
        </div>
      ) : (
        <div className="grid gap-4 max-w-4xl mx-auto">
          {favorites.map((fav) => {
            const isFav = true;
            return (
              <div
                key={fav.id}
                onClick={() => handleClassSelect(fav.classItem, 'FAVORITES', fav.language, fav.level)}
                className="group bg-dark-800 p-4 md:p-6 rounded-xl border border-gray-800 hover:border-brand-500/50 cursor-pointer transition-all hover:bg-dark-800/80 relative"
              >
                <div className="absolute top-4 right-4 z-10">
                   <button
                     onClick={(e) => toggleFavorite(e, fav.classItem, fav.language, fav.level)}
                     className="p-2 rounded-full hover:bg-dark-900 transition-colors text-red-500"
                     title="Quitar de favoritos"
                   >
                     <div className="w-6 h-6" dangerouslySetInnerHTML={{__html: ICONS.HEART_FILLED}} />
                   </button>
                </div>

                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="bg-brand-900/50 text-brand-300 text-xs font-bold px-2 py-1 rounded border border-brand-800/50 uppercase tracking-wide">{fav.language}</span>
                      <span className="bg-purple-900/50 text-purple-300 text-xs font-bold px-2 py-1 rounded border border-purple-800/50 uppercase tracking-wide">{fav.level}</span>
                   </div>
                   
                   <div className="flex items-start gap-4 pr-12">
                    <div className="p-3 rounded-lg bg-dark-900 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors shrink-0">
                       <div className="w-5 h-5" dangerouslySetInnerHTML={{__html: ICONS.BOOK}} />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-brand-400 transition-colors">
                        {fav.classItem.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                        {fav.classItem.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderCurriculum = () => (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 text-center md:text-left">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{selectedLanguage}</h2>
          <p className="text-gray-400">Plan de estudios generado por IA</p>
        </div>
        
        <div className="flex bg-dark-800 p-1 rounded-lg w-full md:w-auto justify-center">
          {Object.values(DifficultyLevel).map((level) => (
            <button
              key={level}
              onClick={() => handleLevelChange(level)}
              className={`px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-all flex-1 md:flex-none ${
                selectedLevel === level
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !curriculum.length ? (
        <div className="flex flex-col items-center justify-center py-20 relative">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <button 
            onClick={cancelLoading}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 bg-red-900/20 px-4 py-2 rounded-full transition-colors border border-red-900/50 hover:border-red-500/50"
          >
            <span className="font-bold">X</span> Cancelar
          </button>
        </div>
      ) : (
        <div className="grid gap-4 max-w-4xl mx-auto">
          {curriculum.map((item, idx) => {
             const isFav = selectedLanguage ? isFavorite(item.title, selectedLanguage, selectedLevel) : false;
             return (
              <div
                key={idx}
                onClick={() => selectedLanguage && handleClassSelect(item, 'CURRICULUM', selectedLanguage, selectedLevel)}
                className="group bg-dark-800 p-4 md:p-6 rounded-xl border border-gray-800 hover:border-brand-500/50 cursor-pointer transition-all hover:bg-dark-800/80 relative"
              >
                {selectedLanguage && (
                  <div className="absolute top-4 right-4 z-10">
                     <button
                       onClick={(e) => toggleFavorite(e, item, selectedLanguage, selectedLevel)}
                       className={`p-2 rounded-full hover:bg-dark-900 transition-colors ${isFav ? 'text-red-500' : 'text-gray-600 hover:text-red-400'}`}
                       title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                     >
                       <div className="w-6 h-6" dangerouslySetInnerHTML={{__html: isFav ? ICONS.HEART_FILLED : ICONS.HEART}} />
                     </button>
                  </div>
                )}

                <div className="flex items-start gap-4 pr-12">
                  <div className={`p-3 rounded-lg transition-colors mt-1 shrink-0 ${item.isCompleted ? 'bg-green-900 text-green-400' : 'bg-dark-900 text-brand-500 group-hover:bg-brand-500 group-hover:text-white'}`}>
                     <div className="w-5 h-5 md:w-6 md:h-6" dangerouslySetInnerHTML={{__html: item.isCompleted ? ICONS.CHECK : ICONS.BOOK}} />
                  </div>
                  <div>
                    <h3 className={`text-lg md:text-xl font-bold mb-2 transition-colors ${item.isCompleted ? 'text-green-400' : 'text-white group-hover:text-brand-400'}`}>
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderLesson = () => (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-4xl animate-fade-in">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 relative">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-xl text-brand-400 font-mono animate-pulse">Generando clase con IA...</p>
          <button 
            onClick={cancelLoading}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 bg-red-900/20 px-4 py-2 rounded-full transition-colors border border-red-900/50 hover:border-red-500/50 mt-4"
          >
            <span className="font-bold">X</span> Cancelar
          </button>
        </div>
      ) : currentLesson && selectedLanguage ? (
        <div className="bg-dark-800 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
          <div className="bg-dark-900/50 border-b border-gray-800 p-4 md:p-8 relative">
            <div className="flex flex-wrap items-center gap-2 text-brand-500 text-xs md:text-sm font-bold uppercase tracking-widest mb-3">
              <span className="bg-brand-500/10 px-2 py-1 rounded">{selectedLanguage}</span>
              <span>•</span>
              <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded">{selectedLevel}</span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight pr-12">
              {currentLesson.title}
            </h1>

            {/* Favorite Button in Lesson Header */}
            <div className="absolute top-6 right-6">
                <button
                  onClick={(e) => {
                      // We need to reconstruct the ClassItem somewhat since we might only have GeneratedLesson
                      // For simplicity, we search in curriculum if available, or just use title/id matching logic
                      const itemFromCurriculum = curriculum.find(c => c.title === currentLesson.title);
                      // If coming from favorites, we might need a fallback if curriculum isn't loaded
                      const classItem = itemFromCurriculum || { id: 0, title: currentLesson.title, description: 'Clase guardada' };
                      
                      toggleFavorite(e, classItem, selectedLanguage, selectedLevel);
                  }}
                  className={`p-2 rounded-full hover:bg-dark-800 transition-colors ${isFavorite(currentLesson.title, selectedLanguage, selectedLevel) ? 'text-red-500' : 'text-gray-500 hover:text-red-400'}`}
                >
                  <div className="w-8 h-8" dangerouslySetInnerHTML={{__html: isFavorite(currentLesson.title, selectedLanguage, selectedLevel) ? ICONS.HEART_FILLED : ICONS.HEART}} />
                </button>
            </div>
          </div>
          
          <div className="p-4 md:p-8">
            <MarkdownRenderer content={currentLesson.content} />
          </div>

          <div className="bg-dark-900 p-6 md:p-8 border-t border-gray-800 text-center">
            <p className="text-gray-400 mb-4">¿Te sirvió esta clase?</p>
            <button 
              onClick={completeLesson}
              className="w-full md:w-auto bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg font-bold transition-all"
            >
              Completar y Volver
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-red-400">Error cargando la lección.</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 font-sans text-gray-200">
      {renderHeader()}
      
      <main>
        {error && (
           <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 text-center text-sm">
             {error}
           </div>
        )}

        {currentView === 'HOME' && renderHome()}
        {currentView === 'FAVORITES' && renderFavorites()}
        {currentView === 'CURRICULUM' && renderCurriculum()}
        {currentView === 'LESSON' && renderLesson()}
      </main>

      <YouTubeCTA />
    </div>
  );
};

export default App;