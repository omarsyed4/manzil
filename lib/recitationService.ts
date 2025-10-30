/**
 * recitationService.ts
 * 
 * Service for loading and managing Qur'an recitation audio and segments
 */

interface RecitationSegment {
  word: number;
  startMs: number;
  endMs: number;
}

interface RecitationData {
  surah_number: number;
  ayah_number: number;
  audio_url: string;
  duration: number | null;
  segments: number[][]; // [word_number, start_ms, end_ms]
}

// Cache for recitation data
let recitationCache: Record<string, RecitationData> | null = null;

/**
 * Load the recitation data JSON file
 */
export async function loadRecitationData(): Promise<Record<string, RecitationData>> {
  if (recitationCache) {
    return recitationCache;
  }

  try {
    const response = await fetch('/ayah-recitation-maher-al-mu-aiqly-murattal-hafs-948.json');
    if (!response.ok) {
      throw new Error('Failed to load recitation data');
    }
    
    recitationCache = await response.json();
    return recitationCache;
  } catch (error) {
    console.error('Error loading recitation data:', error);
    return {};
  }
}

/**
 * Get recitation data for a specific ayah
 */
export async function getRecitationData(
  surahId: number,
  ayahNumber: number
): Promise<RecitationData | null> {
  const data = await loadRecitationData();
  const key = `${surahId}:${ayahNumber}`;
  return data[key] || null;
}

/**
 * Get audio URL for an ayah
 */
export async function getAudioUrl(
  surahId: number,
  ayahNumber: number
): Promise<string | null> {
  const data = await getRecitationData(surahId, ayahNumber);
  return data?.audio_url || null;
}

/**
 * Get word segments for an ayah
 */
export async function getWordSegments(
  surahId: number,
  ayahNumber: number
): Promise<RecitationSegment[]> {
  const data = await getRecitationData(surahId, ayahNumber);
  
  if (!data || !data.segments) {
    return [];
  }

  return data.segments.map(seg => ({
    word: seg[0],
    startMs: seg[1],
    endMs: seg[2]
  }));
}

/**
 * Get which word is being spoken at a given time
 */
export function getWordAtTime(
  segments: RecitationSegment[],
  currentTimeMs: number
): number {
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (currentTimeMs >= segment.startMs && currentTimeMs <= segment.endMs) {
      return segment.word - 1; // Convert to 0-based index
    }
  }
  return -1;
}

/**
 * Create and play audio element
 */
export function createAudioPlayer(
  url: string,
  onTimeUpdate?: (currentTime: number) => void,
  onEnded?: () => void
): HTMLAudioElement {
  const audio = new Audio(url);
  
  if (onTimeUpdate) {
    audio.addEventListener('timeupdate', () => {
      onTimeUpdate(audio.currentTime * 1000); // Convert to ms
    });
  }
  
  if (onEnded) {
    audio.addEventListener('ended', onEnded);
  }
  
  return audio;
}

