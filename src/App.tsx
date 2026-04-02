import { Navigate, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { createRooms, type RoomDefinition } from './game';
import GamePage from './pages/GamePage';
import HomePage from './pages/HomePage';

const App = () => {
	const [rooms, setRooms] = useState<RoomDefinition[]>(() => createRooms());

	const regenerateRooms = () => {
		setRooms(createRooms());
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
			<Route path='/game/:roomId' element={<GamePage rooms={rooms} />} />
			<Route path='*' element={<Navigate to='/' replace />} />
		</Routes>
	);
};

export default App;
