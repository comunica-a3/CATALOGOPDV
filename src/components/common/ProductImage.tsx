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

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  const isGoogleDrive =
    imageSource === 'google_drive' ||
    (typeof src === 'string' && (src.includes('drive.google.com') || src.includes('/api/drive/image/')));

  const getIcon = () => {
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

  if (!src || hasError || src.trim() === '') {
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
    <div className="relative inline-block h-full overflow-hidden">
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={`${className} object-cover`}
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
