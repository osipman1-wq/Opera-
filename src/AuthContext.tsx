import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type AppUser = User | { uid: string; displayName: string | null; email: string | null; photoURL: string | null; isAnonymous: boolean; isLocal: boolean } | null;

interface AuthContextType {
  user: AppUser;
  loading: boolean;
  authError: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, username: string) => Promise<void>;
  continueAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser>(() => {
    // Immediate fallback initialization for zero-friction
    const localId = localStorage.getItem('hubLocalId') || `local_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('hubLocalId', localId);
    return {
      uid: localId,
      displayName: 'Local Guest',
      email: null,
      photoURL: null,
      isAnonymous: true,
      isLocal: true
    };
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  useEffect(() => {
    // Attempt to sync with Firebase in the background
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Ensure user document exists in Firestore
        const userRef = doc(db, 'users', authUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName || 'Guest User',
              photoURL: authUser.photoURL,
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn("Firestore sync skipped (offline or restricted)");
        }
        setUser(authUser);
      } else {
        // Automatically try to upgrade the local session to a Firebase Anonymous session
        try {
          await signInAnonymously(auth);
        } catch (error: any) {
          // If Firebase is restricted, we just stay in Local mode silently
          // We don't set authError here because we have a working Local fallback
          if (error.code !== 'auth/admin-restricted-operation' && error.code !== 'auth/operation-not-allowed') {
            console.debug("Firebase Auth background failure:", error.message);
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (isAuthBusy) return;
    const provider = new GoogleAuthProvider();
    setAuthError(null);
    setIsAuthBusy(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // Ignore user cancellation or duplicate request cancellation
        console.log('Login request cancelled or duplicate');
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError('Connection failed. Please check your internet or try again.');
      } else {
        setAuthError(error.message || 'An unexpected error occurred during login.');
      }
    } finally {
      setIsAuthBusy(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (isAuthBusy) return;
    setAuthError(null);
    setIsAuthBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('Email/Password sign-in is not enabled in the Firebase Console. Please enable it in Authentication > Sign-in method.');
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError('Connection failed. Please check your internet.');
      } else {
        setAuthError(error.message || 'An unexpected error occurred during login.');
      }
    } finally {
      setIsAuthBusy(false);
    }
  };

  const signUp = async (email: string, pass: string, name: string, username: string) => {
    if (isAuthBusy) return;
    setAuthError(null);
    setIsAuthBusy(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });

      // Create user document with extra info
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: name,
        username: username,
        photoURL: null,
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('This email is already registered.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Password should be at least 6 characters.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('Email/Password sign-up is not enabled in the Firebase Console. Please enable it in Authentication > Sign-in method.');
      } else {
        setAuthError(error.message || 'Failed to create account.');
      }
    } finally {
      setIsAuthBusy(false);
    }
  };

  const continueAnonymously = async () => {
    if (isAuthBusy) return;
    setAuthError(null);
    setIsAuthBusy(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError('Anonymous auth is not enabled in Firebase Console. Please enable it.');
      } else if (error.code === 'auth/admin-restricted-operation') {
        // Silently continue with local session if manual attempt is restricted
        console.warn("Manual anonymous attempt restricted by admin.");
      } else {
        setAuthError(error.message || 'Failed to enter as guest.');
      }
    } finally {
      setIsAuthBusy(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, loginWithEmail, signUp, continueAnonymously, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
