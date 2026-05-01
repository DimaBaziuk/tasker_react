import TextField, { type TextFieldProps } from '@mui/material/TextField';

const AppInput = (props: TextFieldProps) => (
	<TextField size='small' variant='outlined' fullWidth {...props} />
);

export default AppInput;
