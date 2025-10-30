import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

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

// Calendar Component
const Calendar: React.FC<{ currentPlan: any }> = ({ currentPlan }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Mock study data - in real app this would come from the store
  const studyDays = new Set([
    '2024-01-15', '2024-01-16', '2024-01-18', '2024-01-20', '2024-01-22',
    '2024-01-23', '2024-01-25', '2024-01-27', '2024-01-29', '2024-01-30'
  ]);
  
  const daysStudied = studyDays.size;
  const estimatedFinishDate = currentPlan ? new Date(currentPlan.targetDate) : new Date();
  
  // Get surah name for display
  const surahs = [
    { id: 1, name: 'Al-Fatihah', arabicName: 'الفاتحة' },
    { id: 2, name: 'Al-Baqarah', arabicName: 'البقرة' },
    { id: 3, name: 'Ali \'Imran', arabicName: 'آل عمران' },
    { id: 4, name: 'An-Nisa\'', arabicName: 'النساء' },
    { id: 5, name: 'Al-Ma\'idah', arabicName: 'المائدة' },
    { id: 6, name: 'Al-An\'am', arabicName: 'الأنعام' },
    { id: 7, name: 'Al-A\'raf', arabicName: 'الأعراف' },
    { id: 8, name: 'Al-Anfal', arabicName: 'الأنفال' },
    { id: 9, name: 'At-Tawbah', arabicName: 'التوبة' },
    { id: 10, name: 'Yunus', arabicName: 'يونس' },
    { id: 11, name: 'Hud', arabicName: 'هود' },
    { id: 12, name: 'Yusuf', arabicName: 'يوسف' },
    { id: 78, name: 'An-Naba\'', arabicName: 'النبأ' },
    { id: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص' },
    { id: 113, name: 'Al-Falaq', arabicName: 'الفلق' },
    { id: 114, name: 'An-Nas', arabicName: 'الناس' },
  ];
  
  const currentSurah = currentPlan ? surahs.find(s => s.id === currentPlan.surah) : null;
  
  // Calendar generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Generate calendar days
  const calendarDays = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isStudied = studyDays.has(dateStr);
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
    
    calendarDays.push({
      day,
      dateStr,
      isStudied,
      isToday
    });
  }
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-text">Study Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="w-6 h-6 flex items-center justify-center text-dark-text-secondary hover:text-dark-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-dark-text min-w-[120px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="w-6 h-6 flex items-center justify-center text-dark-text-secondary hover:text-dark-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="mb-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-xs font-medium text-dark-text-muted text-center py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayData, index) => {
            if (!dayData) {
              return <div key={index} className="h-8"></div>;
            }
            
            return (
              <div
                key={dayData.day}
                className={`h-8 flex items-center justify-center text-xs relative ${
                  dayData.isToday 
                    ? 'bg-accent-blue text-dark-text font-semibold rounded' 
                    : 'text-dark-text-secondary hover:text-dark-text'
                }`}
              >
                {dayData.day}
                {dayData.isStudied && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent-green rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Study Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-text-secondary">Days Studied</span>
          <span className="text-dark-text font-semibold">{daysStudied}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-text-secondary">Study Streak</span>
          <span className="text-dark-text font-semibold">3 days</span>
        </div>
      </div>
      
      {/* Current Plan Info */}
      {currentPlan && currentSurah && (
        <div className="bg-dark-surface-hover p-3 rounded-lg mb-4">
          <p className="text-sm text-dark-text-secondary mb-1">Current Plan</p>
          <p className="text-dark-text font-medium mb-1">
            Surah {currentSurah.name} ({currentSurah.arabicName})
          </p>
          <p className="text-xs text-dark-text-muted">
            Target: {estimatedFinishDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>
      )}
      
      {/* Continue Plan Button */}
      {currentPlan && (
        <button 
          onClick={() => navigate('/today')}
          className="w-full btn-accent text-sm py-2"
        >
          Continue Plan
        </button>
      )}
      
      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-dark-border">
        <div className="flex items-center gap-4 text-xs text-dark-text-muted">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-accent-green rounded-full"></div>
            <span>Studied</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-accent-blue rounded-full"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SurahPicker: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPlan, currentPlan } = useAppStore();
  
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  // Enhanced surahs with more realistic data
  const surahs = [
    { id: 1, name: 'Al-Fatihah', arabicName: 'الفاتحة', ayahCount: 7, category: 'short', difficulty: 'easy', memorized: true },
    { id: 2, name: 'Al-Baqarah', arabicName: 'البقرة', ayahCount: 286, category: 'long', difficulty: 'hard', memorized: false },
    { id: 3, name: 'Ali \'Imran', arabicName: 'آل عمران', ayahCount: 200, category: 'long', difficulty: 'hard', memorized: false },
    { id: 4, name: 'An-Nisa\'', arabicName: 'النساء', ayahCount: 176, category: 'long', difficulty: 'hard', memorized: false },
    { id: 5, name: 'Al-Ma\'idah', arabicName: 'المائدة', ayahCount: 120, category: 'medium', difficulty: 'medium', memorized: false },
    { id: 6, name: 'Al-An\'am', arabicName: 'الأنعام', ayahCount: 165, category: 'long', difficulty: 'hard', memorized: false },
    { id: 7, name: 'Al-A\'raf', arabicName: 'الأعراف', ayahCount: 206, category: 'long', difficulty: 'hard', memorized: false },
    { id: 8, name: 'Al-Anfal', arabicName: 'الأنفال', ayahCount: 75, category: 'medium', difficulty: 'medium', memorized: false },
    { id: 9, name: 'At-Tawbah', arabicName: 'التوبة', ayahCount: 129, category: 'medium', difficulty: 'medium', memorized: false },
    { id: 10, name: 'Yunus', arabicName: 'يونس', ayahCount: 109, category: 'medium', difficulty: 'medium', memorized: false },
    { id: 11, name: 'Hud', arabicName: 'هود', ayahCount: 123, category: 'medium', difficulty: 'medium', memorized: false },
    { id: 12, name: 'Yusuf', arabicName: 'يوسف', ayahCount: 111, category: 'medium', difficulty: 'medium', memorized: false },
    { id: 78, name: 'An-Naba\'', arabicName: 'النبأ', ayahCount: 40, category: 'medium', difficulty: 'medium', memorized: false },
    { id: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', ayahCount: 4, category: 'short', difficulty: 'easy', memorized: true },
    { id: 113, name: 'Al-Falaq', arabicName: 'الفلق', ayahCount: 5, category: 'short', difficulty: 'easy', memorized: true },
    { id: 114, name: 'An-Nas', arabicName: 'الناس', ayahCount: 6, category: 'short', difficulty: 'easy', memorized: true },
  ];

  const memorizedCount = surahs.filter(s => s.memorized).length;
  const totalCount = surahs.length;

  const filteredSurahs = surahs
    .filter(surah => {
      const matchesSearch = surah.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           surah.arabicName.includes(searchTerm);
      const matchesFilter = filterBy === 'all' || surah.difficulty === filterBy;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'asc') {
        return a.id - b.id;
      } else {
        return b.id - a.id;
      }
    });

  const handleCreatePlan = () => {
    if (!selectedSurah || !targetDate) return;

    const surah = surahs.find(s => s.id === selectedSurah);
    if (!surah) return;

    const daysUntilTarget = Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const newPerDay = Math.ceil(surah.ayahCount / daysUntilTarget);

    const plan = {
      id: `plan-${Date.now()}`,
      userId: 'demo-user',
      surah: selectedSurah,
      newPerDay,
      reviewCap: 40,
      ratioNewToReview: '1:3' as const,
      startAyah: 1,
      targetDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setCurrentPlan(plan);
    navigate('/today');
  };

  const getDifficultyBadge = (difficulty: string) => {
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-dark-text mb-2">Quran Memorization</h1>
          <p className="text-dark-text-secondary">Select a surah to memorize and track your progress</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
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
              {filteredSurahs.map(surah => (
                <div
                  key={surah.id}
                  onClick={() => setSelectedSurah(surah.id)}
                  className={`surah-tile group ${selectedSurah === surah.id ? 'selected' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-dark-surface-hover rounded-lg flex items-center justify-center text-sm font-semibold text-dark-text">
                        {surah.id}
                      </div>
                      <div>
                        <h3 className="font-semibold text-dark-text">{surah.name}</h3>
                        <p className="arabic-text text-lg text-dark-text-secondary">{surah.arabicName}</p>
                      </div>
                    </div>
                    {getDifficultyBadge(surah.difficulty)}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-dark-text-muted">
                    <span>{surah.ayahCount} verses</span>
                    {surah.memorized && (
                      <span className="text-accent-green font-medium">✓ Memorized</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Plan Creation */}
            {selectedSurah && (
              <div className="card mt-6">
                <h3 className="text-xl font-semibold mb-4 text-dark-text">Create Your Plan</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-dark-text-secondary">Selected Surah</label>
                    <div className="bg-dark-surface-hover p-3 rounded-lg">
                      <div className="font-semibold text-dark-text">
                        {surahs.find(s => s.id === selectedSurah)?.name}
                      </div>
                      <div className="arabic-text text-sm text-dark-text-secondary">
                        {surahs.find(s => s.id === selectedSurah)?.arabicName}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="targetDate" className="block text-sm font-medium mb-2 text-dark-text-secondary">Target Date</label>
                    <input
                      id="targetDate"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="input-field w-full"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {targetDate && (
                  <div className="bg-dark-surface-hover p-4 rounded-lg mb-6">
                    <h4 className="font-semibold mb-2 text-dark-text">Plan Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-dark-text-secondary">Daily Target:</span>
                        <span className="ml-2 font-medium text-dark-text">
                          ~{Math.ceil(surahs.find(s => s.id === selectedSurah)?.ayahCount! / Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} verses/day
                        </span>
                      </div>
                      <div>
                        <span className="text-dark-text-secondary">Total Verses:</span>
                        <span className="ml-2 font-medium text-dark-text">{surahs.find(s => s.id === selectedSurah)?.ayahCount}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => navigate('/today')}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreatePlan}
                    disabled={!selectedSurah || !targetDate}
                    className="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Plan & Start
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Calendar */}
              <Calendar currentPlan={currentPlan} />
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurahPicker;
