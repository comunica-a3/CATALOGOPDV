import { getDriveAccessToken } from './googleDriveAuth';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
    rotation?: number;
  };
}

/**
 * Extracts a Google Drive File ID from various link formats:
 * - https://drive.google.com/file/d/1AbC.../view
 * - https://drive.google.com/open?id=1AbC...
 * - https://drive.google.com/uc?id=1AbC...
 * - Direct ID: 1AbC...
 */
export function extractGoogleDriveFileId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Direct ID check (typical Google Drive IDs are alphanumeric with hyphens and underscores, ~28-45 chars)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // /file/d/{id}/...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // id={id} query param
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // /d/{id} pattern
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) {
    return dMatch[1];
  }

  return null;
}

/**
 * Construct high-resolution direct display URL for Google Drive image.
 * Uses Google's global CDN thumbnail service without downloading the file to local storage.
 */
export function getGoogleDriveDisplayUrl(fileId: string, width = 1200): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

/**
 * Construct secondary Google Drive direct view link
 */
export function getGoogleDriveViewLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * List images from user's Google Drive with pagination & search
 */
export async function listGoogleDriveImages(options: {
  searchQuery?: string;
  pageToken?: string;
  pageSize?: number;
}): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado no Google Drive. Conecte sua conta para listar imagens.');
  }

  const queryParts = [
    "mimeType contains 'image/'",
    'trashed = false',
  ];

  if (options.searchQuery && options.searchQuery.trim()) {
    const cleanSearch = options.searchQuery.trim().replace(/'/g, "\\'");
    queryParts.push(`name contains '${cleanSearch}'`);
  }

  const q = queryParts.join(' and ');
  const pageSize = options.pageSize || 24;

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set(
    'fields',
    'nextPageToken, files(id, name, mimeType, size, thumbnailLink, webContentLink, webViewLink, createdTime, modifiedTime, imageMediaMetadata)'
  );
  url.searchParams.set('orderBy', 'modifiedTime desc');

  if (options.pageToken) {
    url.searchParams.set('pageToken', options.pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message = errBody?.error?.message || `Erro ${response.status} ao consultar Google Drive.`;
    throw new Error(message);
  }

  const data = await response.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Fetch metadata for a specific Google Drive file
 */
export async function getGoogleDriveFileMetadata(fileId: string): Promise<GoogleDriveFile> {
  const token = getDriveAccessToken();

  if (token) {
    const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
    url.searchParams.set(
      'fields',
      'id, name, mimeType, size, thumbnailLink, webContentLink, webViewLink, createdTime, modifiedTime, imageMediaMetadata, trashed'
    );

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.trashed) {
        throw new Error('Este arquivo está na lixeira do Google Drive.');
      }
      return data;
    }
  }

  // Fallback to backend verification endpoint
  const backendRes = await fetch(`/api/drive/file-info/${fileId}`);
  if (backendRes.ok) {
    const info = await backendRes.json();
    if (info.available && info.file) {
      return info.file;
    }
  }

  // Generic metadata if accessible via public link
  return {
    id: fileId,
    name: `drive_image_${fileId.slice(0, 8)}`,
    mimeType: 'image/jpeg',
    thumbnailLink: getGoogleDriveDisplayUrl(fileId, 400),
    webViewLink: getGoogleDriveViewLink(fileId),
  };
}

/**
 * Check if a Google Drive image file is reachable
 */
export async function checkGoogleDriveFileAvailability(fileId: string): Promise<boolean> {
  try {
    const token = getDriveAccessToken();
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const res = await fetch(`/api/drive/file-info/${fileId}${tokenQuery}`);
    if (res.ok) {
      const data = await res.json();
      return !!data.available;
    }
    return false;
  } catch {
    return false;
  }
}
