import React from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App';
import { NotifierProvider } from './contexts/Notifier';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
	palette: {
		mode: 'light',
		primary: { main: '#0f172a' },
		secondary: { main: '#60a5fa' },
	},
	typography: {
		fontFamily: ['Inter', 'Roboto', 'Arial', 'sans-serif'].join(','),
	},
});

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
	<React.StrictMode>
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<NotifierProvider>
				<App />
			</NotifierProvider>
		</ThemeProvider>
	</React.StrictMode>
);
