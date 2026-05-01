import Dialog, { type DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import type { ReactNode } from 'react';

interface AppDialogProps extends Omit<DialogProps, 'title'> {
	title?: ReactNode;
	actions?: ReactNode;
	children?: ReactNode;
}

const AppDialog = ({ title, actions, children, ...props }: AppDialogProps) => (
	<Dialog {...props}>
		{title ? <DialogTitle component='div'>{title}</DialogTitle> : null}
		<DialogContent>{children}</DialogContent>
		{actions ? <DialogActions>{actions}</DialogActions> : null}
	</Dialog>
);

export default AppDialog;
