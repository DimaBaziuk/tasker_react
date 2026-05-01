import { useEffect, useMemo, useState } from 'react';
import { Stack } from '@mui/material';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { trackEvent } from '../analytics';
import {
	MOVE_DEFINITIONS,
	getMoveDefinition,
	isSamePoint,
	movePoint,
	pointKey,
	type MoveId,
	type Point,
	type RoomDefinition,
} from '../game';
import { AppButton, AppCard, AppDialog } from '../ui/primitives';

type GameState = 'ready' | 'running' | 'success';

const MAX_ATTEMPTS = 2;

const sleep = (duration: number) =>
	new Promise((resolve) => window.setTimeout(resolve, duration));

interface GamePageProps {
	rooms: RoomDefinition[];
	onRegenerateRooms: () => void;
	onRoomOutcome: (
		roomId: string,
		outcome: 'success' | 'failure',
		roomEmojis?: string[],
	) => void;
	onCollectEmoji: (emoji: string) => void;
}

const GamePage = ({
	rooms,
	onRegenerateRooms,
	onRoomOutcome,
	onCollectEmoji,
}: GamePageProps) => {
	const navigate = useNavigate();
	const { roomId } = useParams<{ roomId: string }>();
	const selectedRoom = useMemo(
		() => rooms.find((room) => room.id === roomId) ?? null,
		[rooms, roomId],
	);

	const [attemptsLeft, setAttemptsLeft] = useState<number>(MAX_ATTEMPTS);
	const [sequence, setSequence] = useState<MoveId[]>([]);
	const [position, setPosition] = useState<Point | null>(null);
	const [trail, setTrail] = useState<Point[]>([]);
	const [gameState, setGameState] = useState<GameState>('ready');
	const [showGameOverModal, setShowGameOverModal] = useState(false);
	const [message, setMessage] = useState(
		'Обери блоки руху й проведи героя до виходу.',
	);

	const obstacleSet = useMemo(
		() =>
			new Set(
				selectedRoom?.obstacles.map((cell) => pointKey(cell)) ?? [],
			),
		[selectedRoom],
	);

	const decorationLookup = useMemo(() => {
		const lookup = new Map<string, RoomDefinition['decorations'][number]>();

		selectedRoom?.decorations.forEach((decoration) => {
			lookup.set(pointKey(decoration.point), decoration);
		});

		return lookup;
	}, [selectedRoom]);

	const trailSet = useMemo(
		() => new Set(trail.map((cell) => pointKey(cell))),
		[trail],
	);

	useEffect(() => {
		if (!selectedRoom) {
			return;
		}

		setAttemptsLeft(MAX_ATTEMPTS);
		setSequence([]);
		setPosition(selectedRoom.start);
		setTrail([selectedRoom.start]);
		setGameState('ready');
		setShowGameOverModal(false);
		setMessage(selectedRoom.hintSummary);
	}, [selectedRoom]);

	if (!roomId) {
		return <Navigate to='/' replace />;
	}

	if (!selectedRoom) {
		return <Navigate to='/' replace />;
	}

	const addMove = (move: MoveId) => {
		if (gameState === 'running' || gameState === 'success') {
			return;
		}

		setSequence((current) => [...current, move]);
		void trackEvent('add_move_block', {
			room_id: selectedRoom.id,
			move,
		});
	};

	const removeMoveAt = (indexToRemove: number) => {
		if (gameState === 'running') {
			return;
		}

		setSequence((current) =>
			current.filter((_, index) => index !== indexToRemove),
		);
	};

	const clearSequence = () => {
		if (gameState === 'running' || showGameOverModal) {
			return;
		}

		setSequence([]);
		setPosition(selectedRoom.start);
		setTrail([selectedRoom.start]);
		setGameState('ready');
		setMessage('Послідовність очищено. Збери новий маршрут.');
		void trackEvent('clear_route_sequence', {
			room_id: selectedRoom.id,
		});
	};

	const retryRoom = () => {
		setAttemptsLeft(MAX_ATTEMPTS);
		setSequence([]);
		setPosition(selectedRoom.start);
		setTrail([selectedRoom.start]);
		setGameState('ready');
		setShowGameOverModal(false);
		setMessage(selectedRoom.hintSummary);
		void trackEvent('retry_room', {
			room_id: selectedRoom.id,
		});
	};

	const regenerateLevel = () => {
		setShowGameOverModal(false);
		onRegenerateRooms();
		void trackEvent('regenerate_level', {
			room_id: selectedRoom.id,
		});
	};

	const runSequence = async () => {
		if (
			gameState === 'running' ||
			sequence.length === 0 ||
			showGameOverModal
		) {
			return;
		}

		setGameState('running');
		setMessage('Герой почав рух. Дивись уважно за кожним блоком.');
		void trackEvent('start_route_run', {
			room_id: selectedRoom.id,
			sequence_length: sequence.length,
			attempts_left: attemptsLeft,
		});

		let currentPosition = selectedRoom.start;
		const nextTrail: Point[] = [selectedRoom.start];
		const collectedInRun = new Set<string>();
		setPosition(selectedRoom.start);
		setTrail(nextTrail);

		for (const move of sequence) {
			await sleep(520);
			currentPosition = movePoint(currentPosition, move);
			nextTrail.push(currentPosition);
			setPosition(currentPosition);
			setTrail([...nextTrail]);

			const decoration = decorationLookup.get(pointKey(currentPosition));

			if (decoration) {
				collectedInRun.add(decoration.emoji);
				onCollectEmoji(decoration.emoji);
			}

			const outOfBounds =
				currentPosition.x < 0 ||
				currentPosition.y < 0 ||
				currentPosition.x >= selectedRoom.gridSize ||
				currentPosition.y >= selectedRoom.gridSize;

			if (outOfBounds || obstacleSet.has(pointKey(currentPosition))) {
				const nextAttempts = attemptsLeft - 1;

				setSequence([]);

				if (nextAttempts > 0) {
					setAttemptsLeft(nextAttempts);
					setPosition(selectedRoom.start);
					setTrail([selectedRoom.start]);
					setGameState('ready');
					setMessage(
						`${selectedRoom.failureTitle}: ${selectedRoom.failureMessage} У тебе ще 1 спроба.`,
					);
					onRoomOutcome(selectedRoom.id, 'failure', []);
					return;
				}

				setAttemptsLeft(0);
				setPosition(selectedRoom.start);
				setTrail([selectedRoom.start]);
				setSequence([]);
				setGameState('ready');
				setShowGameOverModal(true);
				setMessage('Спробуйте повторити рівень ще раз.');
				onRoomOutcome(selectedRoom.id, 'failure', []);
				return;
			}

			if (isSamePoint(currentPosition, selectedRoom.exit)) {
				setGameState('success');
				setMessage(
					`${selectedRoom.successTitle}: ${selectedRoom.successMessage}`,
				);
				onRoomOutcome(selectedRoom.id, 'success', [...collectedInRun]);
				return;
			}
		}

		setGameState('ready');
		setMessage(
			'Маршрут завершився, але до виходу ще не дійшли. Додай ще блоки.',
		);
	};

	const renderBoard = () => {
		const currentPosition = position ?? selectedRoom.start;
		const cells: Point[] = [];

		for (let y = 0; y < selectedRoom.gridSize; y += 1) {
			for (let x = 0; x < selectedRoom.gridSize; x += 1) {
				cells.push({ x, y });
			}
		}

		return (
			<Stack
				className='board'
				style={{ ['--grid-size' as string]: selectedRoom.gridSize }}
			>
				{cells.map((cell) => {
					const key = pointKey(cell);
					const isObstacle = obstacleSet.has(key);
					const decoration = decorationLookup.get(key);
					const isTrail = trailSet.has(key);
					const isStart = isSamePoint(cell, selectedRoom.start);
					const isExit = isSamePoint(cell, selectedRoom.exit);
					const isCurrent = isSamePoint(cell, currentPosition);

					return (
						<Stack
							key={key}
							className={[
								'cell',
								isTrail ? 'cell--trail' : '',
								isObstacle ? 'cell--obstacle' : '',
								isExit ? 'cell--exit' : '',
								isCurrent ? 'cell--current' : '',
							]
								.filter(Boolean)
								.join(' ')}
						>
							<span className='cell__light' />
							{isStart ? (
								<span className='cell__tag'>Старт</span>
							) : null}
							{isExit ? (
								<span className='cell__tag cell__tag--goal'>
									Вихід
								</span>
							) : null}
							{decoration ? (
								<span
									className='cell__decor'
									aria-label={decoration.label}
								>
									{decoration.emoji}
								</span>
							) : null}
							{isObstacle ? (
								<span className='cell__obstacle'>
									{selectedRoom.obstacleEmoji}
								</span>
							) : null}
							{isCurrent ? (
								<span className='cell__hero'>
									{selectedRoom.characterEmoji}
								</span>
							) : null}
						</Stack>
					);
				})}
			</Stack>
		);
	};

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<Stack>
					<p className='eyebrow'>{selectedRoom.difficultyLabel}</p>
					<h1>{selectedRoom.title}</h1>
					<p className='heroLead'>{selectedRoom.description}</p>
				</Stack>

				<Stack className='heroStats' direction='row'>
					<span
						style={{
							alignSelf: 'center',
						}}
					>
						Спроб: {attemptsLeft}
					</span>
					<span
						style={{
							alignSelf: 'center',
						}}
					>
						Кроків: {selectedRoom.solutionMoves.length}
					</span>
					<AppButton
						type='button'
						tone='ghost'
						className='ghostButton'
						onClick={regenerateLevel}
						disabled={gameState === 'running'}
					>
						Перегенерувати рівень
					</AppButton>
					<AppButton
						type='button'
						tone='ghost'
						className='ghostButton'
						onClick={() => navigate('/')}
					>
						До кімнат
					</AppButton>
				</Stack>
			</header>

			<section className='gameLayout'>
				<AppCard
					component='article'
					className='scenePanel'
					style={{
						background: selectedRoom.theme.surface,
						boxShadow: `0 24px 58px ${selectedRoom.theme.glow}`,
					}}
				>
					<Stack className='statusBanner' data-state={gameState}>
						<strong>{message}</strong>
						<span>
							Потрібно пройти {selectedRoom.solutionMoves.length}{' '}
							кроків до виходу без зіткнення.
						</span>
					</Stack>

					<Stack className='boardFrame'>{renderBoard()}</Stack>

					<Stack className='scenePanel__footer'>
						<Stack>
							<span className='footerLabel'>Персонаж</span>
							<strong>{selectedRoom.characterLabel}</strong>
						</Stack>
						<Stack>
							<span className='footerLabel'>Перешкоди</span>
							<strong>{selectedRoom.obstacleCount}</strong>
						</Stack>
						<Stack>
							<span className='footerLabel'>Позиція</span>
							<strong>
								{position
									? `${position.x + 1}, ${position.y + 1}`
									: `${selectedRoom.start.x + 1}, ${selectedRoom.start.y + 1}`}
							</strong>
						</Stack>
					</Stack>
				</AppCard>

				<aside className='sidebar'>
					<AppCard component='section' className='sideSection'>
						<Stack className='sideSection__header' direction='row'>
							<Stack>
								<p className='eyebrow'>Блоки руху</p>
								<h3>Збери маршрут</h3>
							</Stack>
							<span className='sideSection__note'>
								Потрібно обрати правильну послідовність
							</span>
						</Stack>

						<Stack className='movePalette'>
							{MOVE_DEFINITIONS.map((move) => (
								<AppButton
									key={move.id}
									type='button'
									tone='ghost'
									className='moveBlock'
									onClick={() => addMove(move.id)}
									disabled={gameState === 'running'}
								>
									<span className='moveBlock__arrow'>
										{move.arrow}
									</span>
									<span className='moveBlock__label'>
										{move.label}
									</span>
								</AppButton>
							))}
						</Stack>
					</AppCard>

					<AppCard component='section' className='sideSection'>
						<Stack className='sideSection__header' direction='row'>
							<Stack>
								<p className='eyebrow'>Зібраний шлях</p>
								<h3>Послідовність</h3>
							</Stack>
							<span className='sideSection__note'>
								Натисни на блок, щоб прибрати його
							</span>
						</Stack>

						<Stack
							className='routeList'
							aria-label='Зібрана послідовність блоків'
						>
							{sequence.length === 0 ? (
								<p className='emptyState'>
									Поки що тут порожньо. Додай перший блок
									руху.
								</p>
							) : (
								sequence.map((move, index) => {
									const definition = getMoveDefinition(move);

									return (
										<AppButton
											key={`${move}-${index}`}
											type='button'
											tone='ghost'
											className='routeItem'
											onClick={() => removeMoveAt(index)}
											disabled={gameState === 'running'}
										>
											<span className='routeItem__index'>
												{index + 1}
											</span>
											<span className='routeItem__arrow'>
												{definition.arrow}
											</span>
											<span className='routeItem__label'>
												{definition.label}
											</span>
										</AppButton>
									);
								})
							)}
						</Stack>

						<p className='helperText'>
							Список прокручується, якщо блоків стане багато.
							Можеш будувати довгий маршрут без обмеження.
						</p>
					</AppCard>

					<AppCard component='section' className='sideSection'>
						<Stack className='sideSection__header' direction='row'>
							<Stack>
								<p className='eyebrow'>Підказки</p>
								<h3>Як будувати послідовність</h3>
							</Stack>
						</Stack>

						<p className='hintText'>{selectedRoom.hintSummary}</p>

						<Stack className='hintPills' direction='row'>
							{selectedRoom.solutionMoves
								.slice(0, 3)
								.map((move, index) => {
									const definition = getMoveDefinition(move);

									return (
										<span
											className='hintPill'
											key={`${definition.id}-${index}`}
										>
											{index + 1}. {definition.arrow}{' '}
											{definition.label}
										</span>
									);
								})}
						</Stack>

						<p className='helperText'>
							Якщо герой торкнеться перешкоди, ти втратиш одну
							спробу. Після другої невдачі повернешся на головну.
						</p>
					</AppCard>

					<Stack className='actionRow' direction='row'>
						<AppButton
							type='button'
							tone='primary'
							className='primaryButton'
							onClick={runSequence}
							disabled={
								gameState === 'running' || sequence.length === 0
							}
						>
							Запустити маршрут
						</AppButton>
						<AppButton
							type='button'
							tone='secondary'
							className='secondaryButton'
							onClick={clearSequence}
						>
							Очистити
						</AppButton>
						<AppButton
							type='button'
							tone='ghost'
							className='ghostButton'
							onClick={() => navigate('/')}
						>
							До кімнат
						</AppButton>
					</Stack>
				</aside>
			</section>

			<AppDialog
				open={showGameOverModal}
				onClose={() => undefined}
				slotProps={{
					paper: {
						className: 'modalCard',
					},
				}}
				title={
					<>
						<p className='modalCard__eyebrow'>Гру завершено</p>
						<h3 id='game-over-title'>Гру програно</h3>
					</>
				}
				actions={
					<>
						<AppButton
							type='button'
							tone='primary'
							className='primaryButton'
							onClick={retryRoom}
						>
							Повторити рівень
						</AppButton>
						<AppButton
							type='button'
							tone='ghost'
							className='ghostButton'
							onClick={() => navigate('/')}
						>
							До кімнат
						</AppButton>
					</>
				}
			>
				<p>
					Спробуйте повторити рівень ще раз або оберіть іншу кімнату.
				</p>
			</AppDialog>
		</main>
	);
};

export default GamePage;
