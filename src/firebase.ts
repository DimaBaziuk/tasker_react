import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
	getAnalytics,
	isSupported,
	type Analytics,
} from 'firebase/analytics';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey:
		import.meta.env.VITE_FIREBASE_API_KEY ??
		'AIzaSyBmn0eut8xX0POqBcBAOz8P5mriT7xl4vo',
	authDomain:
		import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ??
		'school-game-basic.firebaseapp.com',
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'school-game-basic',
	storageBucket:
		import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
		'school-game-basic.firebasestorage.app',
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '1069966087107',
	appId:
		import.meta.env.VITE_FIREBASE_APP_ID ??
		'1:1069966087107:web:e766d3826dd5cc78f7e376',
	measurementId:
		import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-BD83RQ7ZG2',
};

const hasRequiredFirebaseConfig =
	Boolean(firebaseConfig.apiKey) &&
	Boolean(firebaseConfig.authDomain) &&
	Boolean(firebaseConfig.projectId) &&
	Boolean(firebaseConfig.appId);

export const firebaseApp: FirebaseApp | null = hasRequiredFirebaseConfig
	? getApps().length
		? getApp()
		: initializeApp(firebaseConfig)
	: null;

export const firestoreDb: Firestore | null = firebaseApp
	? getFirestore(firebaseApp)
	: null;

let analyticsInstance: Analytics | null = null;

export const initFirebaseAnalytics = async (): Promise<Analytics | null> => {
	if (!firebaseApp || typeof window === 'undefined') {
		return null;
	}

	if (analyticsInstance) {
		return analyticsInstance;
	}

	const analyticsSupported = await isSupported();

	if (!analyticsSupported) {
		return null;
	}

	analyticsInstance = getAnalytics(firebaseApp);
	return analyticsInstance;
};