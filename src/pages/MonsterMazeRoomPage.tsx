import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Alert,
	Box,
	Chip,
	IconButton,
	LinearProgress,
	Stack,
	Tooltip,
	Typography,
} from '@mui/material';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import KeyboardDoubleArrowUpRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowUpRounded';
import KeyboardDoubleArrowDownRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowDownRounded';
import KeyboardDoubleArrowLeftRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowLeftRounded';
import KeyboardDoubleArrowRightRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { trackEvent } from '../analytics';
import {
	MONSTER_GRID_SIZE,
	MONSTER_REQUIRED_COLLECTIBLES,
	MONSTER_ROOM_ID,
	ROOM_EXIT,
	calculateMonsterRoomScore,
	createMonsterRoomRound,
	runTurn,
} from '../monster_room/engine';
import type { Direction } from '../monster_room/types';
import { AppButton, AppCard, AppDialog } from '../ui/primitives';

interface MonsterMazeRoomPageProps {
	onRoomOutcome: (
		roomId: string,
		outcome: 'success' | 'failure',
		roomEmojis?: string[],
		scoreOverride?: number,
	) => void;
}

const DIRECTION_KEYS: Record<string, Direction> = {
	ArrowUp: 'up',
	ArrowDown: 'down',
	ArrowLeft: 'left',
	ArrowRight: 'right',
};

const DIRECTION_CONTROLS: Array<{
	direction: Direction;
	label: string;
	icon: ReactNode;
}> = [
	{
		direction: 'up',
		label: 'Вгору',
		icon: <KeyboardDoubleArrowUpRoundedIcon />,
	},
	{
		direction: 'left',
		label: 'Ліворуч',
		icon: <KeyboardDoubleArrowLeftRoundedIcon />,
	},
	{
		direction: 'down',
		label: 'Вниз',
		icon: <KeyboardDoubleArrowDownRoundedIcon />,
	},
	{
		direction: 'right',
		label: 'Праворуч',
		icon: <KeyboardDoubleArrowRightRoundedIcon />,
	},
];

const MonsterMazeRoomPage = ({ onRoomOutcome }: MonsterMazeRoomPageProps) => {
	const navigate = useNavigate();
	const [round, setRound] = useState(() => createMonsterRoomRound());
	const [status, setStatus] = useState<'playing' | 'won'>('playing');
	const [message, setMessage] = useState(
		'Збери 10 емодзі і тільки після цього відкриється вихід.',
	);
	const [collisions, setCollisions] = useState(0);
	const [showHelp, setShowHelp] = useState(false);
	const collisionResetRef = useRef<number | null>(null);

	const wallSet = useMemo(
		() => new Set(round.walls.map((wall) => `${wall.x}:${wall.y}`)),
		[round.walls],
	);
	const collectibleLookup = useMemo(() => {
		const lookup = new Map<string, string>();

		round.collectibles.forEach((collectible) => {
			if (!collectible.collected) {
				lookup.set(
					`${collectible.position.x}:${collectible.position.y}`,
					collectible.emoji,
				);
			}
		});

		return lookup;
	}, [round.collectibles]);
	const monsterLookup = useMemo(() => {
		const lookup = new Map<string, string>();

		round.monsters.forEach((monster) => {
			lookup.set(
				`${monster.position.x}:${monster.position.y}`,
				monster.emoji,
			);
		});

		return lookup;
	}, [round.monsters]);

	const progressValue =
		(round.collectedCount / MONSTER_REQUIRED_COLLECTIBLES) * 100;
	const currentScore = calculateMonsterRoomScore(round.collectedCount);
	const isExitOpen = round.collectedCount >= MONSTER_REQUIRED_COLLECTIBLES;

	const hardResetRound = (reason: 'collision' | 'manual') => {
		setRound(createMonsterRoomRound());
		setStatus('playing');
		setMessage(
			reason === 'collision'
				? 'Монстр зачепив персонажа. Кімнату перезавантажено.'
				: 'Починаємо новий забіг. Знову збери 10 емодзі.',
		);
	};

	const handleTurn = useCallback(
		(direction: Direction) => {
			if (status !== 'playing') {
				return;
			}

			const result = runTurn(round, direction);

			if (result.event === 'blocked') {
				setMessage('Стіна попереду. Обійди її іншим маршрутом.');
				void trackEvent('monster_room_wall_block', {
					direction,
					tick: round.tick,
				});
				return;
			}

			setRound(result.state);

			if (result.collectedEmoji) {
				setMessage(`Знайдено ${result.collectedEmoji}. Продовжуй рух.`);
				void trackEvent('monster_room_collect_emoji', {
					emoji: result.collectedEmoji,
					collected_count: result.state.collectedCount,
				});
			}

			if (result.event === 'collision') {
				const nextCollisions = collisions + 1;
				setCollisions(nextCollisions);
				setMessage('Зіткнення з монстром. Кімната перезапускається...');
				onRoomOutcome(MONSTER_ROOM_ID, 'failure');
				void trackEvent('monster_room_collision', {
					collisions: nextCollisions,
					tick: result.state.tick,
					collected_count: result.state.collectedCount,
				});

				if (collisionResetRef.current !== null) {
					window.clearTimeout(collisionResetRef.current);
				}

				collisionResetRef.current = window.setTimeout(() => {
					hardResetRound('collision');
				}, 650);
				return;
			}

			if (result.event === 'escaped') {
				const score = calculateMonsterRoomScore(
					result.state.collectedCount,
				);
				setStatus('won');
				setMessage('Кімнату пройдено. Вихід знайдено.');
				onRoomOutcome(MONSTER_ROOM_ID, 'success', [], score);
				void trackEvent('monster_room_completed', {
					score,
					collisions,
					ticks: result.state.tick,
				});
				return;
			}

			if (result.state.collectedCount === MONSTER_REQUIRED_COLLECTIBLES) {
				setMessage('Усі емодзі зібрано. Прямуй на клітинку виходу.');
			}
		},
		[collisions, onRoomOutcome, round, status],
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const direction = DIRECTION_KEYS[event.key];

			if (!direction) {
				return;
			}

			event.preventDefault();
			handleTurn(direction);
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleTurn]);

	useEffect(() => {
		return () => {
			if (collisionResetRef.current !== null) {
				window.clearTimeout(collisionResetRef.current);
			}
		};
	}, []);

	const boardCells = useMemo(() => {
		const cells: Array<{
			key: string;
			x: number;
			y: number;
			isWall: boolean;
			isExit: boolean;
			monsterEmoji?: string;
			collectibleEmoji?: string;
			isPlayer: boolean;
		}> = [];

		for (let y = 0; y < MONSTER_GRID_SIZE; y += 1) {
			for (let x = 0; x < MONSTER_GRID_SIZE; x += 1) {
				const key = `${x}:${y}`;
				cells.push({
					key,
					x,
					y,
					isWall: wallSet.has(key),
					isExit: x === ROOM_EXIT.x && y === ROOM_EXIT.y,
					monsterEmoji: monsterLookup.get(key),
					collectibleEmoji: collectibleLookup.get(key),
					isPlayer:
						round.playerPosition.x === x &&
						round.playerPosition.y === y,
				});
			}
		}

		return cells;
	}, [
		collectibleLookup,
		monsterLookup,
		round.playerPosition.x,
		round.playerPosition.y,
		wallSet,
	]);

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<Stack>
					<p className='eyebrow'>Нова кімната: Monster Maze</p>
					<h1>Лабіринт з активними монстрами і виходом</h1>
					<p className='heroLead'>
						Керуй персонажем стрілками на клавіатурі або кнопками
						нижче. Збери 10 емодзі й дійди до виходу, уникаючи трьох
						монстрів.
					</p>
				</Stack>

				<Stack
					className='heroStats heroStats--monsterRoom'
					direction='row'
				>
					<span>
						Сітка: {MONSTER_GRID_SIZE}x{MONSTER_GRID_SIZE}
					</span>
					<span>Монстрів: 3</span>
					<span>Зібрано: {round.collectedCount}/10</span>
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

			<section className='monsterRoom'>
				<AppCard
					component='article'
					className='monsterRoomCard monsterRoomCard--board'
				>
					<Box className='monsterRoomBoardWrap'>
						<div
							className='monsterGrid'
							style={
								{
									'--grid-size': MONSTER_GRID_SIZE,
								} as CSSProperties
							}
						>
							{boardCells.map((cell) => (
								<div
									key={cell.key}
									className={[
										'monsterCell',
										cell.isWall ? 'monsterCell--wall' : '',
										cell.isExit ? 'monsterCell--exit' : '',
									].join(' ')}
								>
									{cell.isExit ? (
										<span
											className={`monsterCell__exitTag ${isExitOpen ? 'monsterCell__exitTag--open' : ''}`}
										>
											{isExitOpen
												? 'ВИХІД ✅'
												: 'ВИХІД 🔒'}
										</span>
									) : null}
									{cell.collectibleEmoji ? (
										<span className='monsterCell__collectible'>
											{cell.collectibleEmoji}
										</span>
									) : null}
									{cell.monsterEmoji ? (
										<span className='monsterCell__monster'>
											{cell.monsterEmoji}
										</span>
									) : null}
									{cell.isPlayer ? (
										<span className='monsterCell__player'>
											🙂
										</span>
									) : null}
								</div>
							))}
						</div>
					</Box>
				</AppCard>

				<AppCard
					component='article'
					className='monsterRoomCard monsterRoomCard--panel'
				>
					<Stack spacing={1.25}>
						<Stack
							direction='row'
							sx={{
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<Typography variant='h6' sx={{ fontWeight: 800 }}>
								Панель кімнати
							</Typography>
							<Stack direction='row' spacing={0.8}>
								<Tooltip title='Підказка по правилах'>
									<IconButton
										size='small'
										onClick={() => setShowHelp(true)}
										aria-label='Показати підказку'
									>
										<InfoOutlinedIcon fontSize='small' />
									</IconButton>
								</Tooltip>
								<Tooltip title='Почати раунд заново'>
									<IconButton
										size='small'
										onClick={() => {
											hardResetRound('manual');
											void trackEvent(
												'monster_room_manual_restart',
												{
													collected_count:
														round.collectedCount,
													tick: round.tick,
												},
											);
										}}
										aria-label='Перезапустити кімнату'
									>
										<RestartAltRoundedIcon fontSize='small' />
									</IconButton>
								</Tooltip>
							</Stack>
						</Stack>

						<LinearProgress
							variant='determinate'
							value={Math.min(100, Math.max(0, progressValue))}
							sx={{
								height: 10,
								borderRadius: 999,
								backgroundColor: 'rgba(23, 49, 61, 0.12)',
							}}
						/>

						<Stack direction='row' className='monsterRoomPills'>
							<Chip
								label={`Бали: ${currentScore}`}
								color='primary'
								variant='outlined'
							/>
							<Chip
								label={`Зіткнення: ${collisions}`}
								color='error'
								variant='outlined'
							/>
							<Chip
								label={
									isExitOpen
										? 'Вихід відкрито'
										: 'Вихід закрито'
								}
								color={isExitOpen ? 'success' : 'default'}
								variant='outlined'
							/>
						</Stack>

						<Alert severity={status === 'won' ? 'success' : 'info'}>
							{message}
						</Alert>

						<div className='monsterControls'>
							{DIRECTION_CONTROLS.map((control) => (
								<AppButton
									key={control.direction}
									type='button'
									tone='secondary'
									className='secondaryButton'
									onClick={() =>
										handleTurn(control.direction)
									}
									disabled={status !== 'playing'}
								>
									<Stack
										direction='row'
										spacing={0.8}
										sx={{ alignItems: 'center' }}
									>
										{control.icon}
										<span>{control.label}</span>
									</Stack>
								</AppButton>
							))}
						</div>

						<Typography variant='body2' color='text.secondary'>
							Клавіатура: стрілки вгору/вниз/ліворуч/праворуч.
						</Typography>

						{status === 'won' ? (
							<AppButton
								type='button'
								tone='primary'
								className='primaryButton'
								onClick={() => hardResetRound('manual')}
							>
								Зіграти ще раунд
							</AppButton>
						) : null}
					</Stack>
				</AppCard>
			</section>

			<AppDialog
				open={showHelp}
				onClose={() => setShowHelp(false)}
				slotProps={{
					paper: {
						className: 'modalCard modalCard--hint',
					},
				}}
				title={
					<>
						<p className='modalCard__eyebrow'>Підказка кімнати</p>
						<h3>Monster Maze: як перемогти</h3>
					</>
				}
				actions={
					<AppButton
						type='button'
						tone='primary'
						className='primaryButton'
						onClick={() => setShowHelp(false)}
					>
						Зрозуміло
					</AppButton>
				}
			>
				<p>
					1. Персонаж рухається по одній клітинці за кожне натискання
					стрілки.
				</p>
				<p>
					2. Після твого кроку монстри теж роблять крок і намагаються
					наблизитись.
				</p>
				<p>3. При зіткненні кімната автоматично перезапускається.</p>
				<p>
					4. Для перемоги потрібно зібрати 10 емодзі і встати на
					клітинку виходу.
				</p>
			</AppDialog>
		</main>
	);
};

export default MonsterMazeRoomPage;
