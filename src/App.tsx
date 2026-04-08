import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { createRoom, createRooms, type RoomDefinition } from './game';
import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';

const SCORE_BY_ROOM: Record<string, number> = {
	'bright-start': 50,
	'mirror-hall': 100,
	'forest-labyrinth': 125,
};

const STORAGE_KEY = 'tasker-player-session';

interface PlayerSession {
	playerName: string;
	score: number;
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
			consecutiveWins: Math.max(0, Math.floor(parsed.consecutiveWins)),
			collectedEmojis,
		};
	} catch {
		return null;
	}
};

const App = () => {
	const navigate = useNavigate();
	const initialSession = getInitialSession();
	const [rooms, setRooms] = useState<RoomDefinition[]>(() => createRooms());
	const [playerName, setPlayerName] = useState(
		initialSession?.playerName ?? '',
	);
	const [score, setScore] = useState(initialSession?.score ?? 0);
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

	const persistSession = (
		nextName: string,
		nextScore: number,
		nextConsecutiveWins: number,
		nextCollectedEmojis: string[],
	) => {
		if (typeof window === 'undefined') {
			return;
		}

		const payload: PlayerSession = {
			playerName: nextName,
			score: nextScore,
			consecutiveWins: nextConsecutiveWins,
			collectedEmojis: nextCollectedEmojis,
		};

		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	};

	const regenerateRooms = () => {
		setRooms(createRooms());
		consecutiveWinsRef.current = 0;
		if (playerName) {
			persistSession(playerName, score, 0, collectedEmojis);
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
	) => {
		if (outcome === 'failure') {
			setPendingLevelEmojis([]);
			consecutiveWinsRef.current = 0;
			if (playerName) {
				persistSession(playerName, score, 0, collectedEmojis);
			}
			return;
		}

		consecutiveWinsRef.current += 1;
		const nextWins = consecutiveWinsRef.current;
		const roomScore = SCORE_BY_ROOM[roomId] ?? 0;
		const nextScore = score + roomScore;
		const nextCollectedEmojis = [
			...new Set([
				...collectedEmojis,
				...pendingLevelEmojis,
				...roomEmojis,
			]),
		];
		setScore(nextScore);
		setCollectedEmojis(nextCollectedEmojis);
		setPendingLevelEmojis([]);
		regenerateRoom(roomId);
		if (playerName) {
			persistSession(
				playerName,
				nextScore,
				nextWins,
				nextCollectedEmojis,
			);
		}

		if (nextWins < 2) {
			return;
		}

		if (playerName) {
			persistSession(playerName, nextScore, 0, nextCollectedEmojis);
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
		persistSession(
			cleanedName,
			score,
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
		setCollectedEmojis([]);
		setPendingLevelEmojis([]);
		setShowNameModal(true);
		consecutiveWinsRef.current = 0;

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
							кімната: 125 балів. Бали зараховуються після кожного
							успішного проходження кімнати.
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
		</>
	);
};

export default App;
