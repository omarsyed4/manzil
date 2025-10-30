import React, { useState } from 'react';

interface LearnIntroFlowProps {
  onStart: () => void;
  onSkip: () => void;
}

const LearnIntroFlow: React.FC<LearnIntroFlowProps> = ({ onStart, onSkip }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Welcome to Learn Mode',
      description: 'Master new āyāt through a proven 3-step process',
      content: (
        <div className="space-y-4">
          <div className="bg-dark-surface-hover rounded-xl p-4 border border-dark-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-dark-bg">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-dark-text mb-1">Listen & Shadow</h4>
                <p className="text-sm text-dark-text-secondary">
                  Listen to the recitation and repeat along until you feel comfortable
                </p>
              </div>
            </div>
          </div>

          <div className="bg-dark-surface-hover rounded-xl p-4 border border-dark-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-dark-bg">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-dark-text mb-1">Read & Recite</h4>
                <p className="text-sm text-dark-text-secondary">
                  Recite while looking at the Arabic text until you master it without hesitation
                </p>
              </div>
            </div>
          </div>

          <div className="bg-dark-surface-hover rounded-xl p-4 border border-dark-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-dark-bg">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-dark-text mb-1">Recall from Memory</h4>
                <p className="text-sm text-dark-text-secondary">
                  Recite from memory as words appear to confirm you've truly memorized it
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Step 1: Listen & Shadow',
      description: 'Build familiarity through listening',
      content: (
        <div className="space-y-4">
          <div className="bg-dark-bg rounded-xl p-6 border border-dark-border">
            {/* Example visualization */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-3 bg-dark-surface px-6 py-3 rounded-full">
                <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                <span className="text-dark-text-secondary text-sm">Click to play</span>
              </div>
            </div>
            <p className="text-2xl font-arabic text-dark-text text-center leading-loose">
              قُلْ هُوَ ٱللَّهُ أَحَدٌ
            </p>
            <p className="text-center text-dark-text-secondary text-sm mt-2">
              qul huwa llāhu aḥad
            </p>
          </div>

          <div className="space-y-2 text-sm text-dark-text-secondary">
            <p>• Listen to the beautiful recitation</p>
            <p>• Shadow along (whisper/speak quietly)</p>
            <p>• Repeat as many times as you need</p>
            <p>• Move on when you feel ready</p>
          </div>
        </div>
      )
    },
    {
      title: 'Step 2: Read & Recite',
      description: 'Master the pronunciation while reading',
      content: (
        <div className="space-y-4">
          <div className="bg-dark-bg rounded-xl p-6 border border-dark-border">
            {/* Example visualization */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-dark-text-secondary text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span>Recording</span>
              </div>
            </div>
            <p className="text-3xl font-arabic text-dark-text text-center leading-loose">
              قُلْ هُوَ ٱللَّهُ أَحَدٌ
            </p>
          </div>

          <div className="space-y-2 text-sm text-dark-text-secondary">
            <p>• Recite while looking at the Arabic text</p>
            <p>• The system listens for hesitations</p>
            <p>• Practice until you recite smoothly</p>
            <p>• Transliteration available if needed</p>
          </div>
        </div>
      )
    },
    {
      title: 'Step 3: Recall from Memory',
      description: "Prove you've truly memorized it",
      content: (
        <div className="space-y-4">
          <div className="bg-dark-bg rounded-xl p-6 border border-dark-border">
            {/* Example visualization */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-dark-text-secondary text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span>Recite from memory</span>
              </div>
            </div>
            <p className="text-3xl font-arabic text-dark-text text-center leading-loose">
              <span className="opacity-100">قُلْ</span>
              <span className="opacity-100 ml-2">هُوَ</span>
              <span className="opacity-30 ml-2">ٱللَّهُ</span>
              <span className="opacity-30 ml-2">أَحَدٌ</span>
            </p>
            <p className="text-center text-dark-text-secondary text-xs mt-4">
              Words appear as you recite them
            </p>
          </div>

          <div className="space-y-2 text-sm text-dark-text-secondary">
            <p>• No text shown initially</p>
            <p>• Recite from memory</p>
            <p>• Words appear as you say them</p>
            <p>• Master it with smooth, confident recitation</p>
          </div>
        </div>
      )
    },
    {
      title: 'Building Your Foundation',
      description: 'One āyah at a time, then connecting them',
      content: (
        <div className="space-y-4">
          <div className="bg-dark-bg rounded-xl p-6 border border-dark-border">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-easy flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-dark-bg" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-dark-text">Āyah 1 mastered</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-easy flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-dark-bg" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-dark-text">Āyah 2 mastered</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 animate-pulse">
                  <span className="text-xs text-dark-bg font-semibold">→</span>
                </div>
                <span className="text-dark-text">Connect Āyah 1 + 2</span>
              </div>

              <div className="flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full bg-dark-surface-hover border border-dark-border flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-dark-text-muted">3</span>
                </div>
                <span className="text-dark-text-secondary">Āyah 3 next...</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-dark-text-secondary">
            <p>• Master each āyah individually first</p>
            <p>• Then connect them together smoothly</p>
            <p>• Build up to complete passages</p>
            <p>• Strong foundation for long-term retention</p>
          </div>
        </div>
      )
    },
    {
      title: 'Ready to Begin?',
      description: "Let's start your learning journey",
      content: (
        <div className="space-y-6 text-center">
          <div className="bg-dark-surface-hover rounded-xl p-6 border border-dark-border">
            <svg className="w-16 h-16 text-accent mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            <h3 className="text-xl font-semibold text-dark-text mb-2">
              {"You're all set!"}
            </h3>
            <p className="text-dark-text-secondary">
              Take your time, trust the process, and enjoy the journey of memorization.
            </p>
          </div>

          <div className="space-y-2 text-sm text-dark-text-muted">
            <p>💡 Tip: Find a quiet space and take deep breaths before starting</p>
            <p>🎯 Goal: Master through repetition, not rushing</p>
          </div>
        </div>
      )
    }
  ];

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onStart();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Progress indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-accent'
                  : index < currentSlide
                  ? 'w-1.5 bg-accent/50'
                  : 'w-1.5 bg-dark-border'
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="bg-dark-surface rounded-2xl p-8 border border-dark-border mb-6 min-h-[500px] flex flex-col">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-dark-text mb-2">
              {currentSlideData.title}
            </h2>
            <p className="text-dark-text-secondary">
              {currentSlideData.description}
            </p>
          </div>

          <div className="flex-1">
            {currentSlideData.content}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-dark-text-secondary hover:text-dark-text transition-colors text-sm"
          >
            Skip intro
          </button>

          <div className="flex gap-3">
            {currentSlide > 0 && (
              <button
                onClick={handlePrevious}
                className="px-6 py-2 text-dark-text-secondary hover:text-dark-text transition-colors"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="btn-primary px-8 py-3"
            >
              {isLastSlide ? 'Start Learning' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnIntroFlow;

