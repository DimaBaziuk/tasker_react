import { useLocation, useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import type { RoomDefinition } from '../game';
import { trackEvent } from '../analytics';
import { AppButton, AppCard, AppDialog } from '../ui/primitives';

type GameOverState = {
	gameOver?: boolean;
	title?: string;
	message?: string;
};

interface HomePageProps {
	rooms: RoomDefinition[];
	onRegenerateRooms?: () => void;
}

const HomePage = ({ rooms }: HomePageProps) => {
	const navigate = useNavigate();
	const location = useLocation();
	const gameOverState =
		(location.state as GameOverState | null | undefined) ?? null;

	const handleOpenRoutineRoom = () => {
		void trackEvent('select_room', {
			room_id: 'daily-routines',
			room_type: 'routine',
		});
		navigate('/routine-room');
	};

	const handleOpenWordRoom = () => {
		void trackEvent('select_room', {
			room_id: 'word-builder',
			room_type: 'words',
		});
		navigate('/word-room');
	};

	const handleOpenSafetyRoom = () => {
		void trackEvent('select_room', {
			room_id: 'safety-lab',
			room_type: 'safety',
		});
		navigate('/safety-room');
	};

	const handleOpenMathRoom = () => {
		void trackEvent('select_room', {
			room_id: 'math-grid',
			room_type: 'math',
		});
		navigate('/math-room');
	};

	const handleOpenCreativeRoom = () => {
		void trackEvent('select_room', {
			room_id: 'creative-studio',
			room_type: 'creative',
		});
		navigate('/creative-room');
	};

	const handleOpenGameRoom = (roomId: string, difficultyLabel: string) => {
		void trackEvent('select_room', {
			room_id: roomId,
			difficulty: difficultyLabel,
			room_type: 'algorithm',
		});
		navigate(`/game/${roomId}`);
	};

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<Stack>
					<p className='eyebrow'>Навчальна гра з алгоритмами дій</p>
					<h1>
						Складай маршрут, рухай героя і вчи логіку крок за кроком
					</h1>
					<p className='heroLead'>
						Обирай одну з кімнат, комбінуй блоки руху українською та
						допоможи персонажу дістатися до виходу без зіткнення з
						перешкодами.
					</p>
				</Stack>

				<Stack className='heroStats' direction='row'>
					<span>8 кімнат</span>
					<span>Підказки рухів</span>
					<span>
						Лабіринти + слова + розпорядок дня + безпека +
						математика + творчість
					</span>
				</Stack>
			</header>

			<section className='roomSelection'>
				<AppCard
					component='button'
					className='roomCard roomCard--routine'
					onClick={handleOpenRoutineRoom}
				>
					<span className='roomCard__badge'>Нова кімната</span>
					<span className='roomCard__emoji'>🧠</span>
					<h2>Щоденні справи</h2>
					<p>
						Три списки: ранок, обід і вечір. Відсортуй 7 пунктів у
						правильному порядку та набери до 120 балів.
					</p>
					<Stack className='roomCard__facts' direction='row'>
						<span>3 частини дня</span>
						<span>7 кроків у кожній</span>
						<span>Максимум 120</span>
					</Stack>
					<span className='roomCard__cta'>Відкрити кімнату</span>
				</AppCard>

				<AppCard
					component='button'
					className='roomCard roomCard--safety'
					onClick={handleOpenSafetyRoom}
				>
					<span className='roomCard__badge'>Нова кімната</span>
					<span className='roomCard__emoji'>🚒</span>
					<h2>Безпека вдома</h2>
					<p>
						Три секції в одному раунді: пожежна безпека,
						електроприлади та безпека біля річок і озер. Прибери
						небезпечні картки перетягуванням.
					</p>
					<Stack className='roomCard__facts' direction='row'>
						<span>3 секції</span>
						<span>10 карток на секцію</span>
						<span>До 300 балів</span>
					</Stack>
					<span className='roomCard__cta'>Відкрити кімнату</span>
				</AppCard>

				<AppCard
					component='button'
					className='roomCard roomCard--math'
					onClick={handleOpenMathRoom}
				>
					<span className='roomCard__badge'>Нова кімната</span>
					<span className='roomCard__emoji'>➗</span>
					<h2>Математична сітка 9x9</h2>
					<p>
						У кожній клітинці є свій приклад. Натискай клітинку,
						розв'язуй і перевіряй відповідь: правильна клітинка
						зелена, неправильна червона.
					</p>
					<Stack className='roomCard__facts' direction='row'>
						<span>81 приклад</span>
						<span>1-4 клас</span>
						<span>Майже рівний розподіл</span>
					</Stack>
					<span className='roomCard__cta'>Відкрити кімнату</span>
				</AppCard>

				<AppCard
					component='button'
					className='roomCard roomCard--creative'
					onClick={handleOpenCreativeRoom}
				>
					<span className='roomCard__badge'>Нова кімната</span>
					<span className='roomCard__emoji'>🎨</span>
					<h2>Кімната творчості</h2>
					<p>
						Малюй власні ідеї як у простому Paint: обирай колір,
						товщину лінії, використовуй гумку та зберігай малюнок у
						PNG.
					</p>
					<Stack className='roomCard__facts' direction='row'>
						<span>Пензлик + гумка</span>
						<span>Undo / Redo</span>
						<span>Експорт PNG</span>
					</Stack>
					<span className='roomCard__cta'>Відкрити кімнату</span>
				</AppCard>

				<AppCard
					component='button'
					className='roomCard roomCard--words'
					onClick={handleOpenWordRoom}
				>
					<span className='roomCard__badge'>Нова кімната</span>
					<span className='roomCard__emoji'>🔤</span>
					<h2>Словотвор</h2>
					<p>
						Отримай перемішані літери, складай слова, перевіряй
						результат і дивись, які варіанти залишилися.
					</p>
					<Stack className='roomCard__facts' direction='row'>
						<span>5 балів за слово</span>
						<span>11 наборів літер</span>
						<span>Кнопка "Нові слова"</span>
					</Stack>
					<span className='roomCard__cta'>Відкрити кімнату</span>
				</AppCard>

				{rooms.map((room) => (
					<AppCard
						component='button'
						key={room.id}
						className='roomCard'
						style={{
							background: room.theme.surface,
							boxShadow: `0 18px 38px ${room.theme.glow}`,
						}}
						onClick={() =>
							handleOpenGameRoom(room.id, room.difficultyLabel)
						}
					>
						<span className='roomCard__badge'>
							{room.difficultyLabel}
						</span>
						<span className='roomCard__emoji'>
							{room.characterEmoji}
						</span>
						<h2>{room.title}</h2>
						<p>{room.description}</p>
						<Stack className='roomCard__facts' direction='row'>
							<span>{room.characterLabel}</span>
							<span>{room.obstacleCount} перешкод</span>
							<span>
								{room.gridSize}×{room.gridSize}
							</span>
						</Stack>
						<span className='roomCard__cta'>Обрати кімнату</span>
					</AppCard>
				))}
			</section>

			<AppDialog
				open={Boolean(gameOverState?.gameOver)}
				onClose={() => navigate('/', { replace: true, state: null })}
				slotProps={{
					paper: {
						className: 'modalCard',
					},
				}}
				title={
					<>
						<p className='modalCard__eyebrow'>
							{gameOverState?.title ?? 'Гру завершено'}
						</p>
						<h3>Гру програно</h3>
					</>
				}
				actions={
					<AppButton
						type='button'
						tone='primary'
						className='primaryButton'
						onClick={() =>
							navigate('/', { replace: true, state: null })
						}
					>
						Повернутися до рівнів
					</AppButton>
				}
			>
				<p>{gameOverState?.message ?? 'Спробуйте інший рівень.'}</p>
			</AppDialog>
		</main>
	);
};

export default HomePage;
