import type { FirebaseApp } from 'firebase/app';
import {
	GoogleAuthProvider,
	getAuth,
	onAuthStateChanged,
	signInWithPopup,
	signOut,
	type Auth,
	type User,
} from 'firebase/auth';
import { firebaseApp } from './firebase';

let authInstance: Auth | null = null;

const getFirebaseAuth = (): Auth | null => {
	if (!firebaseApp) {
		return null;
	}

	if (!authInstance) {
		authInstance = getAuth(firebaseApp as FirebaseApp);
	}

	return authInstance;
};

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGooglePopup = async () => {
	const auth = getFirebaseAuth();

	if (!auth) {
		throw new Error('Firebase auth is not initialized.');
	}

	return signInWithPopup(auth, googleProvider);
};

export const signOutCurrentUser = async () => {
	const auth = getFirebaseAuth();

	if (!auth) {
		return;
	}

	await signOut(auth);
};

export const subscribeToAuthChanges = (
	onChange: (user: User | null) => void,
) => {
	const auth = getFirebaseAuth();

	if (!auth) {
		onChange(null);
		return () => undefined;
	}

	return onAuthStateChanged(auth, onChange);
};