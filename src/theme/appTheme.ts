import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
	palette: {
		mode: 'light',
		primary: {
			main: '#2c9f93',
			contrastText: '#ffffff',
		},
		secondary: {
			main: '#f59f2f',
			contrastText: '#17313d',
		},
		error: {
			main: '#d85b63',
		},
		success: {
			main: '#2f9966',
		},
		text: {
			primary: '#17313d',
			secondary: '#627480',
		},
		background: {
			default: '#ecf7f4',
			paper: '#fffcf5',
		},
	},
	typography: {
		fontFamily: "'Trebuchet MS', 'Verdana', sans-serif",
		button: {
			fontWeight: 700,
			textTransform: 'none',
		},
	},
	shape: {
		borderRadius: 12,
	},
});
