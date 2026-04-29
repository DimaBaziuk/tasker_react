import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createRoom, createRooms, type RoomDefinition } from './game';
import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';
import RoutineRoomPage from './pages/RoutineRoomPage';
import SafetyRoomPage from './pages/SafetyRoomPage';
import WordBuilderRoomPage from './pages/WordBuilderRoomPage';
import { useLocation } from 'react-router-dom';
import {
	getStoredAnalyticsConsent,
	setAnalyticsConsentChoice,
	trackEvent,
	trackPageView,
	type AnalyticsConsentChoice,
} from './analytics';
import { detectVisitorCountryCode, getBlockedCountryCodes } from './geoblock';

const SCORE_BY_ROOM: Record<string, number> = {
	'bright-start': 50,
	'mirror-hall': 100,
	'forest-labyrinth': 125,
	'daily-routines': 0,
	'safety-lab': 0,
};

const STORAGE_KEY = 'tasker-player-session';
const FULL_COLLECTION_BONUS = 350;
const ROUTINE_ROOM_ID = 'daily-routines';
const WORD_ROOM_ID = 'word-builder';
const SAFETY_ROOM_ID = 'safety-lab';
const BLOCKED_COUNTRY_CODES = getBlockedCountryCodes();

type GeoAccessState = 'checking' | 'allowed' | 'blocked';

interface PlayerSession {
	playerName: string;
	score: number;
	routineRoomScore: number;
	wordRoomScore: number;
	safetyRoomScore: number;
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

		return {
			playerName: parsed.playerName.trim(),
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
	const [nameInput, setNameInput] = useState(
		initialSession?.playerName ?? '',
	);
	const [collectedEmojis, setCollectedEmojis] = useState<string[]>(
		initialSession?.collectedEmojis ?? [],
	);
	const [pendingLevelEmojis, setPendingLevelEmojis] = useState<string[]>([]);
	const [showNameModal, setShowNameModal] = useState(!initialSession);
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

	if (geoAccessState === 'checking') {
		return (
			<main className='geoAccessScreen'>
				<div className='geoAccessCard'>
					<p className='modalCard__eyebrow'>Перевірка доступу</p>
					<h2>Підготовка гри...</h2>
					<p>
						Перевіряємо регіон доступу. Це займає декілька секунд.
					</p>
				</div>
			</main>
		);
	}

	if (geoAccessState === 'blocked') {
		return (
			<main className='geoAccessScreen'>
				<div className='geoAccessCard'>
					<p className='modalCard__eyebrow'>Доступ обмежено</p>
					<h2>Цей застосунок недоступний у вашому регіоні.</h2>
					<p>
						Якщо ви вважаєте, що це помилка, зверніться до
						адміністратора сайту.
					</p>
				</div>
			</main>
		);
	}

	const persistSession = (
		nextName: string,
		nextScore: number,
		nextRoutineRoomScore: number,
		nextWordRoomScore: number,
		nextSafetyRoomScore: number,
		nextConsecutiveWins: number,
		nextCollectedEmojis: string[],
	) => {
		if (typeof window === 'undefined') {
			return;
		}

		const payload: PlayerSession = {
			playerName: nextName,
			score: nextScore,
			routineRoomScore: nextRoutineRoomScore,
			wordRoomScore: nextWordRoomScore,
			safetyRoomScore: nextSafetyRoomScore,
			consecutiveWins: nextConsecutiveWins,
			collectedEmojis: nextCollectedEmojis,
		};

		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
		setShowNameModal(false);
		void trackEvent('player_name_set', {
			name_length: cleanedName.length,
		});
		persistSession(
			cleanedName,
			score,
			routineRoomScore,
			wordRoomScore,
			safetyRoomScore,
			consecutiveWinsRef.current,
			collectedEmojis,
		);
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
		setRooms(createRooms());
		setPlayerName('');
		setNameInput('');
		setScore(0);
		setRoutineRoomScore(0);
		setWordRoomScore(0);
		setSafetyRoomScore(0);
		setCollectedEmojis([]);
		setPendingLevelEmojis([]);
		setShowNameModal(true);
		consecutiveWinsRef.current = 0;
		void trackEvent('reset_progress', {
			from_path: location.pathname,
		});

		if (typeof window !== 'undefined') {
			window.sessionStorage.removeItem(STORAGE_KEY);
		}

		navigate('/', { replace: true });
	};

	return (
		<>
			<div className='playerHud' aria-live='polite'>
				<p className='playerHud__name'>{playerName || 'Гість'}</p>
				<p className='playerHud__score'>Бали: {score}</p>
				<p className='playerHud__bonus'>
					Бонус за всі emoji: {FULL_COLLECTION_BONUS}{' '}
					{hasFullLabyrinthCollection
						? '(отримано)'
						: `(прогрес ${collectedLabyrinthCount}/${labyrinthCollectionTarget.length})`}
				</p>
				<div className='playerHud__collection'>
					<p className='playerHud__collectionLabel'>Колекція</p>
					<div className='playerHud__collectionItems'>
						{visibleEmojis.length === 0 ? (
							<span className='playerHud__empty'>
								Поки порожньо
							</span>
						) : (
							visibleEmojis.map((emoji) => (
								<span key={emoji} className='playerHud__emoji'>
									{emoji}
								</span>
							))
						)}
					</div>
				</div>
				<button
					type='button'
					className='playerHud__reset'
					onClick={resetProgress}
				>
					Скинути прогрес
				</button>
			</div>

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
						<RoutineRoomPage onRoomOutcome={handleRoomOutcome} />
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

			{showNameModal ? (
				<div className='modalOverlay' role='presentation'>
					<div
						className='modalCard modalCard--welcome'
						role='dialog'
						aria-modal='true'
						aria-labelledby='welcome-title'
					>
						<p className='modalCard__eyebrow'>Початок гри</p>
						<h3 id='welcome-title'>Введи ім'я гравця</h3>
						<p>
							1 кімната: 50 балів, 2 кімната: 100 балів, 3
							кімната: 125 балів, кімната "Щоденні справи": до 120
							балів (по 40 за ранок, обід і вечір), кімната
							"Словотвор": 5 балів за кожне правильне слово,
							кімната "Безпека вдома": до 200 балів.
						</p>

						<form
							className='playerForm'
							onSubmit={submitPlayerName}
						>
							<label htmlFor='playerNameInput'>Ім'я</label>
							<input
								id='playerNameInput'
								type='text'
								value={nameInput}
								onChange={(event) =>
									setNameInput(event.target.value)
								}
								autoFocus
								maxLength={24}
								required
							/>
							<button type='submit' className='primaryButton'>
								Почати гру
							</button>
						</form>
					</div>
				</div>
			) : null}

			{analyticsConsent === null ? (
				<div className='consentBanner' role='dialog' aria-live='polite'>
					<div>
						<p className='consentBanner__title'>
							Налаштування аналітики
						</p>
						<p className='consentBanner__text'>
							Дозволиш збирати анонімні події, щоб покращувати
							гру?
						</p>
					</div>
					<div className='consentBanner__actions'>
						<button
							type='button'
							className='secondaryButton'
							onClick={() => updateConsent('denied')}
						>
							Ні, дякую
						</button>
						<button
							type='button'
							className='primaryButton'
							onClick={() => updateConsent('granted')}
						>
							Дозволити
						</button>
					</div>
				</div>
			) : null}
		</>
	);
};

export default App;
