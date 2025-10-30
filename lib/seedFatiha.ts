/**
 * Manzil — Firestore seed script for Surah Al-Fātiḥah
 * Seeds Surah Al-Fātiḥah (id=1) with structure:
 * /surahs/1            (surah doc)
 *   /ayahs/{1..7}      (ayah docs)
 *   /rukus/{...}       (optional)
 *   /sajdah/{...}      (optional; none for Fātiḥah)
 *
 * This script uses the client-side Firebase SDK for browser compatibility.
 * Run this from the browser console or integrate into the app.
 */

import FirebaseService from './firebaseService';

// ---------- Types (document shapes) ----------
export interface SurahDoc {
  id: number;                 // Surah number (1-based)
  nameEn: string;
  nameAr: string;
  ayahCount: number;
  revelationPlace: "Meccan" | "Madinan";
  manzil?: number;            // 1..7 (traditional division)
  rukusCount?: number;
  hasAnySajdah?: boolean;     // any sajdah in this surah?
  pages?: number[];           // Mushaf page numbers (optional)
  juz?: number[];             // Juz indices (if spans multiple)
  createdAt: number;
  updatedAt: number;
}

export interface WordToken {
  i: number;          // 1-based word index within the ayah
  text: string;       // Uthmānī word
  // Optional fields for future expansion:
  // root?: string;
  // tajwidTags?: string[];    // e.g., ["ikhfa", "idgham"]
  // glyphWidth?: number;      // layout hint for mushaf rendering
}

export interface AyahDoc {
  surahId: number;
  ayah: number;                      // 1-based within surah
  textUthmani?: string;              // full ayah text (optional in MVP)
  words: WordToken[];                // lowest-level tokens
  rukuIndex?: number;                // 1-based ruku index inside surah
  page?: number;                     // Mushaf page number (optional)
  hasSajdah?: boolean;
  audio?: {
    reciter?: string;                // e.g., "mishari"
    url?: string;                    // will be filled later / CDN
  };
  // Traces/metadata reserved for later alignment or display
  meta?: {
    wordCount: number;
    needsContent?: boolean;          // true if placeholder stub
  };
  createdAt: number;
  updatedAt: number;
}

export interface RukuDoc {
  rukuIndex: number;       // 1-based inside this surah
  startAyah: number;       // inclusive
  endAyah: number;         // inclusive
}

export interface SajdahDoc {
  ayah: number;            // ayah where sajdah occurs
  obligatory: boolean;     // some surahs have recommended/mandatory opinions
}

// ---------- Config ----------
const SURAH_COLLECTION = "surahs";
const AYAH_SUBCOL = "ayahs";
const RUKU_SUBCOL = "rukus";
const SAJDAH_SUBCOL = "sajdah";

// ---------- Seed Data: Surah 1 (Al-Fātiḥah) ----------
const surah1: SurahDoc = {
  id: 1,
  nameEn: "Al-Fātiḥah",
  nameAr: "ٱلْفَاتِحَة",
  ayahCount: 7,
  revelationPlace: "Meccan",
  manzil: 1,
  rukusCount: 1,
  hasAnySajdah: false,
  pages: [1],   // depends on the print, leave as reference
  juz: [1],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Ayah 1 — real tokens (Uthmānī text broken into words)
const ayah1: AyahDoc = {
  surahId: 1,
  ayah: 1,
  textUthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  words: [
    { i: 1, text: "بِسْمِ" },
    { i: 2, text: "ٱللَّهِ" },
    { i: 3, text: "ٱلرَّحْمَٰنِ" },
    { i: 4, text: "ٱلرَّحِيمِ" },
  ],
  rukuIndex: 1,
  page: 1,
  hasSajdah: false,
  audio: { reciter: "mishari" },   // url to be filled later
  meta: { wordCount: 4 },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Ayah 2..7 — STUBS (structure in place, dev/content team fills tokens later)
function stubAyah(n: number, wordCountGuess = 6): AyahDoc {
  return {
    surahId: 1,
    ayah: n,
    // textUthmani intentionally omitted in stubs
    words: Array.from({ length: wordCountGuess }, (_, idx) => ({
      i: idx + 1,
      text: "—",               // placeholder to be replaced with real token
    })),
    rukuIndex: 1,
    page: 1,
    hasSajdah: false,
    audio: { reciter: "mishari" },
    meta: { wordCount: wordCountGuess, needsContent: true },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const ayah2to7 = [2, 3, 4, 5, 6, 7].map((n) => stubAyah(n));

// One ruku doc covering all 7 āyāt
const fatihaRuku: RukuDoc = { rukuIndex: 1, startAyah: 1, endAyah: 7 };

// ---------- Main Seeding Function ----------
export async function seedFatiha(): Promise<void> {
  try {
    console.log('🌱 Starting Surah Al-Fātiḥah seeding...');

    // Create surah document
    await FirebaseService.db.collection(SURAH_COLLECTION).doc(String(surah1.id)).set(surah1, { merge: true });
    console.log('✅ Created Surah 1 document');

    // Get references to subcollections
    const surahRef = FirebaseService.db.collection(SURAH_COLLECTION).doc(String(surah1.id));
    const ayahsRef = surahRef.collection(AYAH_SUBCOL);
    const rukusRef = surahRef.collection(RUKU_SUBCOL);

    // Seed ayah 1 (real tokens)
    await ayahsRef.doc("1").set(ayah1, { merge: true });
    console.log('✅ Seeded Ayah 1 with real tokens');

    // Seed ayah 2..7 (stubs)
    for (const a of ayah2to7) {
      await ayahsRef.doc(String(a.ayah)).set(a, { merge: true });
    }
    console.log('✅ Seeded Ayahs 2-7 as stubs');

    // Seed ruku
    await rukusRef.doc(String(fatihaRuku.rukuIndex)).set(fatihaRuku, { merge: true });
    console.log('✅ Seeded Ruku structure');

    // No sajdah in Fātiḥah — keep collection empty for now
    console.log('✅ Surah Al-Fātiḥah seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding Surah Al-Fātiḥah:', error);
    throw error;
  }
}

// ---------- Utility Functions ----------
export async function getFatihaData(): Promise<{ surah: SurahDoc; ayahs: AyahDoc[] }> {
  try {
    const surahDoc = await FirebaseService.db.collection(SURAH_COLLECTION).doc('1').get();
    const surah = surahDoc.data() as SurahDoc;

    const ayahsSnapshot = await FirebaseService.db
      .collection(SURAH_COLLECTION)
      .doc('1')
      .collection(AYAH_SUBCOL)
      .orderBy('ayah', 'asc')
      .get();

    const ayahs = ayahsSnapshot.docs.map(doc => doc.data() as AyahDoc);

    return { surah, ayahs };
  } catch (error) {
    console.error('Error fetching Al-Fātiḥah data:', error);
    throw error;
  }
}

export async function clearFatihaData(): Promise<void> {
  try {
    console.log('🗑️ Clearing Surah Al-Fātiḥah data...');
    
    const surahRef = FirebaseService.db.collection(SURAH_COLLECTION).doc('1');
    
    // Delete all ayahs
    const ayahsSnapshot = await surahRef.collection(AYAH_SUBCOL).get();
    const ayahDeletes = ayahsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(ayahDeletes);
    
    // Delete all rukus
    const rukusSnapshot = await surahRef.collection(RUKU_SUBCOL).get();
    const rukuDeletes = rukusSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(rukuDeletes);
    
    // Delete surah document
    await surahRef.delete();
    
    console.log('✅ Cleared Surah Al-Fātiḥah data');
  } catch (error) {
    console.error('❌ Error clearing Surah Al-Fātiḥah data:', error);
    throw error;
  }
}
