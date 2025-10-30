/**
 * mushafService.ts
 * 
 * Service layer for fetching and managing Mushaf (page-based) Qur'an data
 */

import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { MushafLayout, MushafPage, AyahToPage, WordToken } from '../types';

// Cache for pages to avoid redundant fetches
const pageCache = new Map<string, MushafPage>();
const ayahToPageCache = new Map<string, AyahToPage>();

/**
 * Fetch the Mushaf layout metadata
 */
export async function getMushafLayout(layoutCode: string = 'madani-15'): Promise<MushafLayout | null> {
  try {
    const layoutRef = doc(db, 'mushafLayouts', layoutCode);
    const layoutSnap = await getDoc(layoutRef);
    
    if (!layoutSnap.exists()) {
      console.error(`Mushaf layout ${layoutCode} not found`);
      return null;
    }
    
    return layoutSnap.data() as MushafLayout;
  } catch (error) {
    console.error('Error fetching Mushaf layout:', error);
    return null;
  }
}

/**
 * Fetch a specific page from the Mushaf
 */
export async function getMushafPage(
  layoutCode: string,
  pageNumber: number
): Promise<MushafPage | null> {
  const cacheKey = `${layoutCode}:${pageNumber}`;
  
  // Check cache first
  if (pageCache.has(cacheKey)) {
    return pageCache.get(cacheKey)!;
  }
  
  try {
    const pageRef = doc(db, 'mushafLayouts', layoutCode, 'pages', String(pageNumber));
    const pageSnap = await getDoc(pageRef);
    
    if (!pageSnap.exists()) {
      console.error(`Page ${pageNumber} not found for layout ${layoutCode}`);
      return null;
    }
    
    const pageData = pageSnap.data() as MushafPage;
    pageCache.set(cacheKey, pageData);
    
    return pageData;
  } catch (error) {
    console.error(`Error fetching page ${pageNumber}:`, error);
    return null;
  }
}

/**
 * Resolve which page contains a specific ayah
 */
export async function getPageForAyah(
  layoutCode: string,
  surahId: number,
  ayahNumber: number
): Promise<AyahToPage | null> {
  const cacheKey = `${layoutCode}:${surahId}:${ayahNumber}`;
  
  // Check cache first
  if (ayahToPageCache.has(cacheKey)) {
    return ayahToPageCache.get(cacheKey)!;
  }
  
  try {
    const mappingRef = doc(db, 'ayahToPage', layoutCode, String(surahId), String(ayahNumber));
    const mappingSnap = await getDoc(mappingRef);
    
    if (!mappingSnap.exists()) {
      console.error(`Mapping not found for ${surahId}:${ayahNumber}`);
      return null;
    }
    
    const mappingData = mappingSnap.data() as AyahToPage;
    ayahToPageCache.set(cacheKey, mappingData);
    
    return mappingData;
  } catch (error) {
    console.error(`Error fetching page mapping for ${surahId}:${ayahNumber}:`, error);
    return null;
  }
}

/**
 * Fetch words for a specific ayah from the surahs collection
 */
export async function getAyahWords(
  surahId: number,
  ayahNumber: number
): Promise<string | null> {
  try {
    const wordsRef = collection(db, 'surahs', String(surahId), 'ayahs', String(ayahNumber), 'words');
    const wordsQuery = query(wordsRef, orderBy('position', 'asc'));
    const wordsSnap = await getDocs(wordsQuery);
    
    if (wordsSnap.empty) {
      console.warn(`No words found for ${surahId}:${ayahNumber}`);
      return null;
    }
    
    const words: string[] = [];
    wordsSnap.forEach((doc) => {
      const data = doc.data();
      words.push(data.textArabic || data.text || '');
    });
    
    return words.join(' ');
  } catch (error) {
    console.error(`Error fetching words for ${surahId}:${ayahNumber}:`, error);
    return null;
  }
}

/**
 * Build the full text for a line by fetching all ayahs on that line
 */
export async function getLineText(ayahRefs: string[]): Promise<string> {
  const textSegments: string[] = [];
  
  for (const ayahRef of ayahRefs) {
    const [surahId, ayahNumber] = ayahRef.split(':').map(Number);
    const ayahText = await getAyahWords(surahId, ayahNumber);
    
    if (ayahText) {
      textSegments.push(ayahText);
    }
  }
  
  return textSegments.join(' ');
}

/**
 * Preload adjacent pages for smoother navigation
 */
export async function preloadAdjacentPages(
  layoutCode: string,
  currentPage: number,
  totalPages: number
): Promise<void> {
  const pagesToPreload: number[] = [];
  
  if (currentPage > 1) {
    pagesToPreload.push(currentPage - 1);
  }
  
  if (currentPage < totalPages) {
    pagesToPreload.push(currentPage + 1);
  }
  
  // Load in parallel
  await Promise.all(
    pagesToPreload.map(page => getMushafPage(layoutCode, page))
  );
}

/**
 * Clear the page cache (useful for memory management)
 */
export function clearPageCache(): void {
  pageCache.clear();
  ayahToPageCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    pagesInCache: pageCache.size,
    mappingsInCache: ayahToPageCache.size
  };
}

/**
 * Get surah name (Arabic) by surah ID
 */
export async function getSurahName(surahId: number): Promise<string | null> {
  try {
    const surahRef = doc(db, 'surahs', String(surahId));
    const surahSnap = await getDoc(surahRef);
    
    if (!surahSnap.exists()) {
      console.error(`Surah ${surahId} not found`);
      return null;
    }
    
    const data = surahSnap.data();
    return data.nameAr || data.nameEn || null;
  } catch (error) {
    console.error(`Error fetching surah ${surahId} name:`, error);
    return null;
  }
}

