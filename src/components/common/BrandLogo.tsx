import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HardDrive, Store } from 'lucide-react';
import {
  extractGoogleDriveFileId,
  getGoogleDriveDisplayUrl,
} from '../../services/googleDriveService';

interface BrandLogoProps {
  logoUrl?: string;
  logoDriveFileId?: string;
  logoDataUrl?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  fallback?: React.ReactNode;
  showDriveBadge?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  logoDriveFileId,
  logoDataUrl,
  alt = 'Logo da empresa',
  className = 'max-h-16 w-auto object-contain',
  containerClassName = '',
  fallback,
  showDriveBadge = false,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Extract fileId if present directly or inside the URL
  const fileId = logoDriveFileId || (logoUrl ? extractGoogleDriveFileId(logoUrl) : null);
  const isGoogleDrive = !!fileId;

  // Build ordered list of candidate image sources for resilient loading (local + GitHub Pages)
  const candidates = useMemo(() => {
    const list: string[] = [];
    const addUnique = (url?: string | null) => {
      const trimmed = url?.trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    };

    // 1. Embedded Base64 data URL (instant and works 100% offline / on GitHub Pages)
    if (logoDataUrl && logoDataUrl.startsWith('data:image/')) {
      addUnique(logoDataUrl);
    }
    if (logoUrl && logoUrl.startsWith('data:image/')) {
      addUnique(logoUrl);
    }

    // 2. Google Drive CDN & Thumbnail endpoints
    if (fileId) {
      addUnique(`https://lh3.googleusercontent.com/d/${fileId}=w1200`);
      addUnique(getGoogleDriveDisplayUrl(fileId, 1200));
    }

    // 3. Direct or local uploads URL
    if (logoUrl && !logoUrl.startsWith('data:image/')) {
      let url = logoUrl.trim();
      if (url.startsWith('/api/uploads/')) {
        url = url.replace(/^\/api\/uploads\//, 'uploads/');
      }
      if (url.startsWith('uploads/')) {
        const baseUrl = (import.meta as any).env?.BASE_URL || '/';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        addUnique(`${cleanBase}${url}`);
        addUnique(`/api/${url}`);
      } else {
        addUnique(url);
      }
    }

    // 4. Local backend Google Drive streaming proxy
    if (fileId) {
      addUnique(`/api/drive/image/${fileId}`);
    }

    return list;
  }, [logoUrl, logoDriveFileId, logoDataUrl, fileId]);

  const candidatesKey = candidates.join('||');
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const src = candidates[candidateIndex] || '';
  const isDataUri = src.startsWith('data:image/');

  const [hasError, setHasError] = useState<boolean>(() => candidates.length === 0);
  const [isLoading, setIsLoading] = useState<boolean>(() => candidates.length > 0 && !isDataUri);

  // Reset candidate index when the candidate list changes
  useEffect(() => {
    setCandidateIndex(0);
    const firstSrc = candidates[0] || '';
    if (!firstSrc) {
      setHasError(true);
      setIsLoading(false);
    } else if (firstSrc.startsWith('data:image/')) {
      setHasError(false);
      setIsLoading(false);
    } else {
      setHasError(false);
    }
  }, [candidatesKey]);

  // Check if the current <img> is already loaded (cached or synchronous data URI) or handle slow network
  useEffect(() => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    if (src.startsWith('data:image/')) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete) {
      if (imgEl.naturalWidth > 0) {
        setIsLoading(false);
        setHasError(false);
        return;
      }
    }

    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      const currentImg = imgRef.current;
      if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
        setIsLoading(false);
        setHasError(false);
      } else if (candidateIndex + 1 < candidates.length) {
        setCandidateIndex((prev) => prev + 1);
      } else {
        setIsLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [src, candidateIndex, candidates.length]);

  const handleError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
      return;
    }

    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  if (hasError || !src) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={`flex items-center justify-center p-2 rounded-xl bg-white/10 border border-white/20 text-slate-300 text-xs ${containerClassName}`}
        title="Logo não disponível"
      >
        <Store className="w-5 h-5 text-blue-400 mr-1.5" />
        <span className="font-semibold truncate">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${containerClassName}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
        className={`${className} transition-opacity duration-200 ${
          isLoading && !isDataUri ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {isLoading && !isDataUri && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-white/5 rounded-lg">
          <Store className="w-6 h-6 text-white/40 animate-pulse" />
        </div>
      )}

      {showDriveBadge && isGoogleDrive && (
        <span
          className="absolute -bottom-1 -right-1 p-0.5 bg-white/95 text-blue-600 rounded shadow-xs border border-blue-200"
          title="Logo hospedada no Google Drive (Zero Storage)"
        >
          <HardDrive className="w-3 h-3" />
        </span>
      )}
    </div>
  );
};
