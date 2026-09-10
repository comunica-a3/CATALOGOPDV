import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  User,
  type Auth,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// In-memory token storage only (never persisted to localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let currentDriveUser: User | null = null;

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const driveAuth: Auth = getAuth(app);

// Configure Google Drive Provider with required scopes
export function getDriveAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
}

/**
 * Sign in to Google with Google Drive permissions
 */
export async function signInWithGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  const provider = getDriveAuthProvider();
  try {
    const result = await signInWithPopup(driveAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;

    if (!token) {
      throw new Error('Não foi possível obter o token de acesso do Google Drive.');
    }

    inMemoryAccessToken = token;
    currentDriveUser = result.user;

    return {
      user: result.user,
      accessToken: token,
    };
  } catch (error: any) {
    console.warn('Tentativa de autenticação Google Drive encerrada ou restrita:', error?.code || error?.message);
    throw error;
  }
}

/**
 * Sign out from Google Drive
 */
export async function signOutGoogleDrive(): Promise<void> {
  inMemoryAccessToken = null;
  currentDriveUser = null;
  await signOut(driveAuth);
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
}

/**
 * Get current signed-in Google Drive user
 */
export function getCurrentDriveUser(): User | null {
  return currentDriveUser || driveAuth.currentUser;
}

/**
 * Listen to auth state changes
 */
export function subscribeToDriveAuth(callback: (user: User | null, token: string | null) => void) {
  return onAuthStateChanged(driveAuth, (user) => {
    currentDriveUser = user;
    if (!user) {
      inMemoryAccessToken = null;
    }
    callback(user, inMemoryAccessToken);
  });
}
