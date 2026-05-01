import Button, { type ButtonProps } from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';

export type AppButtonTone = 'primary' | 'secondary' | 'ghost';

interface AppButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
	tone?: AppButtonTone;
}

const toneToVariant: Record<AppButtonTone, ButtonProps['variant']> = {
	primary: 'contained',
	secondary: 'outlined',
	ghost: 'text',
};

const toneToColor: Record<AppButtonTone, ButtonProps['color']> = {
	primary: 'primary',
	secondary: 'secondary',
	ghost: 'inherit',
};

const toneSx: Record<AppButtonTone, SxProps<Theme>> = {
	primary: {},
	secondary: {},
	ghost: {
		backgroundColor: '#5f8f2d',
		color: '#eaf1f5',
		'&:hover': {
			backgroundColor: '#537d27',
			color: '#eaf1f5',
		},
		'&:focus-visible': {
			backgroundColor: '#537d27',
			color: '#eaf1f5',
		},
		'&.Mui-disabled': {
			backgroundColor: '#5f8f2d',
			color: '#eaf1f5',
			opacity: 0.6,
		},
	},
};

const AppButton = ({ tone = 'primary', sx, ...props }: AppButtonProps) => (
	<Button
		variant={toneToVariant[tone]}
		color={toneToColor[tone]}
		sx={[toneSx[tone], ...(Array.isArray(sx) ? sx : [sx])].filter(Boolean)}
		disableElevation
		{...props}
	/>
);

export default AppButton;
