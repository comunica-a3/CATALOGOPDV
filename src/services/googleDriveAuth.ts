export interface DriveUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// In-memory token storage only (never persisted to localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let currentDriveUser: DriveUser | null = null;
const authListeners = new Set<(user: DriveUser | null, token: string | null) => void>();

function notifyListeners(): void {
  authListeners.forEach((cb) => cb(currentDriveUser, inMemoryAccessToken));
}

/**
 * Sign in to Google with Google Drive permissions via standard OAuth2 popup or fallback
 */
export async function signInWithGoogleDrive(): Promise<{ user: DriveUser; accessToken: string }> {
  throw new Error(
    'Para vincular imagens do Google Drive no servidor local sem necessidade de OAuth externo, cole diretamente o link de compartilhamento da imagem no campo abaixo.'
  );
}

/**
 * Sign out from Google Drive
 */
export async function signOutGoogleDrive(): Promise<void> {
  inMemoryAccessToken = null;
  currentDriveUser = null;
  notifyListeners();
}

/**
 * Get current in-memory access token
 */
export function getDriveAccessToken(): string | null {
  return inMemoryAccessToken;
}

/**
 * Manually set in-memory access token (e.g. from picker callback)
 */
export function setDriveAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  notifyListeners();
}

/**
 * Get current signed-in Google Drive user
 */
export function getCurrentDriveUser(): DriveUser | null {
  return currentDriveUser;
}

/**
 * Listen to auth state changes
 */
export function subscribeToDriveAuth(callback: (user: DriveUser | null, token: string | null) => void) {
  authListeners.add(callback);
  callback(currentDriveUser, inMemoryAccessToken);
  return () => {
    authListeners.delete(callback);
  };
}
