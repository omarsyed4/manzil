# Manzil - Quran Memorization App

A web application for memorizing the Quran using spaced repetition and hands-free audio-guided sessions.

## Current Status (Simplified MVP)

✅ **Completed:**
- Project setup with TypeScript, Tailwind CSS
- Basic UI with Madinah green theme and Arabic text support
- Surah selection and plan creation flow
- Today page showing due/new counts and Start button
- Basic routing and navigation
- **No authentication required** - simplified for testing

🚧 **In Progress:**
- Session Director component for autopilot session flow
- Audio playback with lead-in crossfade functionality
- Microphone access and voice activity detection
- Spaced repetition system for card scheduling
- Progress visualization and finish date predictions

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Features

### Plan Creation
- **LeetCode-Inspired Interface** - Sleek dark mode with professional design
- **Advanced Search & Filtering** - Search by English/Arabic names, filter by difficulty
- **Difficulty Badges** - Easy/Medium/Hard badges with color coding
- **Progress Tracking** - Circular progress chart showing memorized/total surahs
- **Smart Sorting** - Sort surahs by ascending/descending order
- **Arabic Text Support** - Proper Arabic typography with Noto Sans Arabic

### Today Page
- **Clean Dashboard** - Shows due review, new verses, and estimated time
- **Dark Mode Design** - Professional dark theme with accent colors
- **Single Action Flow** - One "Start Session" button for hands-free operation

### Calendar & Progress
- **Study Calendar** - Track days studied and estimated completion date
- **Finish Date Prediction** - "At this rate, you will finish the current surah on this specific day"
- **Progress Visualization** - Circular progress indicators throughout the app

### UI/UX
- **Sleek Dark Mode** - Professional dark theme inspired by LeetCode
- **Difficulty System** - Easy (green), Medium (yellow), Hard (red) badges
- **Modern Typography** - Source Serif Pro for headings, Inter for body text
- **Arabic Text Support** - Noto Sans Arabic and Amiri fonts
- **Responsive Design** - Works beautifully on mobile and desktop
- **Smooth Interactions** - Subtle hover effects and transitions
- **Professional Layout** - Grid-based tile system with proper spacing

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **State Management:** Zustand
- **Routing:** React Router DOM
- **Build Tool:** Webpack with hot reload

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main page components
│   ├── Today.tsx       # Main dashboard
│   ├── Session.tsx     # Memorization session
│   ├── Progress.tsx   # Progress tracking
│   ├── Settings.tsx   # User settings
│   └── SurahPicker.tsx # Plan creation
├── store/              # State management
│   └── appStore.ts     # Main Zustand store
├── types/              # TypeScript definitions
│   └── index.ts        # Core types and interfaces
├── App.tsx             # Main app component
├── App.css             # Tailwind CSS styles
└── index.tsx           # Entry point
```

## Testing the App

1. **Open** `http://localhost:3000`
2. **Create a plan** - Click "Choose Surah & Start"
3. **Select a surah** - Pick from the available options
4. **Set target date** - Choose when you want to complete it
5. **View Today page** - See your plan summary and start button
6. **Navigate** - Test the Progress and Settings pages

## Firebase Data Init and Rules

### Initialize Surah 114 (An-Nas)

We seed a minimal, public dataset for Surah An-Nas using transliterations only, with nested structure:

- `surahs/114`
- `surahs/114/ayahs/{1..6}`
- `surahs/114/ayahs/{n}/words/{m}` with `letters: [{ i, ch }]`

Run once (from app code or console):

```ts
import { initializeDatabase } from './src/lib/seedData';
initializeDatabase();
```

### Firestore Rules

- `surahs/*` and nested subcollections: public read, no writes
- `users/{uid}` and nested subcollections: private to that `uid`

See `firestore.rules`.

## Next Steps

The simplified foundation is complete. Next priorities:

1. **Session Director** - Implement the autopilot session flow
2. **Audio System** - Add Quranic audio playback with crossfade
3. **Microphone Integration** - Voice activity detection for timing
4. **SRS Algorithm** - Spaced repetition scheduling
5. **Progress Tracking** - Charts and finish date predictions

## License

MIT License - see LICENSE file for details.
