# Layout Fixes & Recording Debug System 🔧

## ✅ Layout Fixes Implemented

### 1. **Settings Button Repositioned**

**Before**: Next to stage progress dots (looked like part of dots)  
**After**: Top-right corner of āyah tile

```
┌─────────────────────────────────────────┐
│                              [⚙️ Settings]│  ← Top right corner
│                                         │
│         قُلْ هُوَ ٱللَّهُ أَحَدٌ          │
│         qul huwa llāhu aḥad            │
│                                         │
│   ┌───────────────────────────────┐   │
│   │ 🔴 Recording...               │   │  ← Fixed at bottom
│   └───────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Features**:
- Absolute positioning (top-4 right-4)
- Background darkened for visibility
- Rounded corners with border
- Only appears on Listen & Shadow stage

### 2. **Status Indicators Moved to Bottom**

**Before**: Appeared dynamically, causing layout shifts  
**After**: Fixed position at bottom of tile

**All stages now have**:
- Reserved space (h-10) always present
- Indicators show/hide without shifting
- Below transliteration text
- Centered horizontally

### 3. **Fixed Height Container**

**Change**: `min-h-[300px]` → `min-h-[400px]` + `relative` positioning

**Result**:
- No more shifting when components appear
- Settings button positioned absolutely
- Status indicators in reserved space
- Smooth, stable layout

### 4. **Spacebar Indicator Removed When Active**

**Before**: Showed even during recording/playing  
**After**: Only shows when waiting for input

```typescript
{stage !== 'ayah-intro' && !audioPlaying && !isReciting && (
  <div className="text-center">
    <kbd>SPACE</kbd> to play audio
  </div>
)}
```

## 🔍 Comprehensive Logging System

### What's Being Logged

#### 1. **VAD State Monitor** (Continuous)
```javascript
🎤 [VAD State] {
  stage: "listen-shadow",
  isReciting: true,
  isListening: true,
  isVoiceDetected: false,  // ← KEY: Is voice being detected?
  segmentCount: 2,         // ← KEY: How many voice segments?
  currentSegment: {...}
}
```

#### 2. **Recording State**
```javascript
🔊 [Listen-Shadow Recording] {
  totalSegments: 3,
  isVoiceCurrentlyDetected: false,
  segments: [
    { duration: 523ms, confidence: 0.42 },
    { duration: 891ms, confidence: 0.67 },
    { duration: 312ms, confidence: 0.34 }
  ]
}
```

#### 3. **Silence Detection**
```javascript
⏱️ [Silence Detection] {
  timeSinceLastVoice: 1250ms,
  threshold: 1000ms,
  shouldComplete: true  // ← Triggers completion
}
```

#### 4. **Quality Analysis**
```javascript
📊 [Quality Analysis] {
  hasVocalized: true,
  segmentCount: 3,
  totalVoiceDuration: "1726ms",
  avgConfidence: 0.48,
  expectedWords: 4
}
```

#### 5. **Progress Calculation**
```javascript
🎯 [Progress Increment] {
  quality: "good",
  progressIncrement: 30,
  reason: "3 segments, 1726ms voice, 0.48 confidence"
}
```

#### 6. **Progress Update**
```javascript
📈 [Progress Update] {
  previous: 30,
  increment: 30,
  new: 60,
  isComplete: false
}
```

#### 7. **Audio Events**
```javascript
🔊 [Audio] Attempting to play {
  hasAudioUrl: true,
  audioUrl: "https://audio-cdn.tarteel.ai/...",
  segmentCount: 4,
  playbackSpeed: 1.0,
  stage: "listen-shadow"
}

✓ [Audio] Playing successfully
🎵 [Word Highlight] Word 1 at 125ms
🎵 [Word Highlight] Word 2 at 840ms
✓ [Audio Complete] Ended, auto-starting recording...
🎙️ [Auto-Record] Starting microphone...
✓ [Microphone] Successfully started listening
```

#### 8. **Spacebar Events**
```javascript
⌨️ [SPACEBAR PRESSED] {
  stage: "listen-shadow",
  audioPlaying: false,
  isReciting: false,
  isWaitingForSpace: true,
  showEncouragement: false
}
▶️ [Action] Playing audio
```

## 🚨 What to Look For in Console

### If Audio Isn't Playing:
```
❌ [Audio] No audio URL available for 112 1
→ Recitation JSON didn't load
```

### If Microphone Not Starting:
```
❌ [Microphone] Failed to start: NotAllowedError: Permission denied
→ User needs to grant microphone permission
```

### If Voice Not Detected:
```
🎤 [VAD State] {
  isListening: true,
  isVoiceDetected: false,  ← Still false after speaking
  segmentCount: 0          ← No segments created
}
→ VAD sensitivity too low or mic not working
```

### If Progress Not Adding:
```
📊 [Quality Analysis] {
  hasVocalized: false,  ← No voice detected
  segmentCount: 0,
  totalVoiceDuration: "0ms"
}
→ Recording working but not detecting speech
```

## 🎯 Current Recording Logic Explained

### Step-by-Step Process

**1. Audio Plays**
- System plays CDN recitation
- Words highlight in REAL-TIME (instant, no animation)
- User listens and follows along

**2. Audio Ends → Auto-Recording Starts**
```typescript
// Automatically triggered
setIsReciting(true);
await startListening(); // Request microphone access
```

**3. User Recites**
- Microphone captures audio
- VAD analyzes audio levels
- Creates voice segments when detected:
  ```typescript
  {
    start: 1234ms,  // When voice started
    end: 2156ms,    // When voice ended  
    confidence: 0.67 // Audio level (0-1)
  }
  ```

**4. Silence Detection**
```typescript
// After each voice segment ends
const timeSinceLastVoice = Date.now() - lastSegment.end;

if (timeSinceLastVoice > 1000ms && !isVoiceCurrentlyDetected) {
  // User stopped speaking → Complete attempt
  evaluateQuality();
}
```

**5. Quality Scoring**
```typescript
// Count voice segments
const segmentCount = segments.length;

// Total voice duration
const totalDuration = sum(segment.end - segment.start);

// Average confidence
const avgConfidence = average(segment.confidence);

// Score quality
if (segmentCount >= wordCount && avgConfidence > 0.5) {
  quality = 'perfect'; // +40%
} else if (segmentCount >= wordCount * 0.75) {
  quality = 'good'; // +30%
} else if (totalDuration > 500ms) {
  quality = 'fair'; // +20%
} else {
  quality = 'poor'; // +10%
}
```

**6. Add Progress**
```typescript
setStageProgress(prev => prev + progressIncrement);
```

**7. Auto-Loop**
```typescript
// Wait 800ms, then play audio again
setTimeout(() => playAudio(), 800);
```

## 🔧 Why It Might Not Be Working

### Most Likely Issues:

**1. Microphone Permission Not Granted**
- Check console for permission errors
- Browser should show permission prompt
- User must click "Allow"

**2. VAD Sensitivity Too Low**
- Default `noiseGateThreshold: 0.01` might be too high
- Background noise could be interfering
- Try speaking louder or closer to mic

**3. Browser Compatibility**
- Check if `navigator.mediaDevices.getUserMedia` is supported
- Must use HTTPS (or localhost for dev)
- Some browsers have stricter policies

**4. startListening() Not Returning Promise**
- Check `useMicVad` hook implementation
- Ensure it returns `Promise<void>`
- Might need `.then()` instead of `await`

## 💡 How to Debug

### Step 1: Open Console (F12)

### Step 2: Start Learn Session

### Step 3: Watch for These Logs:

**When you press SPACE first time**:
```
⌨️ [SPACEBAR PRESSED] { ... }
▶️ [Action] Playing audio
🔊 [Audio] Attempting to play { ... }
✓ [Audio] Playing successfully
```

**During audio playback**:
```
🎵 [Word Highlight] Word 1 at 125ms
🎵 [Word Highlight] Word 2 at 840ms
🎵 [Word Highlight] Word 3 at 1960ms
```

**When audio finishes**:
```
✓ [Audio Complete] Ended, auto-starting recording...
🎙️ [Auto-Record] Starting microphone...
✓ [Microphone] Successfully started listening
```

**While you're reciting**:
```
🎤 [VAD State] {
  isListening: true,
  isVoiceDetected: true,  ← Should be TRUE
  segmentCount: 1         ← Should increase
}
```

**After you stop speaking (1 second)**:
```
🔊 [Listen-Shadow Recording] { totalSegments: 3, ... }
⏱️ [Silence Detection] { shouldComplete: true }
✅ [Recitation Complete] Stopping and evaluating...
📊 [Quality Analysis] { segmentCount: 3, totalVoiceDuration: "1726ms", ... }
🎯 [Progress Increment] { quality: "good", progressIncrement: 30 }
📈 [Progress Update] { previous: 0, new: 30 }
🔄 [Auto-Loop] Playing audio again...
```

## 📋 Checklist for Debugging

Share these answers from console logs:

1. ✅ Is audio URL loading?
   ```
   Look for: hasAudioUrl: true
   ```

2. ✅ Is audio playing?
   ```
   Look for: ✓ [Audio] Playing successfully
   ```

3. ✅ Is microphone starting?
   ```
   Look for: ✓ [Microphone] Successfully started
   OR: ❌ [Microphone] Failed to start: [error]
   ```

4. ✅ Is voice being detected?
   ```
   Look for: isVoiceDetected: true (should change when you speak)
   ```

5. ✅ Are segments being created?
   ```
   Look for: segmentCount: > 0
   ```

6. ✅ Is quality being calculated?
   ```
   Look for: 📊 [Quality Analysis]
   ```

7. ✅ Is progress being added?
   ```
   Look for: 📈 [Progress Update]
   ```

## 🎚️ Adjustable Parameters (If Needed)

If logs show voice isn't being detected, we can adjust:

```typescript
// In useMicVad configuration
{
  voiceOnsetMinMs: 80,          // Lower = detect shorter sounds
  silenceThresholdMs: 300,      // Lower = faster silence detection
  noiseGateThreshold: 0.005,    // Lower = more sensitive
  debounceMs: 30                // Lower = faster response
}
```

## 🔧 Quick Fixes to Try

### If No Voice Detected:
1. Check microphone permissions
2. Try speaking louder
3. Check if correct mic selected in browser
4. Lower `noiseGateThreshold`

### If Progress Not Adding:
1. Check console for completion logs
2. Verify segments being created
3. Check silence detection firing
4. Ensure auto-loop working

---

**All logs are now in place!** Open the console and share what you see - I can then provide exact fixes based on the logs. 🔍

