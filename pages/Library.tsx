import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// Progress Circle Component
const ProgressCircle: React.FC<{ solved: number; total: number }> = ({ solved, total }) => {
  const percentage = (solved / total) * 100;
  const circumference = 2 * Math.PI * 12; // radius = 12
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="progress-circle">
      <svg viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          strokeWidth="3"
          className="progress-circle-bg"
        />
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="progress-circle-fill"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

interface Surah {
  id: number;
  nameEn: string;
  nameAr: string;
  ayahCount: number;
  revelationPlace: 'Meccan' | 'Madinan';
  manzil?: number;
  rukusCount?: number;
  hasAnySajdah?: boolean;
  pages?: number[];
  juz?: number[];
  createdAt: number;
  updatedAt: number;
}

const Library: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPlan, currentPlan } = useAppStore();
  
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSurahDetails, setSelectedSurahDetails] = useState<Surah | null>(null);
  const [modalStep, setModalStep] = useState<'details' | 'mode' | 'plan-warning'>('details');

  // Fetch surahs from Firebase
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        setIsLoading(true);
        const surahsRef = collection(db, 'surahs');
        const q = query(surahsRef, orderBy('id', 'asc'));
        const snapshot = await getDocs(q);
        
        const surahsData: Surah[] = snapshot.docs.map(doc => ({
          id: parseInt(doc.id),
          ...doc.data()
        } as Surah));
        
        setSurahs(surahsData);
      } catch (error) {
        console.error('Error fetching surahs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurahs();
  }, []);

  const memorizedCount = 0; // TODO: Implement memorized tracking
  const totalCount = surahs.length;

  // Helper function to determine difficulty based on ayah count
  const getDifficulty = (ayahCount: number): 'easy' | 'medium' | 'hard' => {
    if (ayahCount >= 100) return 'hard';
    if (ayahCount >= 50) return 'medium';
    return 'easy';
  };
  // Helper function to check if surah is part of current plan
  const isSurahInCurrentPlan = (surahId: number) => {
    return currentPlan?.surah === surahId;
  };

  // Helper function to determine if surah tile should be grayed out
  const shouldGrayOutTile = (surah: Surah) => {
    return false; // TODO: Implement memorized tracking
  };

  const filteredSurahs = surahs
    .filter(surah => {
      const matchesSearch = surah.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           surah.nameAr.includes(searchTerm);
      const matchesFilter = filterBy === 'all' || getDifficulty(surah.ayahCount) === filterBy;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'asc') {
        return a.id - b.id;
      } else {
        return b.id - a.id;
      }
    });

  const handleSurahClick = (surah: Surah) => {
    setSelectedSurahDetails(surah);
    setModalStep('details');
  };

  const handleStartClick = () => {
    setModalStep('mode');
  };

  const handleModeSelect = (mode: 'read' | 'memorize') => {
    if (mode === 'read') {
      // Navigate to Mushaf view
      navigate(`/mushaf/${selectedSurahDetails?.id}`);
    } else {
      // Check if this surah is in current plan
      if (selectedSurahDetails && isSurahInCurrentPlan(selectedSurahDetails.id)) {
        // Already in plan, start memorization
        navigate('/session');
      } else {
        // Show plan warning
        setModalStep('plan-warning');
      }
    }
  };

  const handleAddToPlan = () => {
    if (!selectedSurahDetails) return;
    
    // TODO: Implement adding surah to current plan
    console.log('Adding surah to plan:', selectedSurahDetails.id);
    navigate('/session');
  };

  const handleSkipPlan = () => {
    // Start memorization without adding to plan
    navigate('/session');
  };

  const closeModal = () => {
    setSelectedSurahDetails(null);
    setModalStep('details');
  };

  const getDifficultyBadge = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy':
        return <span className="difficulty-badge difficulty-easy">Easy</span>;
      case 'medium':
        return <span className="difficulty-badge difficulty-medium">Medium</span>;
      case 'hard':
        return <span className="difficulty-badge difficulty-hard">Hard</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-dark-text mb-2">Loading...</h1>
            <p className="text-dark-text-secondary">Fetching surahs from database</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-4">
            {/* Search and Controls Bar */}
            <div className="card mb-6">
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-bar pl-10"
                    placeholder="Search surahs..."
                  />
                </div>

                {/* Sort Button */}
                <button
                  onClick={() => setSortBy(sortBy === 'asc' ? 'desc' : 'asc')}
                  className="w-10 h-10 bg-dark-surface border border-dark-border rounded-lg flex items-center justify-center hover:bg-dark-surface-hover transition-colors"
                >
                  <svg className="h-5 w-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>

                {/* Filter Button */}
                <div className="relative">
                  <button className="w-10 h-10 bg-dark-surface border border-dark-border rounded-lg flex items-center justify-center hover:bg-dark-surface-hover transition-colors">
                    <svg className="h-5 w-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                    </svg>
                  </button>
                </div>

                {/* Progress Circle */}
                <div className="flex items-center gap-2">
                  <ProgressCircle solved={memorizedCount} total={totalCount} />
                  <span className="text-sm text-dark-text-secondary">
                    {memorizedCount}/{totalCount} Memorized
                  </span>
                </div>
              </div>
            </div>

            {/* Surah Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSurahs.map(surah => {
                const isGrayedOut = shouldGrayOutTile(surah);
                return (
                  <div
                    key={surah.id}
                    onClick={() => handleSurahClick(surah)}
                    className={`surah-tile group cursor-pointer hover:scale-105 transition-transform ${
                      isGrayedOut ? 'opacity-50 grayscale' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                          isGrayedOut ? 'bg-gray-600 text-gray-400' : 'bg-dark-surface-hover text-dark-text'
                        }`}>
                          {surah.id}
                        </div>
                        <div>
                          <h3 className={`font-semibold ${isGrayedOut ? 'text-gray-400' : 'text-dark-text'}`}>
                            {surah.nameEn}
                          </h3>
                          <p className={`arabic-text text-lg ${isGrayedOut ? 'text-gray-500' : 'text-dark-text-secondary'}`}>
                            {surah.nameAr}
                          </p>
                        </div>
                      </div>
                      {getDifficultyBadge(getDifficulty(surah.ayahCount))}
                    </div>
                    
                    <div className={`flex justify-between items-center text-sm ${isGrayedOut ? 'text-gray-500' : 'text-dark-text-muted'}`}>
                      <span>{surah.ayahCount} verses</span>
                      {false && ( // TODO: Implement memorized tracking
                        <span className="text-green-500 font-medium flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Memorized
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </div>

      {/* Surah Details Modal */}
      {selectedSurahDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {modalStep === 'details' && (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/20 text-accent rounded-xl flex items-center justify-center text-lg font-semibold">
                      {selectedSurahDetails.id}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-dark-text">{selectedSurahDetails.nameEn}</h2>
                      <p className="text-lg text-dark-text-secondary">{selectedSurahDetails.nameAr}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-8 h-8 bg-dark-surface-hover rounded-lg flex items-center justify-center text-dark-text-secondary hover:text-dark-text"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-dark-surface-hover rounded-xl p-4">
                    <div className="text-sm text-dark-text-secondary mb-1">Verses</div>
                    <div className="text-xl font-semibold text-dark-text">{selectedSurahDetails.ayahCount}</div>
                  </div>
                  <div className="bg-dark-surface-hover rounded-xl p-4">
                    <div className="text-sm text-dark-text-secondary mb-1">Difficulty</div>
                    <div className="text-xl font-semibold text-dark-text">
                      {getDifficulty(selectedSurahDetails.ayahCount).charAt(0).toUpperCase() + getDifficulty(selectedSurahDetails.ayahCount).slice(1)}
                    </div>
                  </div>
                  <div className="bg-dark-surface-hover rounded-xl p-4">
                    <div className="text-sm text-dark-text-secondary mb-1">Revelation</div>
                    <div className="text-xl font-semibold text-dark-text">{selectedSurahDetails.revelationPlace}</div>
                  </div>
                  <div className="bg-dark-surface-hover rounded-xl p-4">
                    <div className="text-sm text-dark-text-secondary mb-1">Manzil</div>
                    <div className="text-xl font-semibold text-dark-text">{selectedSurahDetails.manzil || '—'}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-dark-text mb-3">About this Surah</h3>
                  <div className="bg-dark-surface-hover rounded-xl p-4">
                    <p className="text-dark-text-secondary leading-relaxed">
                      {selectedSurahDetails.nameEn} is a {selectedSurahDetails.revelationPlace.toLowerCase()} surah with {selectedSurahDetails.ayahCount} verses. 
                      It is considered a {getDifficulty(selectedSurahDetails.ayahCount)} difficulty surah for memorization.
                      {selectedSurahDetails.hasAnySajdah && ' This surah contains verses that require prostration (sajdah).'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleStartClick}
                    className="px-6 py-3 bg-accent text-white rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Start
                  </button>
                </div>
              </div>
            )}

            {modalStep === 'mode' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-dark-text mb-2">How would you like to engage with {selectedSurahDetails?.nameEn}?</h2>
                  <p className="text-dark-text-secondary">Choose your learning approach</p>
                </div>

                <div className="space-y-4 mb-6">
                  <button
                    onClick={() => handleModeSelect('read')}
                    className="w-full p-4 bg-dark-surface-hover rounded-xl text-left hover:bg-dark-surface transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-dark-text">Read & Study</div>
                        <div className="text-sm text-dark-text-secondary">Browse the Mushaf and study the verses</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleModeSelect('memorize')}
                    className="w-full p-4 bg-dark-surface-hover rounded-xl text-left hover:bg-dark-surface transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/20 text-accent rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-dark-text">Memorize</div>
                        <div className="text-sm text-dark-text-secondary">Start memorization sessions with spaced repetition</div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setModalStep('details')}
                    className="px-4 py-2 text-dark-text-secondary hover:text-dark-text"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {modalStep === 'plan-warning' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-yellow-500/20 text-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-dark-text mb-2">Not in Your Current Plan</h2>
                  <p className="text-dark-text-secondary">
                    {selectedSurahDetails?.nameEn} isn't part of your current memorization plan. 
                    Would you like to add it as an extra surah or start memorizing it anyway?
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <button
                    onClick={handleAddToPlan}
                    className="w-full p-4 bg-accent text-white rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Add to Plan
                  </button>
                  <button
                    onClick={handleSkipPlan}
                    className="w-full p-4 bg-dark-surface-hover text-dark-text rounded-xl hover:bg-dark-surface transition-colors"
                  >
                    Start Anyway (Skip Plan)
                  </button>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setModalStep('mode')}
                    className="px-4 py-2 text-dark-text-secondary hover:text-dark-text"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
