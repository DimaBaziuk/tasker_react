import FormControl from '@mui/material/FormControl';
import Select, { type SelectProps } from '@mui/material/Select';

interface AppSelectProps extends Omit<SelectProps<string>, 'size'> {
	fullWidth?: boolean;
}

const AppSelect = ({ fullWidth = true, ...props }: AppSelectProps) => (
	<FormControl size='small' fullWidth={fullWidth}>
		<Select displayEmpty {...props} />
	</FormControl>
);

export default AppSelect;
