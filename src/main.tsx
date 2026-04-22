import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.scss';
import App from './App.tsx';
import { initFirebaseAnalytics } from './firebase';

void initFirebaseAnalytics();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<HashRouter>
			<App />
		</HashRouter>
	</StrictMode>,
);
