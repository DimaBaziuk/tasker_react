import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
	Suspense,
	lazy,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FormEvent,
} from 'react';
import {
	Alert,
	Avatar,
	Box,
	Button,
	Chip,
	Collapse,
	Divider,
	IconButton,
	Paper,
	Stack,
	Typography,
} from '@mui/material';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import GoogleIcon from '@mui/icons-material/Google';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { createRoom, createRooms, type RoomDefinition } from './game';
import HomePage from './pages/HomePage';
import { useLocation } from 'react-router-dom';
import {
	getStoredAnalyticsConsent,
	setAnalyticsConsentChoice,
	trackEvent,
	trackPageView,
	type AnalyticsConsentChoice,
} from './analytics';
import { detectVisitorCountryCode, getBlockedCountryCodes } from './geoblock';
import {
	signInWithGooglePopup,
	signOutCurrentUser,
	subscribeToAuthChanges,
} from './auth';
import type { User } from 'firebase/auth';
import {
	deleteFirestorePlayerProgress,
	isFirestoreMissingDatabaseError,
	isFirestorePermissionDeniedError,
	isFirestoreSyncEnabled,
	loadFirestorePlayerProgress,
	saveFirestorePlayerProgress,
} from './firestoreProgress';
import { AppButton, AppDialog, AppInput } from './ui/primitives';

const GamePage = lazy(() => import('./pages/GamePage'));
const RoutineRoomPage = lazy(() => import('./pages/RoutineRoomPage'));
const SafetyRoomPage = lazy(() => import('./pages/SafetyRoomPage'));
const WordBuilderRoomPage = lazy(() => import('./pages/WordBuilderRoomPage'));
const MathRoomPage = lazy(() => import('./pages/MathRoomPage'));
const CreativeRoomPage = lazy(() => import('./pages/CreativeRoomPage'));
const MonsterMazeRoomPage = lazy(() => import('./pages/MonsterMazeRoomPage'));

const SCORE_BY_ROOM: Record<string, number> = {
	'bright-start': 50,
	'mirror-hall': 100,
	'forest-labyrinth': 125,
	'daily-routines': 0,
	'safety-lab': 0,
	'math-grid': 0,
	'monster-maze': 0,
};

const STORAGE_KEY = 'tasker-player-session';
const FULL_COLLECTION_BONUS = 400;
const ROUTINE_ROOM_ID = 'daily-routines';
const WORD_ROOM_ID = 'word-builder';
const SAFETY_ROOM_ID = 'safety-lab';
const MATH_ROOM_ID = 'math-grid';
const MONSTER_ROOM_ID = 'monster-maze';
const BLOCKED_COUNTRY_CODES = getBlockedCountryCodes();

type GeoAccessState = 'checking' | 'allowed' | 'blocked';
type AuthMode = 'guest' | 'google';

interface PlayerSession {
	playerName: string;
	authMode: AuthMode;
	score: number;
	routineRoomScore: number;
	wordRoomScore: number;
	safetyRoomScore: number;
	mathRoomScore: number;
	monsterRoomScore: number;
	consecutiveWins: number;
	collectedEmojis: string[];
}

const getInitialSession = (): PlayerSession | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	const saved = window.sessionStorage.getItem(STORAGE_KEY);

	if (!saved) {
		return null;
	}

	try {
		const parsed = JSON.parse(saved) as Partial<PlayerSession>;
		const collectedEmojis = Array.isArray(parsed.collectedEmojis)
			? parsed.collectedEmojis.filter(
					(item): item is string => typeof item === 'string',
				)
			: [];

		if (
			typeof parsed.playerName !== 'string' ||
			!parsed.playerName.trim() ||
			typeof parsed.score !== 'number' ||
			typeof parsed.consecutiveWins !== 'number'
		) {
			return null;
		}

		const authMode: AuthMode =
			parsed.authMode === 'guest' ? 'guest' : 'google';

		return {
			playerName: parsed.playerName.trim(),
			authMode,
			score: Math.max(0, Math.floor(parsed.score)),
			routineRoomScore:
				typeof parsed.routineRoomScore === 'number'
					? Math.max(0, Math.floor(parsed.routineRoomScore))
					: 0,
			wordRoomScore:
				typeof parsed.wordRoomScore === 'number'
					? Math.max(0, Math.floor(parsed.wordRoomScore))
					: 0,
			safetyRoomScore:
				typeof parsed.safetyRoomScore === 'number'
					? Math.max(0, Math.floor(parsed.safetyRoomScore))
					: 0,
			mathRoomScore:
				typeof parsed.mathRoomScore === 'number'
					? Math.max(0, Math.floor(parsed.mathRoomScore))
					: 0,
			monsterRoomScore:
				typeof parsed.monsterRoomScore === 'number'
					? Math.max(0, Math.floor(parsed.monsterRoomScore))
					: 0,
			consecutiveWins: Math.max(0, Math.floor(parsed.consecutiveWins)),
			collectedEmojis,
		};
	} catch {
		return null;
	}
};

const App = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const initialSession = getInitialSession();
	const [rooms, setRooms] = useState<RoomDefinition[]>(() => createRooms());
	const [playerName, setPlayerName] = useState(
		initialSession?.playerName ?? '',
	);
	const [score, setScore] = useState(initialSession?.score ?? 0);
	const [routineRoomScore, setRoutineRoomScore] = useState(
		initialSession?.routineRoomScore ?? 0,
	);
	const [wordRoomScore, setWordRoomScore] = useState(
		initialSession?.wordRoomScore ?? 0,
	);
	const [safetyRoomScore, setSafetyRoomScore] = useState(
		initialSession?.safetyRoomScore ?? 0,
	);
	const [mathRoomScore, setMathRoomScore] = useState(
		initialSession?.mathRoomScore ?? 0,
	);
	const [monsterRoomScore, setMonsterRoomScore] = useState(
		initialSession?.monsterRoomScore ?? 0,
	);
	const [nameInput, setNameInput] = useState(
		initialSession?.playerName ?? '',
	);
	const [collectedEmojis, setCollectedEmojis] = useState<string[]>(
		initialSession?.collectedEmojis ?? [],
	);
	const [pendingLevelEmojis, setPendingLevelEmojis] = useState<string[]>([]);
	const [showNameModal, setShowNameModal] = useState(!initialSession);
	const [authMode, setAuthMode] = useState<AuthMode>(
		initialSession?.authMode ?? 'guest',
	);
	const consecutiveWinsRef = useRef(initialSession?.consecutiveWins ?? 0);
	const visibleEmojis = useMemo(
		() => [...new Set([...collectedEmojis, ...pendingLevelEmojis])],
		[collectedEmojis, pendingLevelEmojis],
	);
	const labyrinthCollectionTarget = useMemo(
		() =>
			Array.from(
				new Set(
					rooms.flatMap((room) =>
						room.decorations.map((decoration) => decoration.emoji),
					),
				),
			),
		[rooms],
	);
	const collectedLabyrinthCount = useMemo(
		() =>
			labyrinthCollectionTarget.filter((emoji) =>
				collectedEmojis.includes(emoji),
			).length,
		[collectedEmojis, labyrinthCollectionTarget],
	);
	const hasFullLabyrinthCollection =
		labyrinthCollectionTarget.length > 0 &&
		collectedLabyrinthCount === labyrinthCollectionTarget.length;
	const [analyticsConsent, setAnalyticsConsent] =
		useState<AnalyticsConsentChoice | null>(() =>
			getStoredAnalyticsConsent(),
		);
	const [geoAccessState, setGeoAccessState] =
		useState<GeoAccessState>('checking');
	const [authUser, setAuthUser] = useState<User | null>(null);
	const [authReady, setAuthReady] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);
	const [isHydratingFromCloud, setIsHydratingFromCloud] = useState(false);
	const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState<boolean>(() =>
		isFirestoreSyncEnabled(),
	);
	const [isPlayerHudExpanded, setIsPlayerHudExpanded] = useState(false);
	const authDisplayName = useMemo(() => {
		if (!authUser) {
			return '';
		}

		const trimmedName = authUser.displayName?.trim();

		if (trimmedName) {
			return trimmedName;
		}

		const emailPrefix = authUser.email?.split('@')[0]?.trim();
		return emailPrefix ?? '';
	}, [authUser]);

	useEffect(() => {
		const unsubscribe = subscribeToAuthChanges((nextUser) => {
			setAuthUser(nextUser);
			if (nextUser) {
				setAuthMode('google');
			}
			setAuthReady(true);
		});

		return unsubscribe;
	}, []);

	useEffect(() => {
		if (!authDisplayName) {
			return;
		}

		setAuthMode('google');
		setPlayerName(authDisplayName);
		setNameInput(authDisplayName);
		setShowNameModal(false);
	}, [authDisplayName]);

	useEffect(() => {
		if (!authUser || !isCloudSyncEnabled) {
			return;
		}

		let cancelled = false;
		setIsHydratingFromCloud(true);

		void loadFirestorePlayerProgress(authUser.uid)
			.then((savedProgress) => {
				if (cancelled || !savedProgress) {
					return;
				}

				setPlayerName(savedProgress.playerName);
				setNameInput(savedProgress.playerName);
				setScore(savedProgress.score);
				setRoutineRoomScore(savedProgress.routineRoomScore);
				setWordRoomScore(savedProgress.wordRoomScore);
				setSafetyRoomScore(savedProgress.safetyRoomScore);
				setMathRoomScore(savedProgress.mathRoomScore);
				setMonsterRoomScore(savedProgress.monsterRoomScore);
				setCollectedEmojis(savedProgress.collectedEmojis);
				setPendingLevelEmojis([]);
				consecutiveWinsRef.current = savedProgress.consecutiveWins;
				setShowNameModal(false);
			})
			.catch((error: unknown) => {
				if (isFirestoreMissingDatabaseError(error)) {
					setIsCloudSyncEnabled(false);
					setAuthError(
						'Firestore ще не створено в Firebase проєкті. Хмарне збереження вимкнено.',
					);
					return;
				}

				if (isFirestorePermissionDeniedError(error)) {
					setAuthError(
						'Немає доступу до Firestore (permission-denied). Оновіть Firestore Rules та увійдіть через Google.',
					);
					return;
				}

				setAuthError(
					'Не вдалося завантажити прогрес із Firebase. Працюємо локально.',
				);
			})
			.finally(() => {
				if (cancelled) {
					return;
				}

				setIsHydratingFromCloud(false);
			});

		return () => {
			cancelled = true;
		};
	}, [authUser, isCloudSyncEnabled]);

	useEffect(() => {
		let cancelled = false;

		void detectVisitorCountryCode().then((countryCode) => {
			if (cancelled) {
				return;
			}

			if (countryCode && BLOCKED_COUNTRY_CODES.has(countryCode)) {
				setGeoAccessState('blocked');
				void trackEvent('geo_blocked_access', {
					country_code: countryCode,
				});
				return;
			}

			setGeoAccessState('allowed');
		});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!analyticsConsent) {
			return;
		}

		void setAnalyticsConsentChoice(analyticsConsent);
	}, [analyticsConsent]);

	useEffect(() => {
		void trackPageView({
			page_title: document.title,
			page_location: window.location.href,
			page_path: `${location.pathname}${location.search}`,
		});
	}, [location.pathname, location.search]);

	const updateConsent = (consent: AnalyticsConsentChoice) => {
		setAnalyticsConsent(consent);
		void setAnalyticsConsentChoice(consent).then(() => {
			void trackEvent('consent_update', { consent_choice: consent });
		});
	};

	const handleGoogleSignIn = async () => {
		setAuthError(null);

		try {
			await signInWithGooglePopup();
			void trackEvent('auth_sign_in_success', {
				provider: 'google',
			});
		} catch (error) {
			setAuthError('Не вдалося увійти через Google. Спробуйте ще раз.');
			void trackEvent('auth_sign_in_error', {
				provider: 'google',
				error:
					error instanceof Error
						? error.message.slice(0, 120)
						: 'unknown',
			});
		}
	};

	const handleGoogleSignOut = async () => {
		setAuthError(null);

		try {
			await signOutCurrentUser();
			setRooms(createRooms());
			setPlayerName('');
			setNameInput('');
			setScore(0);
			setRoutineRoomScore(0);
			setWordRoomScore(0);
			setSafetyRoomScore(0);
			setMathRoomScore(0);
			setMonsterRoomScore(0);
			setCollectedEmojis([]);
			setPendingLevelEmojis([]);
			setAuthMode('guest');
			setShowNameModal(true);
			consecutiveWinsRef.current = 0;

			if (typeof window !== 'undefined') {
				window.sessionStorage.removeItem(STORAGE_KEY);
			}

			navigate('/', { replace: true });

			void trackEvent('auth_sign_out', {
				provider: 'google',
			});
		} catch {
			setAuthError('Не вдалося вийти з акаунту. Спробуйте ще раз.');
		}
	};

	if (geoAccessState === 'checking') {
		return (
			<main className='geoAccessScreen'>
				<Stack className='geoAccessCard'>
					<p className='modalCard__eyebrow'>Перевірка доступу</p>
					<h2>Підготовка гри...</h2>
					<p>
						Перевіряємо регіон доступу. Це займає декілька секунд.
					</p>
				</Stack>
			</main>
		);
	}

	if (geoAccessState === 'blocked') {
		return (
			<main className='geoAccessScreen'>
				<Stack className='geoAccessCard'>
					<p className='modalCard__eyebrow'>Доступ обмежено</p>
					<h2>Цей застосунок недоступний у вашому регіоні.</h2>
					<p>
						Якщо ви вважаєте, що це помилка, зверніться до
						адміністратора сайту.
					</p>
				</Stack>
			</main>
		);
	}

	const persistSession = (
		nextName: string,
		nextScore: number,
		nextRoutineRoomScore: number,
		nextWordRoomScore: number,
		nextSafetyRoomScore: number,
		nextMathRoomScore: number,
		nextMonsterRoomScore: number,
		nextConsecutiveWins: number,
		nextCollectedEmojis: string[],
	) => {
		if (
			typeof window === 'undefined' ||
			authMode !== 'google' ||
			isHydratingFromCloud ||
			!isCloudSyncEnabled
		) {
			return;
		}

		const payload: PlayerSession = {
			playerName: nextName,
			authMode: 'google',
			score: nextScore,
			routineRoomScore: nextRoutineRoomScore,
			wordRoomScore: nextWordRoomScore,
			safetyRoomScore: nextSafetyRoomScore,
			mathRoomScore: nextMathRoomScore,
			monsterRoomScore: nextMonsterRoomScore,
			consecutiveWins: nextConsecutiveWins,
			collectedEmojis: nextCollectedEmojis,
		};

		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

		if (authUser?.uid) {
			void saveFirestorePlayerProgress(authUser.uid, {
				playerName: nextName,
				score: nextScore,
				routineRoomScore: nextRoutineRoomScore,
				wordRoomScore: nextWordRoomScore,
				safetyRoomScore: nextSafetyRoomScore,
				mathRoomScore: nextMathRoomScore,
				monsterRoomScore: nextMonsterRoomScore,
				consecutiveWins: nextConsecutiveWins,
				collectedEmojis: nextCollectedEmojis,
			}).catch((error: unknown) => {
				if (isFirestoreMissingDatabaseError(error)) {
					setIsCloudSyncEnabled(false);
					setAuthError(
						'Firestore ще не створено в Firebase проєкті. Хмарне збереження вимкнено.',
					);
					return;
				}

				if (isFirestorePermissionDeniedError(error)) {
					setAuthError(
						'Немає доступу до Firestore (permission-denied). Оновіть Firestore Rules та увійдіть через Google.',
					);
					return;
				}

				setAuthError(
					'Не вдалося зберегти прогрес у Firebase. Спробуйте пізніше.',
				);
			});
		}
	};

	const regenerateRooms = () => {
		setRooms(createRooms());
		consecutiveWinsRef.current = 0;
		void trackEvent('regenerate_rooms', {
			from_path: location.pathname,
		});
		if (playerName) {
			persistSession(
				playerName,
				score,
				routineRoomScore,
				wordRoomScore,
				safetyRoomScore,
				mathRoomScore,
				monsterRoomScore,
				0,
				collectedEmojis,
			);
		}
	};

	const regenerateRoom = (roomId: string) => {
		const replacementRoom = createRoom(roomId);

		if (!replacementRoom) {
			return;
		}

		setRooms((currentRooms) =>
			currentRooms.map((room) =>
				room.id === roomId ? replacementRoom : room,
			),
		);
	};

	const handleRoomOutcome = (
		roomId: string,
		outcome: 'success' | 'failure',
		roomEmojis: string[] = [],
		scoreOverride?: number,
	) => {
		if (outcome === 'failure') {
			void trackEvent('level_failed', {
				room_id: roomId,
				score,
				player_name_set: Boolean(playerName),
			});
			setPendingLevelEmojis([]);
			consecutiveWinsRef.current = 0;
			if (playerName) {
				persistSession(
					playerName,
					score,
					routineRoomScore,
					wordRoomScore,
					safetyRoomScore,
					mathRoomScore,
					monsterRoomScore,
					0,
					collectedEmojis,
				);
			}
			return;
		}

		if (roomId === ROUTINE_ROOM_ID) {
			const nextRoutineRoomScore = Math.max(
				0,
				Math.floor(scoreOverride ?? SCORE_BY_ROOM[roomId] ?? 0),
			);
			const nextScore = score - routineRoomScore + nextRoutineRoomScore;
			setScore(nextScore);
			setRoutineRoomScore(nextRoutineRoomScore);
			setPendingLevelEmojis([]);

			if (playerName) {
				persistSession(
					playerName,
					nextScore,
					nextRoutineRoomScore,
					wordRoomScore,
					safetyRoomScore,
					mathRoomScore,
					monsterRoomScore,
					consecutiveWinsRef.current,
					collectedEmojis,
				);
			}

			void trackEvent('routine_room_scored', {
				routine_score: nextRoutineRoomScore,
				total_score: nextScore,
			});

			return;
		}

		if (roomId === WORD_ROOM_ID) {
			const nextWordRoomScore = Math.max(
				0,
				Math.floor(scoreOverride ?? SCORE_BY_ROOM[roomId] ?? 0),
			);
			const nextScore = score - wordRoomScore + nextWordRoomScore;
			setScore(nextScore);
			setWordRoomScore(nextWordRoomScore);
			setPendingLevelEmojis([]);

			if (playerName) {
				persistSession(
					playerName,
					nextScore,
					routineRoomScore,
					nextWordRoomScore,
					safetyRoomScore,
					mathRoomScore,
					monsterRoomScore,
					consecutiveWinsRef.current,
					collectedEmojis,
				);
			}

			void trackEvent('word_room_scored', {
				word_room_score: nextWordRoomScore,
				total_score: nextScore,
			});

			return;
		}

		if (roomId === SAFETY_ROOM_ID) {
			const nextSafetyRoomScore = Math.max(
				0,
				Math.floor(scoreOverride ?? SCORE_BY_ROOM[roomId] ?? 0),
			);
			const nextScore = score - safetyRoomScore + nextSafetyRoomScore;
			setScore(nextScore);
			setSafetyRoomScore(nextSafetyRoomScore);
			setPendingLevelEmojis([]);

			if (playerName) {
				persistSession(
					playerName,
					nextScore,
					routineRoomScore,
					wordRoomScore,
					nextSafetyRoomScore,
					mathRoomScore,
					monsterRoomScore,
					consecutiveWinsRef.current,
					collectedEmojis,
				);
			}

			void trackEvent('safety_room_scored', {
				safety_room_score: nextSafetyRoomScore,
				total_score: nextScore,
			});

			return;
		}

		if (roomId === MATH_ROOM_ID) {
			const nextMathRoomScore = Math.max(
				0,
				Math.floor(scoreOverride ?? SCORE_BY_ROOM[roomId] ?? 0),
			);
			const nextScore = score - mathRoomScore + nextMathRoomScore;
			setScore(nextScore);
			setMathRoomScore(nextMathRoomScore);
			setPendingLevelEmojis([]);

			if (playerName) {
				persistSession(
					playerName,
					nextScore,
					routineRoomScore,
					wordRoomScore,
					safetyRoomScore,
					nextMathRoomScore,
					monsterRoomScore,
					consecutiveWinsRef.current,
					collectedEmojis,
				);
			}

			void trackEvent('math_room_scored', {
				math_room_score: nextMathRoomScore,
				total_score: nextScore,
			});

			return;
		}

		if (roomId === MONSTER_ROOM_ID) {
			const nextMonsterRoomScore = Math.max(
				0,
				Math.floor(scoreOverride ?? SCORE_BY_ROOM[roomId] ?? 0),
			);
			const nextScore = score - monsterRoomScore + nextMonsterRoomScore;
			setScore(nextScore);
			setMonsterRoomScore(nextMonsterRoomScore);
			setPendingLevelEmojis([]);

			if (playerName) {
				persistSession(
					playerName,
					nextScore,
					routineRoomScore,
					wordRoomScore,
					safetyRoomScore,
					mathRoomScore,
					nextMonsterRoomScore,
					consecutiveWinsRef.current,
					collectedEmojis,
				);
			}

			void trackEvent('monster_room_scored', {
				monster_room_score: nextMonsterRoomScore,
				total_score: nextScore,
			});

			return;
		}

		consecutiveWinsRef.current += 1;
		const nextWins = consecutiveWinsRef.current;
		const roomScore = scoreOverride ?? SCORE_BY_ROOM[roomId] ?? 0;
		const nextCollectedEmojis = [
			...new Set([
				...collectedEmojis,
				...pendingLevelEmojis,
				...roomEmojis,
			]),
		];
		const hadFullCollection =
			labyrinthCollectionTarget.length > 0 &&
			labyrinthCollectionTarget.every((emoji) =>
				collectedEmojis.includes(emoji),
			);
		const hasFullCollection =
			labyrinthCollectionTarget.length > 0 &&
			labyrinthCollectionTarget.every((emoji) =>
				nextCollectedEmojis.includes(emoji),
			);
		const collectionBonus =
			!hadFullCollection && hasFullCollection ? FULL_COLLECTION_BONUS : 0;
		const nextScore = score + roomScore + collectionBonus;
		setScore(nextScore);
		setCollectedEmojis(nextCollectedEmojis);
		setPendingLevelEmojis([]);
		void trackEvent('level_completed', {
			room_id: roomId,
			room_score: roomScore,
			collection_bonus: collectionBonus,
			total_score: nextScore,
		});
		regenerateRoom(roomId);
		if (playerName) {
			persistSession(
				playerName,
				nextScore,
				routineRoomScore,
				wordRoomScore,
				safetyRoomScore,
				mathRoomScore,
				monsterRoomScore,
				nextWins,
				nextCollectedEmojis,
			);
		}

		if (nextWins < 2) {
			return;
		}

		if (playerName) {
			persistSession(
				playerName,
				nextScore,
				routineRoomScore,
				wordRoomScore,
				safetyRoomScore,
				mathRoomScore,
				monsterRoomScore,
				0,
				nextCollectedEmojis,
			);
		}

		const nextRoom = rooms.filter((room) => room.id !== roomId);
		const targetRoom =
			nextRoom[Math.floor(Math.random() * nextRoom.length)];

		consecutiveWinsRef.current = 0;

		if (targetRoom) {
			navigate(`/game/${targetRoom.id}`);
		}
	};

	const submitPlayerName = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const cleanedName = nameInput.trim();

		if (!cleanedName) {
			return;
		}

		setPlayerName(cleanedName);
		setAuthMode('guest');
		setShowNameModal(false);
		void trackEvent('player_name_set', {
			name_length: cleanedName.length,
			auth_mode: 'guest',
		});

		if (typeof window !== 'undefined') {
			window.sessionStorage.removeItem(STORAGE_KEY);
		}
	};

	const handleCollectEmoji = (emoji: string) => {
		if (collectedEmojis.includes(emoji)) {
			return;
		}

		setPendingLevelEmojis((current) => {
			if (current.includes(emoji)) {
				return current;
			}

			return [...current, emoji];
		});
	};

	const resetProgress = () => {
		const isGoogleUser = Boolean(authUser);
		const nextPlayerName = isGoogleUser
			? authDisplayName || playerName || 'Користувач'
			: '';

		setRooms(createRooms());
		setPlayerName(nextPlayerName);
		setNameInput(nextPlayerName);
		setScore(0);
		setRoutineRoomScore(0);
		setWordRoomScore(0);
		setSafetyRoomScore(0);
		setMathRoomScore(0);
		setMonsterRoomScore(0);
		setCollectedEmojis([]);
		setPendingLevelEmojis([]);
		setAuthMode(isGoogleUser ? 'google' : 'guest');
		setShowNameModal(!isGoogleUser);
		setAuthError(null);
		consecutiveWinsRef.current = 0;
		void trackEvent('reset_progress', {
			from_path: location.pathname,
			auth_mode: isGoogleUser ? 'google' : 'guest',
		});

		if (typeof window !== 'undefined') {
			window.sessionStorage.removeItem(STORAGE_KEY);
		}

		if (authUser?.uid && isCloudSyncEnabled) {
			void deleteFirestorePlayerProgress(authUser.uid).catch(
				(error: unknown) => {
					if (isFirestoreMissingDatabaseError(error)) {
						setIsCloudSyncEnabled(false);
						setAuthError(
							'Firestore ще не створено в Firebase проєкті. Хмарне збереження вимкнено.',
						);
						return;
					}

					if (isFirestorePermissionDeniedError(error)) {
						setAuthError(
							'Немає доступу до Firestore (permission-denied). Оновіть Firestore Rules та увійдіть через Google.',
						);
						return;
					}

					setAuthError(
						'Не вдалося видалити прогрес у Firebase. Спробуйте пізніше.',
					);
				},
			);
		}

		navigate('/', { replace: true });
	};

	const isGoogleSignedIn = Boolean(authUser);
	const displayName =
		playerName ||
		(isGoogleSignedIn ? authDisplayName || 'Користувач' : 'Гість');
	const collectionProgressLabel = hasFullLabyrinthCollection
		? 'бонус отримано'
		: `прогрес ${collectedLabyrinthCount}/${labyrinthCollectionTarget.length}`;

	return (
		<>
			<Box className='playerHud' aria-live='polite'>
				<Paper
					elevation={8}
					sx={{
						p: 1.2,
						borderRadius: 3,
						border: '1px solid rgba(23, 49, 61, 0.14)',
						backdropFilter: 'blur(16px)',
						backgroundColor: 'rgba(255, 255, 255, 0.9)',
						minWidth: 220,
					}}
				>
					<Stack
						direction='row'
						spacing={1}
						sx={{ alignItems: 'center' }}
					>
						<IconButton
							onClick={() =>
								setIsPlayerHudExpanded((current) => !current)
							}
							aria-label='Показати дані профілю'
							size='small'
						>
							<Avatar
								src={authUser?.photoURL ?? undefined}
								alt='Аватар профілю'
								sx={{
									width: 42,
									height: 42,
									bgcolor: isGoogleSignedIn
										? 'rgba(25, 118, 210, 0.14)'
										: 'rgba(95, 143, 45, 0.14)',
									color: isGoogleSignedIn
										? 'primary.main'
										: 'success.dark',
								}}
							>
								{!authUser?.photoURL ? (
									isGoogleSignedIn ? (
										<GoogleIcon fontSize='small' />
									) : (
										<PersonOutlineRoundedIcon fontSize='small' />
									)
								) : null}
							</Avatar>
						</IconButton>

						<Stack sx={{ minWidth: 0, flex: 1 }}>
							<Typography
								variant='subtitle2'
								noWrap
								sx={{ fontWeight: 800 }}
							>
								{displayName}
							</Typography>
							<Typography
								variant='body2'
								color='primary.main'
								sx={{ fontWeight: 700 }}
							>
								Бали: {score}
							</Typography>
						</Stack>

						<IconButton
							onClick={() =>
								setIsPlayerHudExpanded((current) => !current)
							}
							size='small'
							aria-label='Розгорнути меню профілю'
						>
							{isPlayerHudExpanded ? (
								<ExpandLessRoundedIcon fontSize='small' />
							) : (
								<ExpandMoreRoundedIcon fontSize='small' />
							)}
						</IconButton>
					</Stack>

					<Collapse
						in={isPlayerHudExpanded}
						timeout={180}
						unmountOnExit
					>
						<Stack spacing={1.2} sx={{ pt: 1.1 }}>
							<Chip
								size='small'
								label={
									isGoogleSignedIn
										? isCloudSyncEnabled
											? 'Google підключено'
											: 'Google: хмара вимкнена'
										: 'Гість без збереження'
								}
								color={isGoogleSignedIn ? 'primary' : 'default'}
								variant={
									isGoogleSignedIn ? 'filled' : 'outlined'
								}
							/>

							{authError ? (
								<Alert severity='error' sx={{ py: 0.25 }}>
									{authError}
								</Alert>
							) : null}

							{isGoogleSignedIn ? (
								<Button
									variant='outlined'
									color='primary'
									startIcon={<LogoutRoundedIcon />}
									onClick={handleGoogleSignOut}
									disabled={!authReady}
								>
									Вийти з Google
								</Button>
							) : (
								<Button
									variant='contained'
									color='primary'
									startIcon={<LoginRoundedIcon />}
									onClick={handleGoogleSignIn}
									disabled={!authReady}
									sx={{
										textTransform: 'none',
										fontWeight: 700,
									}}
								>
									<GoogleIcon
										sx={{ mr: 0.4 }}
										fontSize='small'
									/>
									Увійти через Google
								</Button>
							)}

							<Divider />

							<Stack spacing={0.8}>
								<Typography
									variant='caption'
									color='text.secondary'
								>
									Колекція emoji
								</Typography>
								<Typography
									variant='body2'
									sx={{ fontWeight: 700 }}
								>
									Бонус за всі emoji: {FULL_COLLECTION_BONUS}{' '}
									({collectionProgressLabel})
								</Typography>
								<Stack
									direction='row'
									useFlexGap
									sx={{ flexWrap: 'wrap', gap: 0.7 }}
								>
									{visibleEmojis.length === 0 ? (
										<Chip
											size='small'
											label='Поки порожньо'
											variant='outlined'
										/>
									) : (
										visibleEmojis.map((emoji) => (
											<Chip
												key={emoji}
												label={emoji}
												size='small'
												color='secondary'
												variant='outlined'
												sx={{
													minWidth: 36,
													'& .MuiChip-label': {
														fontSize: '1rem',
														lineHeight: 1.1,
													},
												}}
											/>
										))
									)}
								</Stack>
							</Stack>

							<Button
								variant='outlined'
								color='error'
								startIcon={<RestartAltRoundedIcon />}
								onClick={resetProgress}
							>
								Скинути прогрес
							</Button>
						</Stack>
					</Collapse>
				</Paper>
			</Box>

			<Suspense fallback={null}>
				<Routes>
					<Route
						path='/'
						element={
							<HomePage
								rooms={rooms}
								onRegenerateRooms={regenerateRooms}
							/>
						}
					/>
					<Route
						path='/routine-room'
						element={
							<RoutineRoomPage
								onRoomOutcome={handleRoomOutcome}
							/>
						}
					/>
					<Route
						path='/word-room'
						element={
							<WordBuilderRoomPage
								onRoomOutcome={handleRoomOutcome}
							/>
						}
					/>
					<Route
						path='/safety-room'
						element={
							<SafetyRoomPage onRoomOutcome={handleRoomOutcome} />
						}
					/>
					<Route
						path='/math-room'
						element={
							<MathRoomPage onRoomOutcome={handleRoomOutcome} />
						}
					/>
					<Route
						path='/monster-room'
						element={
							<MonsterMazeRoomPage
								onRoomOutcome={handleRoomOutcome}
							/>
						}
					/>
					<Route
						path='/creative-room'
						element={<CreativeRoomPage />}
					/>
					<Route
						path='/game/:roomId'
						element={
							<GamePage
								rooms={rooms}
								onRegenerateRooms={regenerateRooms}
								onRoomOutcome={handleRoomOutcome}
								onCollectEmoji={handleCollectEmoji}
							/>
						}
					/>
					<Route path='*' element={<Navigate to='/' replace />} />
				</Routes>
			</Suspense>

			<AppDialog
				open={showNameModal}
				onClose={() => undefined}
				slotProps={{
					paper: {
						className: 'modalCard modalCard--welcome',
					},
				}}
				title={
					<>
						<p className='modalCard__eyebrow'>Початок гри</p>
						<h3 id='welcome-title'>Увійди або продовж як гість</h3>
					</>
				}
			>
				<p>
					1 кімната: 50 балів, 2 кімната: 100 балів, 3 кімната: 125
					балів, кімната "Щоденні справи": до 120 балів (по 40 за
					ранок, обід і вечір), кімната "Словотвор": 5 балів за кожне
					правильне слово, кімната "Безпека вдома": до 300 балів,
					кімната "Математика": 7 балів за правильну клітинку (до
					567), кімната "Monster Maze": до 300 балів (10 емодзі +
					бонус за вихід).
				</p>
				{authUser ? null : (
					<p className='playerForm__note'>
						Якщо просто введеш ім'я, це буде гостьовий режим:
						прогрес не зберігається після закриття вкладки.
					</p>
				)}

				<form className='playerForm' onSubmit={submitPlayerName}>
					<label htmlFor='playerNameInput'>Ім'я</label>
					<AppInput
						id='playerNameInput'
						type='text'
						value={nameInput}
						onChange={(event) => setNameInput(event.target.value)}
						autoFocus
						required
						slotProps={{ htmlInput: { maxLength: 24 } }}
					/>
					<AppButton
						type='submit'
						tone='primary'
						className='primaryButton'
					>
						Почати гру
					</AppButton>
				</form>
			</AppDialog>

			{analyticsConsent === null ? (
				<Stack
					className='consentBanner'
					direction='row'
					role='dialog'
					aria-live='polite'
				>
					<Stack>
						<p className='consentBanner__title'>
							Налаштування аналітики
						</p>
						<p className='consentBanner__text'>
							Дозволиш збирати анонімні події, щоб покращувати
							гру?
						</p>
					</Stack>
					<Stack className='consentBanner__actions' direction='row'>
						<AppButton
							type='button'
							tone='secondary'
							className='secondaryButton'
							onClick={() => updateConsent('denied')}
						>
							Ні, дякую
						</AppButton>
						<AppButton
							type='button'
							tone='primary'
							className='primaryButton'
							onClick={() => updateConsent('granted')}
						>
							Дозволити
						</AppButton>
					</Stack>
				</Stack>
			) : null}
		</>
	);
};

export default App;
