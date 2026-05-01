import Card, { type CardProps } from '@mui/material/Card';
import { forwardRef } from 'react';

const AppCard = forwardRef<HTMLDivElement, CardProps>(
	function AppCard(props, ref) {
		return <Card ref={ref} elevation={0} {...props} />;
	},
);

export default AppCard;
