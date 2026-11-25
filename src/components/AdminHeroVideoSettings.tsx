import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Cloud,
  Film,
  Link2,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Category, Product } from '../types';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import {
  DEFAULT_HERO_CONFIG,
  DEFAULT_HERO_MOBILE_LAYOUT,
  DEFAULT_HERO_VIDEO_SLIDES,
  deleteHeroVideoSlideFromFirestore,
  fetchAdminHeroSlides,
  fetchPublicHeroConfig,
  isValidHeroVideoUrl,
  resolveLatestHeroState,
  sanitizeSlideId,
  saveHeroConfigToFirestore,
  saveCachedHeroState,
  seedDefaultHeroSlidesToFirestore,
  type HeroMobileLayoutConfig,
  type HeroPlaybackConfig,
  type HeroVideoSlide,
} from '../services/heroVideoFirestore';
import firebaseConfig from '../../firebase-applet-config.json';

interface VideoLibraryItem {
  name: string;
  url: string;
  source: 'bundled' | 'uploaded';
  sizeBytes?: number;
}

interface AdminHeroVideoSettingsProps {
  adminToken: string;
  categories?: Category[];
  products?: Product[];
  onStatusMessage?: (msg: string) => void;
}

const PRESET_POSTERS = [
  {
    label: 'MagSafe Showcase',
    url: '/src/assets/images/hero_magsafe_showcase_1795548420846.jpg',
  },
  {
    label: 'Carbon Armor',
    url: '/src/assets/images/hero_carbon_armor_1795548421139.jpg',
  },
  {
    label: 'Frosted Gold',
    url: '/src/assets/images/case_magsafe_frosted_gold_1795455910914.jpg',
  },
  {
    label: 'Luxury Carbon Red',
    url: '/src/assets/images/case_luxury_carbon_red_1795455912097.jpg',
  },
];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFirestoreUiError(err: unknown): string {
  if (!(err instanceof Error)) return 'Could not save to Firebase Firestore.';
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    if (parsed?.error) {
      if (parsed.error.toLowerCase().includes('permission')) {
        return 'Firestore permission denied. Verify you are signed in with the store owner Google account and that firestore.rules are deployed.';
      }
      return parsed.error;
    }
  } catch {
    // Plain error message
  }
  return err.message;
}

function formatAuthUiError(err: unknown): string {
  const code =
    typeof err === 'object' && err && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : String(err || '');
  if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return `Google sign-in is blocked because "${host}" is not in Firebase Authorized Domains yet (Firebase Console → Project "${firebaseConfig.projectId}" → Authentication → Settings → Authorized domains). You can still upload, save, and delete hero videos right now.`;
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in popup was closed before finishing.';
  }
  return msg || 'Google sign-in failed.';
}

async function capturePosterBlobFromVideoSource(src: string): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  return await new Promise<Blob | null>((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    if (src.startsWith('http://') || src.startsWith('https://')) {
      video.crossOrigin = 'anonymous';
    }

    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      video.removeAttribute('src');
      video.load();
      resolve(blob);
    };

    const timeoutId = window.setTimeout(() => finish(null), 5000);

    const drawFrame = () => {
      try {
        const vw = video.videoWidth || 1280;
        const vh = video.videoHeight || 720;
        if (!vw || !vh) {
          finish(null);
          return;
        }
        const scale = Math.min(1, 1280 / vw);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(vw * scale));
        canvas.height = Math.max(1, Math.round(vh * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.78);
      } catch {
        finish(null);
      }
    };

    video.onloadedmetadata = () => {
      const targetTime =
        Number.isFinite(video.duration) && video.duration > 0.4
          ? Math.min(0.35, video.duration * 0.15)
          : 0;
      if (targetTime > 0) {
        video.currentTime = targetTime;
      } else {
        drawFrame();
      }
    };

    video.onseeked = drawFrame;
    video.onerror = () => finish(null);
    video.src = src;
  });
}

async function capturePosterBlobFromVideoFile(file: File): Promise<Blob | null> {
  if (typeof URL === 'undefined') return null;
  const objectUrl = URL.createObjectURL(file);
  try {
    return await capturePosterBlobFromVideoSource(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AdminHeroVideoSettings({
  adminToken,
  categories = [],
  products = [],
  onStatusMessage,
}: AdminHeroVideoSettingsProps) {
  const { user, loading: authLoading, signInWithGoogle } = useFirebaseAuth();
  const [slides, setSlides] = useState<HeroVideoSlide[]>(DEFAULT_HERO_VIDEO_SLIDES);
  const [selectedSlideId, setSelectedSlideId] = useState<string>(DEFAULT_HERO_VIDEO_SLIDES[0].id);
  const [heroConfig, setHeroConfig] = useState<HeroPlaybackConfig>(DEFAULT_HERO_CONFIG);
  const [hasFirestoreDocs, setHasFirestoreDocs] = useState(false);
  const [hasServerDocs, setHasServerDocs] = useState(false);

  const [libraryVideos, setLibraryVideos] = useState<VideoLibraryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deletingVideoUrl, setDeletingVideoUrl] = useState<string | null>(null);
  const [savingFirestore, setSavingFirestore] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewVideoError, setPreviewVideoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedSlide = useMemo(
    () => slides.find((s) => s.id === selectedSlideId) || slides[0] || DEFAULT_HERO_VIDEO_SLIDES[0],
    [slides, selectedSlideId]
  );

  useEffect(() => {
    setPreviewVideoError(false);
  }, [selectedSlide.id, selectedSlide.videoSrc]);

  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/hero-videos/library', {
        credentials: 'same-origin',
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      });
      if (res.ok) {
        const data = (await res.json()) as { videos?: VideoLibraryItem[] };
        setLibraryVideos(Array.isArray(data.videos) ? data.videos : []);
      }
    } catch {
      // ignore transient library read failure
    }
  }, [adminToken]);

  const persistToBackend = useCallback(
    async (nextSlides: HeroVideoSlide[], nextConfig: HeroPlaybackConfig) => {
      const res = await fetch('/api/admin/hero-videos/config', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ slides: nextSlides, config: nextConfig }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save hero video settings.');
      }
      setHasServerDocs(true);
      const saved = data as { slides: HeroVideoSlide[]; config: HeroPlaybackConfig };
      const activeSlides = (Array.isArray(saved.slides) ? saved.slides : nextSlides).filter(
        (s) => s.active !== false
      );
      saveCachedHeroState(activeSlides, saved.config || nextConfig);
      return saved;
    },
    [adminToken]
  );

  const loadFirestoreHeroData = useCallback(async () => {
    setLoadingData(true);
    setErrorMsg('');
    try {
      const [remoteSlides, remoteConfig, serverRes] = await Promise.all([
        fetchAdminHeroSlides().catch(() => []),
        fetchPublicHeroConfig().catch(() => null),
        fetch('/api/hero-videos')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null) as Promise<{
          slides?: HeroVideoSlide[];
          config?: HeroPlaybackConfig | null;
        } | null>,
      ]);

      const serverSlides = Array.isArray(serverRes?.slides) ? serverRes.slides : [];
      setHasServerDocs(serverSlides.length > 0);
      setHasFirestoreDocs(remoteSlides.length > 0);

      const resolved = resolveLatestHeroState({
        serverSlides,
        serverConfig: serverRes?.config || null,
        remoteSlides,
        remoteConfig,
      });

      const nextSlides = resolved.slides;
      const preferred =
        resolved.config?.activeSlideId &&
        nextSlides.some((s) => s.id === resolved.config?.activeSlideId)
          ? resolved.config.activeSlideId
          : nextSlides[0]?.id || DEFAULT_HERO_VIDEO_SLIDES[0].id;

      setSlides(nextSlides);
      setSelectedSlideId(preferred);
      setHeroConfig({
        ...(resolved.config || DEFAULT_HERO_CONFIG),
        activeSlideId: preferred,
        mobileLayout: {
          ...DEFAULT_HERO_MOBILE_LAYOUT,
          ...(resolved.config?.mobileLayout || {}),
        },
      });
    } catch (err) {
      setErrorMsg(formatFirestoreUiError(err));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (!authLoading) {
      void loadFirestoreHeroData();
    }
  }, [authLoading, user?.uid, loadFirestoreHeroData]);

  function notifySuccess(msg: string) {
    setBannerMsg(msg);
    onStatusMessage?.(msg);
    window.dispatchEvent(new CustomEvent('hero-videos-updated'));
    window.setTimeout(() => {
      setBannerMsg((prev) => (prev === msg ? '' : prev));
    }, 3600);
  }

  function updateSelectedSlide(patch: Partial<HeroVideoSlide>) {
    setSlides((prev) =>
      prev.map((slide) => (slide.id === selectedSlide.id ? { ...slide, ...patch } : slide))
    );
  }

  function updateMobileLayout(patch: Partial<HeroMobileLayoutConfig>) {
    setHeroConfig((prev) => ({
      ...prev,
      mobileLayout: {
        ...DEFAULT_HERO_MOBILE_LAYOUT,
        ...(prev.mobileLayout || {}),
        ...patch,
      },
    }));
  }

  const mobileLayout: HeroMobileLayoutConfig = {
    ...DEFAULT_HERO_MOBILE_LAYOUT,
    ...(heroConfig.mobileLayout || {}),
  };

  async function handleConnectGoogle() {
    setConnectingGoogle(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      notifySuccess('Google account connected to Firebase Firestore.');
      await loadFirestoreHeroData();
    } catch (err) {
      setErrorMsg(formatAuthUiError(err));
    } finally {
      setConnectingGoogle(false);
    }
  }

  async function uploadPosterBlob(blob: Blob | null, baseName: string): Promise<string> {
    if (!blob || blob.size <= 0) return '';
    try {
      const posterRes = await fetch('/api/admin/hero-videos/poster', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': blob.type || 'image/jpeg',
          'X-Filename': `${baseName.replace(/\.[^.]+$/, '')}-poster.jpg`,
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${adminToken}`,
        },
        body: blob,
      });
      const posterData = await posterRes.json().catch(() => ({}));
      if (posterRes.ok && posterData.url) {
        return String(posterData.url);
      }
    } catch {
      // ignore transient poster capture upload error
    }
    return '';
  }

  async function saveSlidesAndConfig(
    targetSlides: HeroVideoSlide[],
    targetConfig: HeroPlaybackConfig,
    successMsg: string
  ) {
    setErrorMsg('');
    const invalidSlide = targetSlides.find((s) => !isValidHeroVideoUrl(s.videoSrc));
    if (invalidSlide) {
      setErrorMsg(
        `Video URL for "${invalidSlide.label}" must start with https://, /assets/videos/, or /media/hero-videos/.`
      );
      return;
    }

    setSavingFirestore(true);
    try {
      const saved = await persistToBackend(targetSlides, targetConfig);
      const nextSlides = Array.isArray(saved.slides) ? saved.slides : targetSlides;
      const nextConfig = saved.config || targetConfig;
      setSlides(nextSlides);
      setHeroConfig(nextConfig);

      if (user) {
        try {
          await seedDefaultHeroSlidesToFirestore(nextSlides, nextConfig);
          setHasFirestoreDocs(true);
          notifySuccess(`${successMsg} Synced to Firebase Firestore.`);
        } catch (fsErr) {
          setErrorMsg(
            `Saved on store server, but Firestore sync failed: ${formatFirestoreUiError(fsErr)}`
          );
          notifySuccess(successMsg);
        }
      } else {
        notifySuccess(successMsg);
      }
    } catch (err) {
      setErrorMsg(formatFirestoreUiError(err));
    } finally {
      setSavingFirestore(false);
    }
  }

  async function handleVideoFileUpload(file: File | undefined) {
    if (!file) return;
    setErrorMsg('');
    const lower = file.name.toLowerCase();
    const validType =
      file.type.startsWith('video/') || /\.(mp4|webm|mov|ogv)$/i.test(lower);
    if (!validType) {
      setErrorMsg('Please upload an MP4, WEBM, MOV, or OGV video file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Video size must be under 25 MB.');
      return;
    }

    setUploadingVideo(true);
    try {
      const [uploadRes, capturedPosterBlob] = await Promise.all([
        fetch('/api/admin/hero-videos/upload', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': file.type || 'video/mp4',
            'X-Filename': file.name,
            'X-Requested-With': 'XMLHttpRequest',
            Authorization: `Bearer ${adminToken}`,
          },
          body: file,
        }),
        capturePosterBlobFromVideoFile(file).catch(() => null),
      ]);

      const data = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !data.url) {
        throw new Error(data.error || 'Video upload failed.');
      }

      let nextPosterSrc = PRESET_POSTERS.some((p) => p.url === selectedSlide.posterSrc)
        ? ''
        : selectedSlide.posterSrc;

      const uploadedPosterUrl = await uploadPosterBlob(capturedPosterBlob, file.name);
      if (uploadedPosterUrl) {
        nextPosterSrc = uploadedPosterUrl;
      }

      const uploadedUrl = String(data.url);
      const isInitialReplacement = !hasServerDocs && !hasFirestoreDocs;
      const updatedSlide: HeroVideoSlide = {
        ...selectedSlide,
        videoSrc: uploadedUrl,
        posterSrc: nextPosterSrc,
        active: true,
      };
      const nextSlides = slides.map((s) => {
        if (s.id === selectedSlide.id) return updatedSlide;
        if (isInitialReplacement && s.videoSrc.startsWith('/assets/videos/')) {
          return { ...s, active: false };
        }
        return s;
      });
      const nextConfig: HeroPlaybackConfig = {
        ...heroConfig,
        activeSlideId: selectedSlide.id,
      };
      setSlides(nextSlides);
      setHeroConfig(nextConfig);
      setPreviewVideoError(false);
      await loadLibrary();

      await saveSlidesAndConfig(
        nextSlides,
        nextConfig,
        'Video uploaded and set as starting hero video.'
      );
    } catch (err) {
      setErrorMsg(formatFirestoreUiError(err));
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleSelectLibraryVideo(vid: VideoLibraryItem) {
    setErrorMsg('');
    const hasPresetPoster = PRESET_POSTERS.some((p) => p.url === selectedSlide.posterSrc);
    let nextPosterSrc =
      vid.source === 'uploaded' && hasPresetPoster ? '' : selectedSlide.posterSrc;

    if (
      vid.source === 'uploaded' &&
      (!nextPosterSrc || hasPresetPoster) &&
      vid.url.startsWith('/media/hero-videos/')
    ) {
      const blob = await capturePosterBlobFromVideoSource(vid.url).catch(() => null);
      const uploadedPoster = await uploadPosterBlob(blob, vid.name);
      if (uploadedPoster) {
        nextPosterSrc = uploadedPoster;
      }
    }

    const updatedSlide: HeroVideoSlide = {
      ...selectedSlide,
      videoSrc: vid.url,
      posterSrc: nextPosterSrc,
      active: true,
    };
    const isInitialReplacement =
      vid.source === 'uploaded' && !hasServerDocs && !hasFirestoreDocs;
    const nextSlides = slides.map((s) => {
      if (s.id === selectedSlide.id) return updatedSlide;
      if (isInitialReplacement && s.videoSrc.startsWith('/assets/videos/')) {
        return { ...s, active: false };
      }
      return s;
    });
    const nextConfig: HeroPlaybackConfig = {
      ...heroConfig,
      activeSlideId: selectedSlide.id,
    };
    setSlides(nextSlides);
    setHeroConfig(nextConfig);
    setPreviewVideoError(false);

    await saveSlidesAndConfig(
      nextSlides,
      nextConfig,
      `Selected "${vid.name}" for ${selectedSlide.label}.`
    );
  }

  async function handleSetStartingSlide(slideId: string) {
    const nextSlides = slides.map((s) =>
      s.id === slideId ? { ...s, active: true } : s
    );
    const nextConfig: HeroPlaybackConfig = {
      ...heroConfig,
      activeSlideId: slideId,
    };
    setSlides(nextSlides);
    setHeroConfig(nextConfig);
    const label = nextSlides.find((s) => s.id === slideId)?.label || 'selected slide';
    await saveSlidesAndConfig(
      nextSlides,
      nextConfig,
      `Set "${label}" as starting hero video.`
    );
  }

  async function handleSaveSlideAndConfig() {
    await saveSlidesAndConfig(
      slides,
      heroConfig,
      `Saved "${selectedSlide.label}" and hero playback settings.`
    );
  }

  async function handleSyncAllSlidesToFirestore() {
    setErrorMsg('');
    setSavingFirestore(true);
    try {
      await persistToBackend(slides, heroConfig);
      if (!user) {
        notifySuccess('Saved all hero slides to store server.');
        return;
      }
      await seedDefaultHeroSlidesToFirestore(slides, heroConfig);
      setHasFirestoreDocs(true);
      notifySuccess('All hero slides and settings synced to Firebase Firestore.');
    } catch (err) {
      setErrorMsg(formatFirestoreUiError(err));
    } finally {
      setSavingFirestore(false);
    }
  }

  function handleAddNewSlide() {
    const index = slides.length + 1;
    const newId = sanitizeSlideId(`hero-slide-${Date.now().toString().slice(-5)}`);
    const uploadedVid = libraryVideos.find((v) => v.source === 'uploaded');
    const defaultVideo =
      uploadedVid?.url || libraryVideos[0]?.url || DEFAULT_HERO_VIDEO_SLIDES[0].videoSrc;
    const newSlide: HeroVideoSlide = {
      id: newId,
      label: `Hero Reel ${index}`,
      kicker: 'Featured Drop · Classy Cases',
      headline: 'New arrival showcase.',
      description: 'Precision molded protection with slim ergonomic feel.',
      videoSrc: defaultVideo,
      posterSrc: '',
      posterAlt: 'Hero video showcase slide',
      categoryTarget: 'All',
      featuredProductId: products[0]?.id || '',
      startingPrice: products[0]?.price || 250,
      sortOrder: slides.length,
      active: true,
    };
    setSlides((prev) => [...prev, newSlide]);
    setSelectedSlideId(newId);
    setHeroConfig((prev) => ({ ...prev, activeSlideId: newId }));
  }

  async function handleDeleteSlide(slideId: string) {
    if (slides.length <= 1) {
      setErrorMsg('At least one hero video slide is required. Add another slide or replace this video.');
      return;
    }
    setErrorMsg('');
    const remaining = slides
      .filter((s) => s.id !== slideId)
      .map((s, idx) => ({ ...s, sortOrder: idx }));
    const nextConfig: HeroPlaybackConfig =
      heroConfig.activeSlideId === slideId
        ? { ...heroConfig, activeSlideId: remaining[0].id }
        : heroConfig;

    setSlides(remaining);
    if (selectedSlideId === slideId) {
      setSelectedSlideId(remaining[0].id);
    }
    setHeroConfig(nextConfig);

    setSavingFirestore(true);
    try {
      await persistToBackend(remaining, nextConfig);

      if (user && hasFirestoreDocs) {
        try {
          await deleteHeroVideoSlideFromFirestore(slideId);
          if (nextConfig.activeSlideId !== heroConfig.activeSlideId) {
            await saveHeroConfigToFirestore(nextConfig);
          }
          notifySuccess('Hero slide deleted and synced to Firebase Firestore.');
        } catch (fsErr) {
          setErrorMsg(
            `Deleted on store server, but Firestore sync failed: ${formatFirestoreUiError(fsErr)}`
          );
          notifySuccess('Hero slide deleted.');
        }
      } else {
        notifySuccess('Hero slide deleted.');
      }
    } catch (err) {
      setErrorMsg(formatFirestoreUiError(err));
    } finally {
      setSavingFirestore(false);
    }
  }

  async function handleDeleteLibraryVideo(videoUrl: string) {
    if (
      !videoUrl.startsWith('/media/hero-videos/') &&
      !videoUrl.startsWith('/assets/videos/')
    ) {
      return;
    }
    setErrorMsg('');
    setDeletingVideoUrl(videoUrl);
    try {
      const res = await fetch('/api/admin/hero-videos/file', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ url: videoUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete video.');
      }

      const remainingLibrary = libraryVideos.filter((v) => v.url !== videoUrl);
      setLibraryVideos(remainingLibrary);

      const affectedSlides = slides.filter((s) => s.videoSrc === videoUrl);
      if (affectedSlides.length > 0) {
        const unaffectedSlides = slides.filter((s) => s.videoSrc !== videoUrl);
        if (unaffectedSlides.length > 0) {
          const nextSlides = unaffectedSlides.map((s, idx) => ({ ...s, sortOrder: idx }));
          const nextActiveId = nextSlides.some((s) => s.id === heroConfig.activeSlideId)
            ? heroConfig.activeSlideId
            : nextSlides[0].id;
          const nextConfig: HeroPlaybackConfig = {
            ...heroConfig,
            activeSlideId: nextActiveId,
          };
          setSlides(nextSlides);
          if (!nextSlides.some((s) => s.id === selectedSlideId)) {
            setSelectedSlideId(nextSlides[0].id);
          }
          setHeroConfig(nextConfig);
          await persistToBackend(nextSlides, nextConfig);
          if (user && hasFirestoreDocs) {
            await seedDefaultHeroSlidesToFirestore(nextSlides, nextConfig).catch(() => {});
          }
        } else {
          const fallbackUploaded = remainingLibrary.find((v) => v.source === 'uploaded');
          const fallbackUrl = fallbackUploaded?.url || remainingLibrary[0]?.url || '';
          if (fallbackUrl) {
            const first = slides[0];
            const updatedSlide: HeroVideoSlide = {
              ...first,
              videoSrc: fallbackUrl,
              posterSrc: PRESET_POSTERS.some((p) => p.url === first.posterSrc)
                ? ''
                : first.posterSrc,
              sortOrder: 0,
              active: true,
            };
            const nextSlides = [updatedSlide];
            const nextConfig: HeroPlaybackConfig = {
              ...heroConfig,
              activeSlideId: updatedSlide.id,
            };
            setSlides(nextSlides);
            setSelectedSlideId(updatedSlide.id);
            setHeroConfig(nextConfig);
            await persistToBackend(nextSlides, nextConfig);
            if (user && hasFirestoreDocs) {
              await seedDefaultHeroSlidesToFirestore(nextSlides, nextConfig).catch(() => {});
            }
          } else {
            const cleared = slides.map((s) =>
              s.videoSrc === videoUrl ? { ...s, videoSrc: '', posterSrc: '' } : s
            );
            setSlides(cleared);
            setErrorMsg('Video deleted. Upload or paste a new video URL and click Save Hero Settings.');
            return;
          }
        }
      }

      notifySuccess(
        videoUrl.startsWith('/assets/videos/')
          ? 'Built-in default video removed.'
          : 'Uploaded video deleted.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete video.');
    } finally {
      setDeletingVideoUrl(null);
    }
  }

  async function handleRemoveAllDefaultVideos() {
    const customSlides = slides.filter((s) => !s.videoSrc.startsWith('/assets/videos/'));
    if (customSlides.length === 0) {
      setErrorMsg('Upload or add your own custom video first before removing all default videos.');
      return;
    }
    setErrorMsg('');
    setSavingFirestore(true);
    try {
      const builtInUrls = Array.from(
        new Set([
          ...libraryVideos.filter((v) => v.source === 'bundled').map((v) => v.url),
          ...slides
            .filter((s) => s.videoSrc.startsWith('/assets/videos/'))
            .map((s) => s.videoSrc),
        ])
      );
      for (const url of builtInUrls) {
        await fetch('/api/admin/hero-videos/file', {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ url }),
        }).catch(() => {});
      }

      const nextSlides = customSlides.map((s, idx) => ({ ...s, sortOrder: idx }));
      const nextActiveId = nextSlides.some((s) => s.id === heroConfig.activeSlideId)
        ? heroConfig.activeSlideId
        : nextSlides[0].id;
      const nextConfig: HeroPlaybackConfig = {
        ...heroConfig,
        activeSlideId: nextActiveId,
      };
      setSlides(nextSlides);
      setSelectedSlideId(nextActiveId);
      setHeroConfig(nextConfig);
      setLibraryVideos((prev) => prev.filter((v) => v.source !== 'bundled'));

      await persistToBackend(nextSlides, nextConfig);
      if (user) {
        await seedDefaultHeroSlidesToFirestore(nextSlides, nextConfig).catch(() => {});
        setHasFirestoreDocs(true);
      }
      notifySuccess('Removed all default videos. Storefront will only play your custom hero video.');
    } catch (err) {
      setErrorMsg(formatFirestoreUiError(err));
    } finally {
      setSavingFirestore(false);
    }
  }

  const hasCustomSlide = slides.some(
    (s) => Boolean(s.videoSrc) && !s.videoSrc.startsWith('/assets/videos/')
  );
  const hasBuiltInDefault =
    slides.some((s) => s.videoSrc.startsWith('/assets/videos/')) ||
    libraryVideos.some((v) => v.source === 'bundled');

  return (
    <div className="space-y-5">
      {/* Firebase Firestore Status & Auth Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Hero Video Storage &amp; Firebase Firestore
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  hasFirestoreDocs
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : hasServerDocs
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                }`}
              >
                {hasFirestoreDocs
                  ? 'Synced with Firestore'
                  : hasServerDocs
                    ? 'Saved on Store Server'
                    : 'Using Default Templates'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              DB: {firebaseConfig.firestoreDatabaseId}
              {user?.email ? ` · Signed in: ${user.email}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!user ? (
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={connectingGoogle}
              className="px-3.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/25 inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {connectingGoogle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>Sign in with Google to Sync Firestore</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSyncAllSlidesToFirestore}
              disabled={savingFirestore}
              className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/70 inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {savingFirestore ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Sync All Slides to Firestore</span>
            </button>
          )}
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Playback Config */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Default Starting Hero Video Slide
          </label>
          <select
            value={heroConfig.activeSlideId}
            onChange={(e) =>
              setHeroConfig((prev) => ({ ...prev, activeSlideId: e.target.value }))
            }
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
          >
            {slides.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.active ? 'Active' : 'Hidden'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Auto-Advance Interval (seconds)
          </label>
          <input
            type="number"
            min={3}
            max={30}
            value={heroConfig.autoAdvanceSeconds}
            onChange={(e) =>
              setHeroConfig((prev) => ({
                ...prev,
                autoAdvanceSeconds: Math.min(30, Math.max(3, Number(e.target.value) || 9)),
              }))
            }
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Phone View (Mobile Hero Layout) Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Phone View Hero Layout
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Control how the hero text, Explore button, and arrows appear on mobile screens (Desktop view stays unchanged).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveSlideAndConfig}
            disabled={savingFirestore}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {savingFirestore ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Save Phone Layout</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Phone Heading Placement
            </label>
            <select
              value={mobileLayout.position}
              onChange={(e) =>
                updateMobileLayout({
                  position: e.target.value as HeroMobileLayoutConfig['position'],
                })
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
            >
              <option value="bottom-left">Bottom Left (Above Slide Dots)</option>
              <option value="center">Vertical Center</option>
              <option value="top-left">Top Left</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Phone Heading Size
            </label>
            <select
              value={mobileLayout.textSize}
              onChange={(e) =>
                updateMobileLayout({
                  textSize: e.target.value as HeroMobileLayoutConfig['textSize'],
                })
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
            >
              <option value="xs">Extra Small (Compact)</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {[
            { key: 'showExploreButton' as const, label: 'Explore Button' },
            { key: 'showArrows' as const, label: 'Side Arrows (< >)' },
            { key: 'showKicker' as const, label: 'Eyebrow Kicker' },
            { key: 'showDescription' as const, label: 'Description Text' },
            { key: 'showProductButton' as const, label: 'Product Price Tag' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={mobileLayout[item.key]}
                onChange={(e) => updateMobileLayout({ [item.key]: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-700"
              />
              <span className="truncate">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main Slides Selector + Editor */}
      {loadingData ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-12 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>Loading hero video configuration...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Slide List */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hero Slides ({slides.length})
              </h3>
              <button
                type="button"
                onClick={handleAddNewSlide}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/25 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slide</span>
              </button>
            </div>

            <div className="space-y-2">
              {slides.map((slide, idx) => {
                const isSelected = slide.id === selectedSlide.id;
                const isDefault = heroConfig.activeSlideId === slide.id;
                return (
                  <div
                    key={slide.id}
                    className={`rounded-xl border p-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/15'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                    onClick={() => setSelectedSlideId(slide.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {slide.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {slide.videoSrc}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteSlide(slide.id);
                        }}
                        aria-label={`Delete ${slide.label}`}
                        title={
                          slides.length > 1
                            ? `Delete ${slide.label}`
                            : 'At least one hero slide is required'
                        }
                        className={`p-1 rounded transition-colors ${
                          slides.length > 1
                            ? 'text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold">
                      <span
                        className={
                          slide.active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500'
                        }
                      >
                        {slide.active ? 'Active' : 'Hidden'}
                      </span>
                      {isDefault && (
                        <span className="text-indigo-600 dark:text-indigo-400">· Default Start</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Slide Editor & Video Selector */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Editing: {selectedSlide.label}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {heroConfig.activeSlideId !== selectedSlide.id && (
                  <button
                    type="button"
                    disabled={savingFirestore}
                    onClick={() => void handleSetStartingSlide(selectedSlide.id)}
                    className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/25 disabled:opacity-50"
                  >
                    Set as Starting Slide
                  </button>
                )}

                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSlide.active}
                    onChange={(e) => updateSelectedSlide({ active: e.target.checked })}
                    className="rounded border-slate-300 dark:border-slate-700"
                  />
                  <span>Show on Storefront</span>
                </label>

                <button
                  type="button"
                  onClick={handleSaveSlideAndConfig}
                  disabled={savingFirestore}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingFirestore ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{user ? 'Save & Sync Firestore' : 'Save Hero Settings'}</span>
                </button>
              </div>
            </div>

            {/* Live Hero Video Preview */}
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#240306] relative aspect-[16/7]">
                {selectedSlide.videoSrc ? (
                  <video
                    key={selectedSlide.videoSrc}
                    src={selectedSlide.videoSrc}
                    poster={selectedSlide.posterSrc || undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    onLoadStart={() => setPreviewVideoError(false)}
                    onLoadedData={() => setPreviewVideoError(false)}
                    onCanPlay={() => setPreviewVideoError(false)}
                    onError={() => setPreviewVideoError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-300">
                    Select or upload a video to preview
                  </div>
                )}
                <div className="pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 text-[11px] font-medium text-white">
                  Live Hero Video Preview
                </div>
              </div>

              {previewVideoError && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    Video file (<code className="font-mono">{selectedSlide.videoSrc}</code>) could not be loaded on the server. Please upload your video again or paste an HTTPS video URL, then click <strong>Save Hero Settings</strong>.
                  </span>
                </div>
              )}
            </div>

            {/* Upload or Paste Video URL */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Video Source (Upload File, Paste URL, or Pick from Library)
                </span>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov"
                    className="hidden"
                    onChange={(e) => {
                      void handleVideoFileUpload(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {uploadingVideo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                    <span>{uploadingVideo ? 'Uploading Video...' : 'Upload Video (MP4/WEBM, max 25MB)'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Active Video URL
                </label>
                <div className="relative">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={selectedSlide.videoSrc}
                    onChange={(e) => updateSelectedSlide({ videoSrc: e.target.value })}
                    placeholder="https://... or /assets/videos/hero-magsafe-reel.mp4"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Selectable Video Library */}
              {libraryVideos.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Select from Available Videos (auto-saves immediately)
                    </span>
                    {hasCustomSlide && hasBuiltInDefault && (
                      <button
                        type="button"
                        disabled={savingFirestore}
                        onClick={() => void handleRemoveAllDefaultVideos()}
                        className="px-2 py-1 rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        Remove Default Videos
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {libraryVideos.map((vid) => {
                      const active = selectedSlide.videoSrc === vid.url;
                      const isDeletingThis = deletingVideoUrl === vid.url;
                      return (
                        <div
                          key={vid.url}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                            active
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-100'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <button
                            type="button"
                            disabled={savingFirestore}
                            onClick={() => void handleSelectLibraryVideo(vid)}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                          >
                            <Play className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{vid.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {vid.source === 'bundled' ? 'Built-in Reel' : 'Uploaded Video'}
                                {vid.sizeBytes ? ` · ${formatBytes(vid.sizeBytes)}` : ''}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {active && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                            <button
                              type="button"
                              onClick={() => void handleDeleteLibraryVideo(vid.url)}
                              disabled={isDeletingThis}
                              aria-label={`Delete video ${vid.name}`}
                              title={
                                vid.source === 'bundled'
                                  ? 'Delete built-in reel from library'
                                  : 'Delete uploaded video file'
                              }
                              className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded disabled:opacity-50"
                            >
                              {isDeletingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Slide Content & Linking */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Slide Tab Label</label>
                <input
                  type="text"
                  maxLength={60}
                  value={selectedSlide.label}
                  onChange={(e) => updateSelectedSlide({ label: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Sort Order</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={selectedSlide.sortOrder}
                  onChange={(e) =>
                    updateSelectedSlide({ sortOrder: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg tabular-nums focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Eyebrow Kicker</label>
                <input
                  type="text"
                  maxLength={140}
                  value={selectedSlide.kicker}
                  onChange={(e) => updateSelectedSlide({ kicker: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Headline</label>
                <input
                  type="text"
                  maxLength={140}
                  value={selectedSlide.headline}
                  onChange={(e) => updateSelectedSlide({ headline: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  maxLength={320}
                  value={selectedSlide.description}
                  onChange={(e) => updateSelectedSlide({ description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Fallback Poster Image URL
                </label>
                <input
                  type="text"
                  maxLength={1000}
                  value={selectedSlide.posterSrc}
                  onChange={(e) => updateSelectedSlide({ posterSrc: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {PRESET_POSTERS.map((p) => (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() => updateSelectedSlide({ posterSrc: p.url })}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Explore CTA Category Target
                  </label>
                  <select
                    value={selectedSlide.categoryTarget}
                    onChange={(e) => updateSelectedSlide({ categoryTarget: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Featured Product Quick-Link
                  </label>
                  <select
                    value={selectedSlide.featuredProductId}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      updateSelectedSlide({
                        featuredProductId: e.target.value,
                        startingPrice: prod ? prod.price : selectedSlide.startingPrice,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Auto-match by category</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.title} (৳{prod.price})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
