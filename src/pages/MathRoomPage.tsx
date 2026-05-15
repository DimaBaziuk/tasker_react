import { FormEvent, useMemo, useState, type CSSProperties } from 'react';
import { Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../analytics';
import {
	MATH_GRID_SIZE,
	MATH_POINTS_PER_CORRECT,
	MATH_ROOM_ID,
	createMathGrid,
	evaluateMathAnswer,
} from '../math_room/engine';
import type { MathGridCell } from '../math_room/types';
import { AppButton, AppCard, AppDialog, AppInput } from '../ui/primitives';

interface MathRoomPageProps {
	onRoomOutcome: (
		roomId: string,
		outcome: 'success' | 'failure',
		roomEmojis?: string[],
		scoreOverride?: number,
	) => void;
}

const MathRoomPage = ({ onRoomOutcome }: MathRoomPageProps) => {
	const navigate = useNavigate();
	const [cells, setCells] = useState<MathGridCell[]>(() => createMathGrid());
	const [activeCellId, setActiveCellId] = useState<string | null>(null);
	const [answerInput, setAnswerInput] = useState('');
	const [feedback, setFeedback] = useState(
		'Натисни на будь-яку клітинку: там буде приклад або коротка усна задача. Правильна відповідь підсвітить клітинку зеленим.',
	);
	const [showGradeHint, setShowGradeHint] = useState(false);

	const activeCell = useMemo(
		() => cells.find((cell) => cell.id === activeCellId) ?? null,
		[cells, activeCellId],
	);

	const correctCount = useMemo(
		() => cells.filter((cell) => cell.status === 'correct').length,
		[cells],
	);
	const wrongCount = useMemo(
		() => cells.filter((cell) => cell.status === 'wrong').length,
		[cells],
	);
	const solvedCount = correctCount + wrongCount;
	const totalScore = correctCount * MATH_POINTS_PER_CORRECT;

	const gradeCounts = useMemo(() => {
		return cells.reduce<Record<number, number>>(
			(accumulator, cell) => {
				accumulator[cell.task.grade] += 1;
				return accumulator;
			},
			{ 1: 0, 2: 0, 3: 0, 4: 0 },
		);
	}, [cells]);

	const openCell = (cellId: string) => {
		setActiveCellId(cellId);
		setAnswerInput('');
	};

	const closeDialog = () => {
		setActiveCellId(null);
		setAnswerInput('');
	};

	const handleSubmitAnswer = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!activeCell) {
			return;
		}

		const cleaned = answerInput.trim();

		if (!cleaned || !/^-?\d+$/.test(cleaned)) {
			setFeedback('Введи ціле число у відповідь.');
			return;
		}

		const parsedAnswer = Number(cleaned);
		const updatedCell = evaluateMathAnswer(activeCell, parsedAnswer);

		setCells((current) =>
			current.map((cell) => {
				if (cell.id !== activeCell.id) {
					return cell;
				}

				return updatedCell;
			}),
		);

		const nextCorrectCount =
			correctCount +
			(updatedCell.status === 'correct' ? 1 : 0) -
			(activeCell.status === 'correct' ? 1 : 0);
		const nextSolvedCount =
			solvedCount + (activeCell.status === 'idle' ? 1 : 0);
		const nextScore = nextCorrectCount * MATH_POINTS_PER_CORRECT;

		onRoomOutcome(MATH_ROOM_ID, 'success', [], nextScore);

		if (updatedCell.status === 'correct') {
			setFeedback('Правильно! Клітинка стала зеленою. Продовжуй.');
		} else {
			setFeedback(
				`Поки що ні. Правильна відповідь: ${activeCell.task.answer}. Клітинка стала червоною.`,
			);
		}

		void trackEvent('math_room_answer', {
			grade: activeCell.task.grade,
			is_correct: updatedCell.status === 'correct',
			score: nextScore,
			solved_count: nextSolvedCount,
		});

		closeDialog();
	};

	const resetGrid = () => {
		setCells(createMathGrid());
		setActiveCellId(null);
		setAnswerInput('');
		setFeedback(
			'Згенеровано нову сітку 9x9 з новими прикладами для 1-4 класів.',
		);
		onRoomOutcome(MATH_ROOM_ID, 'success', [], 0);
		void trackEvent('math_room_reset_grid');
	};

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<Stack>
					<p className='eyebrow'>Нова кімната: Математика 9x9</p>
					<h1>Розв\'яжи приклади у кожній клітинці великої сітки</h1>
					<p className='heroLead'>
						Кожна клітинка містить окремий приклад або просту усну
						задачу. Натисни на клітинку, введи відповідь і перевір
						результат. Вірна відповідь робить клітинку зеленою,
						невірна - червоною.
					</p>
				</Stack>

				<Stack
					className='heroStats heroStats--mathRoom'
					direction='row'
				>
					<span>
						Сітка: {MATH_GRID_SIZE}x{MATH_GRID_SIZE}
					</span>
					<span>Розв\'язано: {solvedCount}/81</span>
					<span>Балів: {totalScore}</span>
					<AppButton
						type='button'
						tone='ghost'
						className='ghostButton'
						onClick={() => navigate('/')}
					>
						До кімнат
					</AppButton>
				</Stack>
			</header>

			<section className='mathRoom'>
				<AppCard
					component='article'
					className='mathRoomCard mathRoomCard--board'
				>
					<div
						className='mathGrid'
						style={
							{ '--grid-size': MATH_GRID_SIZE } as CSSProperties
						}
					>
						{cells.map((cell, index) => (
							<button
								type='button'
								key={cell.id}
								className={`mathCell mathCell--${cell.status}`}
								onClick={() => openCell(cell.id)}
								aria-label={`Клітинка ${index + 1}, клас ${cell.task.grade}`}
							>
								<span className='mathCell__index'>
									{index + 1}
								</span>
								<span className='mathCell__grade'>
									{cell.task.grade} клас
								</span>
							</button>
						))}
					</div>
				</AppCard>

				<AppCard
					component='article'
					className='mathRoomCard mathRoomCard--summary'
				>
					<h2>Підсумок кімнати</h2>
					<p className='wordRoomFeedback'>{feedback}</p>

					<Stack className='mathSummaryPills' direction='row'>
						<span>Правильних: {correctCount}</span>
						<span>Неправильних: {wrongCount}</span>
						<span>
							Балів: {totalScore} / {81 * MATH_POINTS_PER_CORRECT}
						</span>
					</Stack>

					<Stack className='mathSummaryPills' direction='row'>
						<span>1 клас: {gradeCounts[1]}</span>
						<span>2 клас: {gradeCounts[2]}</span>
						<span>3 клас: {gradeCounts[3]}</span>
						<span>4 клас: {gradeCounts[4]}</span>
					</Stack>

					<Stack className='actionRow' sx={{ mt: 2 }}>
						<AppButton
							type='button'
							tone='secondary'
							className='secondaryButton'
							onClick={() => setShowGradeHint(true)}
						>
							Які тут рівні?
						</AppButton>
						<AppButton
							type='button'
							tone='primary'
							className='primaryButton'
							onClick={resetGrid}
						>
							Нова сітка
						</AppButton>
					</Stack>
				</AppCard>
			</section>

			<AppDialog
				open={Boolean(activeCell)}
				onClose={closeDialog}
				slotProps={{
					paper: {
						className: 'modalCard modalCard--hint',
					},
				}}
				title={
					<>
						<p className='modalCard__eyebrow'>
							{activeCell?.task.kind === 'oral'
								? 'Усна задача'
								: 'Математичний приклад'}
						</p>
						<h3>{activeCell?.task.expression ?? ''} = ?</h3>
					</>
				}
			>
				<form className='mathAnswerForm' onSubmit={handleSubmitAnswer}>
					<label htmlFor='mathAnswerInput'>Твоя відповідь</label>
					<AppInput
						id='mathAnswerInput'
						type='text'
						value={answerInput}
						onChange={(event) => setAnswerInput(event.target.value)}
						autoComplete='off'
						fullWidth
						autoFocus
					/>
					<Stack className='actionRow' direction='row'>
						<AppButton
							type='button'
							tone='ghost'
							className='ghostButton'
							onClick={closeDialog}
						>
							Скасувати
						</AppButton>
						<AppButton
							type='submit'
							tone='primary'
							className='primaryButton'
						>
							Перевірити
						</AppButton>
					</Stack>
				</form>
			</AppDialog>

			<AppDialog
				open={showGradeHint}
				onClose={() => setShowGradeHint(false)}
				slotProps={{
					paper: {
						className: 'modalCard modalCard--hint',
					},
				}}
				title={
					<>
						<p className='modalCard__eyebrow'>Рівні складності</p>
						<h3>Приклади поділені за 1-4 класами</h3>
					</>
				}
				actions={
					<AppButton
						type='button'
						tone='primary'
						className='primaryButton'
						onClick={() => setShowGradeHint(false)}
					>
						Зрозуміло
					</AppButton>
				}
			>
				<p>1 клас: просте додавання/віднімання до 10.</p>
				<p>
					2 клас: додавання/віднімання в межах 100 та прості усні
					сюжети.
				</p>
				<p>
					3 клас: множення, ділення і прості усні задачі на групи
					предметів.
				</p>
				<p>
					4 клас: складніші приклади з більшими числами, множенням і
					діленням, а також короткі усні задачі.
				</p>
				<p>
					У сітці 81 клітинка, тому розподіл майже рівний:
					21/20/20/20.
				</p>
			</AppDialog>
		</main>
	);
};

export default MathRoomPage;
