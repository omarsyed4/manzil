import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/20 text-accent mb-4">
            <span className="text-lg font-semibold">م</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-dark-text mb-3">Memorize Quran, beautifully and sustainably</h1>
          <p className="text-dark-text-secondary max-w-2xl mx-auto">
            Manzil is an iOS–style memorization experience that guides you through learn → memorize → review
            with gentle automation. Clear goals, spaced repetition, and hands-free flow.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/today')}
              className="px-5 py-3 rounded-xl bg-accent text-white hover:opacity-90"
            >
              Get Started
            </button>
          </div>
        </section>

        {/* Value props */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { title: 'Learn', desc: 'Segmented guidance and transliteration-friendly flow for first-time learning.' },
            { title: 'Memorize', desc: 'Micro windows, timing cues, and instant problem area highlighting.' },
            { title: 'Review', desc: 'Spaced repetition with weak-first ordering to keep you rock-solid.' },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl p-5 bg-dark-surface-hover border border-dark-border">
              <div className="text-lg font-medium text-dark-text mb-2">{c.title}</div>
              <div className="text-sm text-dark-text-secondary">{c.desc}</div>
            </div>
          ))}
        </section>

        {/* Mission */}
        <section className="rounded-2xl p-6 bg-dark-surface-hover border border-dark-border">
          <h2 className="text-xl font-medium text-dark-text mb-2">Our Mission</h2>
          <p className="text-dark-text-secondary">
            Make Quran memorization accessible and delightful. Manzil focuses on clarity, comfort, and momentum.
            We combine thoughtful UX with practical scheduling so you can build a lifelong relationship with the Book.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Landing;


