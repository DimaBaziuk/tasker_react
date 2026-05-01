import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import './index.scss';
import App from './App.tsx';
import { appTheme } from './theme/appTheme';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<StyledEngineProvider injectFirst>
			<ThemeProvider theme={appTheme}>
				<CssBaseline />
				<HashRouter>
					<App />
				</HashRouter>
			</ThemeProvider>
		</StyledEngineProvider>
	</StrictMode>,
);
