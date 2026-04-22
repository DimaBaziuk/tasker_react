import { useLocation, useNavigate } from 'react-router-dom';
import type { RoomDefinition } from '../game';
import { trackEvent } from '../analytics';

type GameOverState = {
	gameOver?: boolean;
	title?: string;
	message?: string;
};

interface HomePageProps {
	rooms: RoomDefinition[];
	onRegenerateRooms: () => void;
}

const HomePage = ({ rooms, onRegenerateRooms }: HomePageProps) => {
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

	const handleOpenGameRoom = (roomId: string, difficultyLabel: string) => {
		void trackEvent('select_room', {
			room_id: roomId,
			difficulty: difficultyLabel,
			room_type: 'algorithm',
		});
		navigate(`/game/${roomId}`);
	};

	const handleRegenerateRooms = () => {
		void trackEvent('home_new_rooms_click', {
			rooms_count: rooms.length,
		});
		onRegenerateRooms();
	};

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<div>
					<p className='eyebrow'>Навчальна гра з алгоритмами дій</p>
					<h1>
						Складай маршрут, рухай героя і вчи логіку крок за кроком
					</h1>
					<p className='heroLead'>
						Обирай одну з кімнат, комбінуй блоки руху українською та
						допоможи персонажу дістатися до виходу без зіткнення з
						перешкодами.
					</p>
				</div>

				<div className='heroStats'>
					<span>4 кімнати</span>
					<span>Підказки рухів</span>
					<span>Рандомні перешкоди + розпорядок дня</span>
				</div>
			</header>

			<section className='roomSelection'>
				<button
					type='button'
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
					<div className='roomCard__facts'>
						<span>3 частини дня</span>
						<span>7 кроків у кожній</span>
						<span>Максимум 120</span>
					</div>
					<span className='roomCard__cta'>Відкрити кімнату</span>
				</button>

				{rooms.map((room) => (
					<button
						key={room.id}
						type='button'
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
						<div className='roomCard__facts'>
							<span>{room.characterLabel}</span>
							<span>{room.obstacleCount} перешкод</span>
							<span>
								{room.gridSize}×{room.gridSize}
							</span>
						</div>
						<span className='roomCard__cta'>Обрати кімнату</span>
					</button>
				))}
			</section>

			<div className='homeActions'>
				<button
					type='button'
					className='ghostButton'
					onClick={handleRegenerateRooms}
				>
					Нові кімнати
				</button>
			</div>

			{gameOverState?.gameOver ? (
				<div className='modalOverlay' role='presentation'>
					<div
						className='modalCard'
						role='alertdialog'
						aria-modal='true'
						aria-labelledby='game-over-title'
					>
						<p className='modalCard__eyebrow'>
							{gameOverState.title ?? 'Гру завершено'}
						</p>
						<h3 id='game-over-title'>Гру програно</h3>
						<p>
							{gameOverState.message ?? 'Спробуйте інший рівень.'}
						</p>
						<button
							type='button'
							className='primaryButton'
							onClick={() =>
								navigate('/', { replace: true, state: null })
							}
						>
							Повернутися до рівнів
						</button>
					</div>
				</div>
			) : null}
		</main>
	);
};

export default HomePage;
