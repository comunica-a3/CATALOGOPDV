import React, { useEffect, useState } from 'react';
import { HardDrive, ImageOff, Store } from 'lucide-react';
import {
  extractGoogleDriveFileId,
  getGoogleDriveDisplayUrl,
} from '../../services/googleDriveService';

interface BrandLogoProps {
  logoUrl?: string;
  logoDriveFileId?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  fallback?: React.ReactNode;
  showDriveBadge?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  logoDriveFileId,
  alt = 'Logo da empresa',
  className = 'max-h-16 w-auto object-contain',
  containerClassName = '',
  fallback,
  showDriveBadge = false,
}) => {
  // Extract fileId if present directly or inside the URL
  const fileId = logoDriveFileId || (logoUrl ? extractGoogleDriveFileId(logoUrl) : null);
  const isGoogleDrive = !!fileId;

  // Determine primary display URL
  const getInitialSrc = (): string => {
    if (fileId) {
      return getGoogleDriveDisplayUrl(fileId, 1200);
    }
    return logoUrl?.trim() || '';
  };

  const [src, setSrc] = useState<string>(getInitialSrc);
  const [triedProxy, setTriedProxy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize when props change
  useEffect(() => {
    const initial = getInitialSrc();
    setSrc(initial);
    setTriedProxy(false);
    setHasError(!initial);
    setIsLoading(!!initial);
  }, [logoUrl, logoDriveFileId]);

  const handleError = () => {
    // If it's a Google Drive file and we haven't tried the backend streaming proxy yet
    if (fileId && !triedProxy) {
      setTriedProxy(true);
      setSrc(`/api/drive/image/${fileId}`);
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
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
        className={`${className} transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {isLoading && (
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
