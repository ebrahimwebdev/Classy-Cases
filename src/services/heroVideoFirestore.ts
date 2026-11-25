import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface HeroVideoSlide {
  id: string;
  label: string;
  kicker: string;
  headline: string;
  description: string;
  videoSrc: string;
  posterSrc: string;
  posterAlt: string;
  categoryTarget: string;
  featuredProductId: string;
  startingPrice: number;
  sortOrder: number;
  active: boolean;
}

export interface HeroMobileLayoutConfig {
  position: 'bottom-left' | 'center' | 'top-left';
  textSize: 'xs' | 'sm' | 'md';
  showKicker: boolean;
  showDescription: boolean;
  showExploreButton: boolean;
  showProductButton: boolean;
  showArrows: boolean;
}

export interface HeroPlaybackConfig {
  activeSlideId: string;
  autoAdvanceSeconds: number;
  mobileLayout?: HeroMobileLayoutConfig;
}

export const DEFAULT_HERO_MOBILE_LAYOUT: HeroMobileLayoutConfig = {
  position: 'bottom-left',
  textSize: 'xs',
  showKicker: false,
  showDescription: false,
  showExploreButton: true,
  showProductButton: false,
  showArrows: false,
};

export const DEFAULT_HERO_CONFIG: HeroPlaybackConfig = {
  activeSlideId: 'magsafe-video',
  autoAdvanceSeconds: 9,
  mobileLayout: DEFAULT_HERO_MOBILE_LAYOUT,
};

export const DEFAULT_HERO_VIDEO_SLIDES: HeroVideoSlide[] = [
  {
    id: 'magsafe-video',
    label: 'MagSafe Frosted',
    kicker: 'Signature Showcase · Motorola · VIVO · Xiaomi',
    headline: 'Protect your phone with style.',
    description:
      'Frosted anti-fingerprint matte armor with integrated N52 MagSafe rings and raised metallic camera bezels.',
    videoSrc: '/assets/videos/hero-magsafe-reel.mp4',
    posterSrc: '/src/assets/images/hero_magsafe_showcase_1795455910914.jpg',
    posterAlt:
      'Frosted matte MagSafe phone cases with rose-gold and copper camera bezels on travertine stone',
    categoryTarget: 'All',
    featuredProductId: 'prod-1',
    startingPrice: 250,
    sortOrder: 0,
    active: true,
  },
  {
    id: 'carbon-video',
    label: 'Carbon Armor',
    kicker: 'Executive Edition · Kickstand · Lens Guard',
    headline: 'Precision fit. Everyday armor.',
    description:
      'Woven aramid-textured protection paired with machined aluminum lens framing built for slim daily resilience.',
    videoSrc: '/assets/videos/hero-carbon-reel.mp4',
    posterSrc: '/src/assets/images/hero_carbon_armor_1795548421139.jpg',
    posterAlt:
      'Woven carbon-fiber smartphone case with crimson trim and aluminum camera lens ring on slate',
    categoryTarget: 'Motorola',
    featuredProductId: 'prod-5',
    startingPrice: 600,
    sortOrder: 1,
    active: true,
  },
];

const HERO_VIDEOS_COLLECTION = 'heroVideos';
const HERO_CONFIG_COLLECTION = 'heroConfig';
const HERO_CONFIG_DOC_ID = 'default';
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const HERO_CACHE_STORAGE_KEY = 'classy_cases_hero_cache_v1';

export interface CachedHeroState {
  slides: HeroVideoSlide[];
  config: HeroPlaybackConfig | null;
}

export function loadCachedHeroState(): CachedHeroState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(HERO_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedHeroState>;
    if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      return null;
    }
    return {
      slides: parsed.slides,
      config: parsed.config ?? null,
    };
  } catch {
    return null;
  }
}

export function saveCachedHeroState(
  slides: HeroVideoSlide[],
  config: HeroPlaybackConfig | null
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      HERO_CACHE_STORAGE_KEY,
      JSON.stringify({ slides, config })
    );
  } catch {
    // ignore storage quota errors
  }
}

export function isValidHeroVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/assets/videos/') ||
    trimmed.startsWith('/media/hero-videos/')
  );
}

export function isValidPosterUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.length > 1000) return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/src/assets/images/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/media/')
  );
}

export function sanitizeSlideId(rawId: string): string {
  const cleaned = rawId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned && ID_PATTERN.test(cleaned) ? cleaned : `slide-${Date.now()}`;
}

function normalizeSlideData(id: string, data: Record<string, unknown>): HeroVideoSlide {
  return {
    id,
    label: typeof data.label === 'string' && data.label.trim() ? data.label.trim() : 'Hero Slide',
    kicker: typeof data.kicker === 'string' ? data.kicker : '',
    headline: typeof data.headline === 'string' && data.headline.trim() ? data.headline.trim() : 'Protect your phone with style.',
    description: typeof data.description === 'string' ? data.description : '',
    videoSrc: typeof data.videoSrc === 'string' ? data.videoSrc : '',
    posterSrc: typeof data.posterSrc === 'string' ? data.posterSrc : '',
    posterAlt: typeof data.posterAlt === 'string' ? data.posterAlt : 'Featured phone case showcase',
    categoryTarget: typeof data.categoryTarget === 'string' && data.categoryTarget.trim() ? data.categoryTarget : 'All',
    featuredProductId: typeof data.featuredProductId === 'string' ? data.featuredProductId : '',
    startingPrice: typeof data.startingPrice === 'number' && Number.isFinite(data.startingPrice) ? data.startingPrice : 0,
    sortOrder: typeof data.sortOrder === 'number' && Number.isFinite(data.sortOrder) ? data.sortOrder : 0,
    active: data.active !== false,
  };
}

function buildValidatedSlidePayload(
  slide: HeroVideoSlide,
  uid: string,
  existingCreatedAt?: Timestamp | null
) {
  const safeId = sanitizeSlideId(slide.id);
  const videoSrc = slide.videoSrc.trim().slice(0, 1000);
  if (!isValidHeroVideoUrl(videoSrc)) {
    throw new Error('Video URL must start with https://, /assets/videos/, or /media/hero-videos/.');
  }
  const posterSrc = slide.posterSrc.trim().slice(0, 1000);
  if (!isValidPosterUrl(posterSrc)) {
    throw new Error('Poster URL must be empty, an HTTPS URL, or a local /assets or /src/assets/images path.');
  }

  return {
    id: safeId,
    label: (slide.label.trim() || 'Hero Video').slice(0, 60),
    kicker: slide.kicker.trim().slice(0, 140),
    headline: (slide.headline.trim() || 'Protect your phone with style.').slice(0, 140),
    description: slide.description.trim().slice(0, 320),
    videoSrc,
    posterSrc,
    posterAlt: slide.posterAlt.trim().slice(0, 200),
    categoryTarget: (slide.categoryTarget.trim() || 'All').slice(0, 60),
    featuredProductId: slide.featuredProductId.trim().slice(0, 64),
    startingPrice: Math.min(1000000, Math.max(0, Number(slide.startingPrice) || 0)),
    sortOrder: Math.min(100, Math.max(0, Math.round(Number(slide.sortOrder) || 0))),
    active: Boolean(slide.active),
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedByUid: uid,
  };
}

export async function fetchPublicHeroSlides(): Promise<HeroVideoSlide[]> {
  try {
    const q = query(collection(db, HERO_VIDEOS_COLLECTION), where('active', '==', true));
    const snapshot = await getDocs(q);
    const slides = snapshot.docs.map((docSnap) =>
      normalizeSlideData(docSnap.id, docSnap.data() as Record<string, unknown>)
    );
    return slides.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, HERO_VIDEOS_COLLECTION);
  }
}

export async function fetchPublicHeroConfig(): Promise<HeroPlaybackConfig | null> {
  const path = `${HERO_CONFIG_COLLECTION}/${HERO_CONFIG_DOC_ID}`;
  try {
    const snap = await getDoc(doc(db, HERO_CONFIG_COLLECTION, HERO_CONFIG_DOC_ID));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      activeSlideId: typeof data.activeSlideId === 'string' ? data.activeSlideId : '',
      autoAdvanceSeconds:
        typeof data.autoAdvanceSeconds === 'number' && Number.isFinite(data.autoAdvanceSeconds)
          ? Math.min(30, Math.max(3, Math.round(data.autoAdvanceSeconds)))
          : DEFAULT_HERO_CONFIG.autoAdvanceSeconds,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchAdminHeroSlides(): Promise<HeroVideoSlide[]> {
  try {
    const snapshot = await getDocs(collection(db, HERO_VIDEOS_COLLECTION));
    const slides = snapshot.docs.map((docSnap) =>
      normalizeSlideData(docSnap.id, docSnap.data() as Record<string, unknown>)
    );
    return slides.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, HERO_VIDEOS_COLLECTION);
  }
}

export async function saveHeroVideoSlideToFirestore(slide: HeroVideoSlide): Promise<HeroVideoSlide> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please connect your Google admin account before saving to Firebase Firestore.');
  }

  const safeId = sanitizeSlideId(slide.id);
  const path = `${HERO_VIDEOS_COLLECTION}/${safeId}`;
  const slideRef = doc(db, HERO_VIDEOS_COLLECTION, safeId);

  try {
    const existingSnap = await getDoc(slideRef);
    const existingCreatedAt = existingSnap.exists()
      ? ((existingSnap.data() as { createdAt?: Timestamp }).createdAt ?? null)
      : null;

    const payload = buildValidatedSlidePayload(
      { ...slide, id: safeId },
      currentUser.uid,
      existingCreatedAt
    );

    await setDoc(slideRef, payload);
    return { ...slide, id: safeId };
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Video URL') || error.message.includes('Poster URL'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteHeroVideoSlideFromFirestore(slideId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please connect your Google admin account before deleting from Firebase Firestore.');
  }
  const safeId = sanitizeSlideId(slideId);
  const path = `${HERO_VIDEOS_COLLECTION}/${safeId}`;
  try {
    await deleteDoc(doc(db, HERO_VIDEOS_COLLECTION, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveHeroConfigToFirestore(config: HeroPlaybackConfig): Promise<HeroPlaybackConfig> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please connect your Google admin account before saving to Firebase Firestore.');
  }

  const path = `${HERO_CONFIG_COLLECTION}/${HERO_CONFIG_DOC_ID}`;
  const payload = {
    activeSlideId: config.activeSlideId.trim().slice(0, 64),
    autoAdvanceSeconds: Math.min(30, Math.max(3, Math.round(Number(config.autoAdvanceSeconds) || 9))),
    updatedAt: serverTimestamp(),
    updatedByUid: currentUser.uid,
  };

  try {
    await setDoc(doc(db, HERO_CONFIG_COLLECTION, HERO_CONFIG_DOC_ID), payload);
    return {
      activeSlideId: payload.activeSlideId,
      autoAdvanceSeconds: payload.autoAdvanceSeconds,
      mobileLayout: config.mobileLayout || DEFAULT_HERO_MOBILE_LAYOUT,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedDefaultHeroSlidesToFirestore(
  slides: HeroVideoSlide[],
  config: HeroPlaybackConfig
): Promise<void> {
  for (const slide of slides) {
    await saveHeroVideoSlideToFirestore(slide);
  }
  await saveHeroConfigToFirestore(config);
}
