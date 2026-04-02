import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { createRoom, createRooms, type RoomDefinition } from './game';
import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';

const App = () => {
	const navigate = useNavigate();
	const [rooms, setRooms] = useState<RoomDefinition[]>(() => createRooms());
	const consecutiveWinsRef = useRef(0);

	const regenerateRooms = () => {
		setRooms(createRooms());
		consecutiveWinsRef.current = 0;
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

	const handleRoomOutcome = (roomId: string, outcome: 'success' | 'failure') => {
		if (outcome === 'failure') {
			consecutiveWinsRef.current = 0;
			return;
		}

		consecutiveWinsRef.current += 1;
		const nextWins = consecutiveWinsRef.current;
		regenerateRoom(roomId);

		if (nextWins < 2) {
			return;
		}

		const nextRoom = rooms.filter((room) => room.id !== roomId);
		const targetRoom = nextRoom[Math.floor(Math.random() * nextRoom.length)];

		consecutiveWinsRef.current = 0;

		if (targetRoom) {
			navigate(`/game/${targetRoom.id}`);
		}
	};

	return (
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
					/>
				}
			/>
			<Route path='*' element={<Navigate to='/' replace />} />
		</Routes>
	);
};

export default App;
