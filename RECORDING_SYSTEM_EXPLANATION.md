# Recording System - Technical Explanation 🎙️

## 🔍 Current Recording Logic

### How We're Trying to Detect Recitation

The system uses **Voice Activity Detection (VAD)** to listen to the user and determine recitation quality. Here's the detailed logic:

### 1. **Voice Activity Detection (VAD)**

**What it does**:
- Analyzes audio input from microphone
- Detects when voice is present vs silence
- Creates "segments" of voice activity
- Tracks confidence levels

**Current implementation** (`useMicVad` hook):
```typescript
interface VADSegment {
  start: number;     // Timestamp when voice started (ms)
  end: number;       // Timestamp when voice ended (ms)
  confidence: number; // Audio level confidence (0-1)
}

interface VADState {
  isListening: boolean;      // Is microphone active?
  isVoiceDetected: boolean;  // Is voice currently detected?
  segments: VADSegment[];    // All voice segments captured
  currentSegment?: VADSegment; // Currently active segment
}
```

### 2. **Recitation Completion Detection**

**Current logic**:
```typescript
// Waiting for 1 second of silence after voice
if (timeSinceLastVoice > 1000 && !vadState.isVoiceDetected) {
  // User has stopped speaking → Recitation complete
  stopListening();
  evaluateQuality();
}
```

### 3. **Quality Evaluation**

**Current scoring**:
```typescript
const hasVocalized = segments.length > 0;
const totalVoiceDuration = segments.reduce((sum, seg) => 
  sum + (seg.end - seg.start), 0
);
const avgConfidence = segments.reduce((sum, seg) => 
  sum + seg.confidence, 0
) / segments.length;

// Scoring rules
if (hasVocalized && totalVoiceDuration > 500ms) {
  if (segments.length >= textTokens.length && avgConfidence > 0.5) {
    quality = 'perfect'; // +40% progress
  } else if (segments.length >= textTokens.length * 0.75) {
    quality = 'good'; // +30% progress
  } else {
    quality = 'fair'; // +20% progress
  }
} else {
  quality = 'poor'; // +10% progress
}
```

## 🚨 Potential Issues

### Why Recording Might Not Work

1. **Microphone Permission Not Granted**
   - Browser blocks mic access
   - User denied permission
   - No error handling shown to user

2. **VAD Sensitivity Too Low**
   - `noiseGateThreshold` might be too high
   - Background noise not filtered properly
   - Voice not loud enough to trigger

3. **Silence Threshold Too Long**
   - 1000ms might be too long
   - User finishes but system still waiting
   - Could be detecting background as voice

4. **No Speech Recognition**
   - Currently only detecting voice presence
   - NOT validating actual words spoken
   - NOT checking pronunciation
   - NOT matching expected text

### Missing Parameters

The current system needs:

#### For Basic Voice Detection:
```typescript
{
  voiceOnsetMinMs: 120,        // Minimum voice duration (default)
  silenceThresholdMs: 450,     // How long before silence detected (default)
  noiseGateThreshold: 0.01,    // Sensitivity (0-1) (default)
  debounceMs: 50               // Noise filtering (default)
}
```

#### For Actual Recitation Validation:
```typescript
{
  expectedText: string,        // ❌ MISSING - What user should recite
  language: 'ar',              // ❌ MISSING - Arabic language code
  pronunciationModel: string,  // ❌ MISSING - Arabic pronunciation model
  minAccuracy: 0.7,            // ❌ MISSING - Minimum match threshold
  wordLevelValidation: true    // ❌ MISSING - Check each word
}
```

## 🎯 What We Actually Need

### Option 1: Web Speech API (Browser-based)
```typescript
const recognition = new webkitSpeechRecognition();
recognition.lang = 'ar-SA'; // Arabic (Saudi Arabia)
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  // Compare transcript with expected ayah text
  const accuracy = compareArabicText(transcript, expectedText);
  // Add progress based on accuracy
};
```

**Limitations**:
- Arabic speech recognition quality varies
- Quranic pronunciation might not match standard Arabic
- Requires internet connection
- Limited browser support

### Option 2: Audio Fingerprinting
```typescript
// Record user audio
const audioBlob = recordUserRecitation();

// Compare with reference recitation
const similarity = compareAudioFingerprints(
  audioBlob,
  referenceAudioUrl
);

// Score based on similarity
if (similarity > 0.8) quality = 'perfect';
```

**Requirements**:
- Audio processing library
- Server-side comparison
- More complex implementation

### Option 3: Simple Duration + VAD (Current Approach)
```typescript
// Just check if user spoke for reasonable duration
const expectedDuration = textTokens.length * baselineMsPerWord;
const actualDuration = totalVoiceDuration;
const ratio = actualDuration / expectedDuration;

if (ratio > 0.8 && ratio < 1.5) {
  quality = 'good'; // Spoke for about the right amount of time
}
```

**Pros**: Simple, works offline
**Cons**: Can't validate actual content

## 🔧 Recommended Fixes

### Immediate (What I Can Do Now):

1. **Lower silence threshold** (1000ms → 600ms)
2. **Better VAD logging** to see what's detected
3. **Show microphone permission errors** to user
4. **Add debug panel** showing VAD segments in real-time
5. **Adjust sensitivity** based on testing

### Medium-term (Requires More Work):

1. **Implement Web Speech API** for Arabic
2. **Add text comparison** (fuzzy matching)
3. **Add visual feedback** when voice detected
4. **Store recordings** for later playback/review

### Long-term (Production Ready):

1. **Server-side speech recognition** (Google Cloud Speech, AWS Transcribe)
2. **Custom pronunciation model** trained on Quranic recitation
3. **Tajweed rule checking** for pronunciation accuracy
4. **Word-by-word validation** with phonetic matching

## 📊 Debug Logging Added

I've added extensive logging throughout:

```
🎤 [VAD State] - Shows current listening state
🔊 [Listen-Shadow Recording] - Voice segments detected
⏱️ [Silence Detection] - Timing analysis
✅ [Recitation Complete] - When attempt finishes
📊 [Quality Analysis] - Scoring details
🎯 [Progress Increment] - How much progress added
📈 [Progress Update] - Before/after values
🔄 [Auto-Loop] - When audio replays
⌨️ [SPACEBAR PRESSED] - User input
```

### How to Debug:

1. Open browser console (F12)
2. Start learn session
3. Press SPACE and recite
4. Watch logs to see:
   - Is microphone starting?
   - Are voice segments being detected?
   - What's the total voice duration?
   - Why is quality scored as it is?

## 🎙️ Microphone Requirements

### Browser Permissions Needed:
- `navigator.mediaDevices.getUserMedia({ audio: true })`
- User must click "Allow" when prompted
- HTTPS required (or localhost for dev)

### Microphone Settings:
```typescript
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100
  }
};
```

### VAD Configuration (Current):
```typescript
{
  voiceOnsetMinMs: 120,        // Voice must last 120ms minimum
  silenceThresholdMs: 450,     // 450ms silence = voice ended
  noiseGateThreshold: 0.01,    // Audio level threshold (very sensitive)
  debounceMs: 50               // Noise smoothing
}
```

## 💡 What to Check

**If recording isn't working**, check console for:

1. **Microphone permission**:
   ```
   ❌ NotAllowedError: Permission denied
   → User needs to allow microphone access
   ```

2. **VAD not detecting voice**:
   ```
   🎤 [VAD State] isVoiceDetected: false
   → Speak louder or adjust noiseGateThreshold
   ```

3. **No segments created**:
   ```
   🔊 [Recording] totalSegments: 0
   → VAD sensitivity too low
   ```

4. **Audio not loading**:
   ```
   ❌ [Audio] No audio URL available
   → Recitation JSON not loaded
   ```

## 🔧 Adjustable Parameters

To improve detection, try adjusting:

```typescript
// In useMicVad() call
useMicVad({
  voiceOnsetMinMs: 80,          // Lower = more sensitive
  silenceThresholdMs: 300,      // Lower = faster detection
  noiseGateThreshold: 0.005,    // Lower = more sensitive
  debounceMs: 30                // Lower = faster response
});
```

## ✅ Next Steps

I've added comprehensive logging to help debug. Please:

1. Open browser console
2. Start learn session
3. Try reciting
4. Share the console logs
5. I can then adjust parameters based on what's detected

The logs will show exactly where the system is failing and what parameters need adjustment!

---

**Current Limitations**: We're using basic VAD (voice presence) not actual speech recognition. For production, we'd need Arabic speech-to-text or audio fingerprinting.

