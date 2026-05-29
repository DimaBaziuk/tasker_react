import {
	deleteDoc,
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	type DocumentData,
} from 'firebase/firestore';
import { firestoreDb } from './firebase';

const PLAYER_PROGRESS_COLLECTION = 'playerProgress';
const firestoreSyncEnabledByEnv =
	import.meta.env.VITE_ENABLE_FIRESTORE === 'true';

let firestoreSyncAvailable =
	Boolean(firestoreDb) && firestoreSyncEnabledByEnv;

export interface FirestorePlayerProgress {
	playerName: string;
	score: number;
	routineRoomScore: number;
	wordRoomScore: number;
	safetyRoomScore: number;
	mathRoomScore: number;
	monsterRoomScore: number;
	consecutiveWins: number;
	collectedEmojis: string[];
}

export const isFirestoreSyncEnabled = (): boolean => firestoreSyncAvailable;

export const isFirestoreMissingDatabaseError = (error: unknown): boolean => {
	if (!(error instanceof Error)) {
		return false;
	}

	return /database\s+'\(default\)'\s+not\s+found/i.test(error.message);
};

export const isFirestorePermissionDeniedError = (error: unknown): boolean => {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const errorCode =
		'code' in error && typeof error.code === 'string' ? error.code : '';

	return (
		errorCode === 'permission-denied' ||
		errorCode === 'firestore/permission-denied'
	);
};

const parseProgress = (
	data: DocumentData | undefined,
): FirestorePlayerProgress | null => {
	if (!data) {
		return null;
	}

	if (
		typeof data.playerName !== 'string' ||
		typeof data.score !== 'number' ||
		typeof data.consecutiveWins !== 'number'
	) {
		return null;
	}

	const collectedEmojis = Array.isArray(data.collectedEmojis)
		? data.collectedEmojis.filter(
				(item: unknown): item is string => typeof item === 'string',
			)
		: [];

	return {
		playerName: data.playerName.trim(),
		score: Math.max(0, Math.floor(data.score)),
		routineRoomScore:
			typeof data.routineRoomScore === 'number'
				? Math.max(0, Math.floor(data.routineRoomScore))
				: 0,
		wordRoomScore:
			typeof data.wordRoomScore === 'number'
				? Math.max(0, Math.floor(data.wordRoomScore))
				: 0,
		safetyRoomScore:
			typeof data.safetyRoomScore === 'number'
				? Math.max(0, Math.floor(data.safetyRoomScore))
				: 0,
		mathRoomScore:
			typeof data.mathRoomScore === 'number'
				? Math.max(0, Math.floor(data.mathRoomScore))
				: 0,
		monsterRoomScore:
			typeof data.monsterRoomScore === 'number'
				? Math.max(0, Math.floor(data.monsterRoomScore))
				: 0,
		consecutiveWins: Math.max(0, Math.floor(data.consecutiveWins)),
		collectedEmojis,
	};
};

export const loadFirestorePlayerProgress = async (
	uid: string,
): Promise<FirestorePlayerProgress | null> => {
	if (!firestoreDb || !firestoreSyncAvailable) {
		return null;
	}

	try {
		const ref = doc(firestoreDb, PLAYER_PROGRESS_COLLECTION, uid);
		const snapshot = await getDoc(ref);

		if (!snapshot.exists()) {
			return null;
		}

		return parseProgress(snapshot.data());
	} catch (error) {
		if (isFirestoreMissingDatabaseError(error)) {
			firestoreSyncAvailable = false;
		}

		throw error;
	}
};

export const saveFirestorePlayerProgress = async (
	uid: string,
	progress: FirestorePlayerProgress,
): Promise<void> => {
	if (!firestoreDb || !firestoreSyncAvailable) {
		return;
	}

	try {
		const ref = doc(firestoreDb, PLAYER_PROGRESS_COLLECTION, uid);
		await setDoc(
			ref,
			{
				...progress,
				updatedAt: serverTimestamp(),
			},
			{ merge: true },
		);
	} catch (error) {
		if (isFirestoreMissingDatabaseError(error)) {
			firestoreSyncAvailable = false;
		}

		throw error;
	}
};

export const deleteFirestorePlayerProgress = async (
	uid: string,
): Promise<void> => {
	if (!firestoreDb || !firestoreSyncAvailable) {
		return;
	}

	try {
		const ref = doc(firestoreDb, PLAYER_PROGRESS_COLLECTION, uid);
		await deleteDoc(ref);
	} catch (error) {
		if (isFirestoreMissingDatabaseError(error)) {
			firestoreSyncAvailable = false;
		}

		throw error;
	}
};
