import { AlertTriangle, Boxes, CloudOff, FileCode, HardDrive, Layers, Package, Sparkles, Tag } from 'lucide-react';
import React, { useState } from 'react';
import { ItemType } from '../../types';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  itemType?: ItemType;
  categoryName?: string;
  iconClassName?: string;
  showBadge?: boolean;
  imageSource?: 'upload' | 'url' | 'google_drive' | string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  itemType,
  categoryName,
  iconClassName = 'w-6 h-6',
  showBadge = false,
  imageSource,
}) => {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = React.useMemo(() => {
    if (!src || typeof src !== 'string' || src.trim() === '') return '';
    let url = src.trim();
    // Resolve /api/uploads/ para caminho estático acessível em qualquer ambiente (GitHub Pages ou local)
    if (url.startsWith('/api/uploads/')) {
      url = url.replace(/^\/api\/uploads\//, 'uploads/');
    }
    // Garante que uploads/ seja precedido pelo BASE_URL do Vite no GitHub Pages
    if (url.startsWith('uploads/')) {
      const baseUrl = (import.meta as any).env?.BASE_URL || '/';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      url = `${cleanBase}${url}`;
    }
    return url;
  }, [src]);

  React.useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  const isGoogleDrive =
    imageSource === 'google_drive' ||
    (typeof resolvedSrc === 'string' && (resolvedSrc.includes('drive.google.com') || resolvedSrc.includes('/api/drive/image/')));

  const isPersonalized =
    itemType === 'sep_personalizados_1789070149013' ||
    (typeof itemType === 'string' && itemType.toLowerCase().includes('personalizad'));

  const getIcon = () => {
    if (isPersonalized) {
      return <Sparkles className={`${iconClassName} text-pink-500`} />;
    }
    switch (itemType) {
      case 'PRODUTO_GRAFICO':
        return <Layers className={`${iconClassName} text-blue-500`} />;
      case 'PRODUTO_FISICO':
        return <Package className={`${iconClassName} text-purple-500`} />;
      case 'SERVICO':
        return <FileCode className={`${iconClassName} text-emerald-500`} />;
      default:
        return <Boxes className={`${iconClassName} text-slate-400`} />;
    }
  };

  const getBgColor = () => {
    if (isPersonalized) {
      return 'bg-pink-50/70 border-pink-100';
    }
    switch (itemType) {
      case 'PRODUTO_GRAFICO':
        return 'bg-blue-50/70 border-blue-100';
      case 'PRODUTO_FISICO':
        return 'bg-purple-50/70 border-purple-100';
      case 'SERVICO':
        return 'bg-emerald-50/70 border-emerald-100';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  // If image from Google Drive failed to load
  if (isGoogleDrive && hasError) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center border border-amber-200 bg-amber-50/80 text-amber-800 p-2 text-center select-none transition-colors ${className}`}
        title="A imagem não está mais disponível no Google Drive"
      >
        <CloudOff className={`${iconClassName} text-amber-600 mb-1 shrink-0`} />
        <span className="text-[9px] font-bold leading-tight line-clamp-2 px-1 text-amber-900">
          Indisponível no Drive
        </span>
      </div>
    );
  }

  if (!resolvedSrc || hasError || resolvedSrc.trim() === '') {
    return (
      <div
        className={`flex flex-col items-center justify-center border select-none transition-colors ${getBgColor()} ${className}`}
        title={`${alt} (Sem foto cadastrada)`}
      >
        <div className="flex flex-col items-center justify-center p-2 text-center">
          {getIcon()}
          {categoryName && (
            <span className="text-[10px] text-slate-500 font-semibold mt-1 truncate max-w-[90%] px-1">
              {categoryName}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden shrink-0 ${className}`}>
      <img
        src={resolvedSrc}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      {showBadge && isGoogleDrive && (
        <span
          className="absolute bottom-1 right-1 p-1 bg-white/90 backdrop-blur-xs rounded-md shadow-2xs border border-slate-200 text-blue-600"
          title="Imagem vinculada ao Google Drive"
        >
          <HardDrive className="w-3 h-3" />
        </span>
      )}
    </div>
  );
};
