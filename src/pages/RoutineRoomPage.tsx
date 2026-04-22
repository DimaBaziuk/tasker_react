import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../analytics';

interface RoutineRoomPageProps {
	onRoomOutcome: (
		roomId: string,
		outcome: 'success' | 'failure',
		roomEmojis?: string[],
		scoreOverride?: number,
	) => void;
}

type DayPartKey = 'morning' | 'afternoon' | 'evening';

interface DayPartDefinition {
	key: DayPartKey;
	title: string;
	description: string;
	tasks: string[];
}

interface DayPartState extends DayPartDefinition {
	shuffledTasks: string[];
}

interface SectionResult {
	correctCount: number;
	score: number;
}

type TaskStatus = 'idle' | 'correct' | 'wrong';

const MAX_TASKS = 7;
const MAX_SECTION_SCORE = 40;
const ROOM_ID = 'daily-routines';
const MAX_HINT_OPENS = 2;

const DAY_PARTS: DayPartDefinition[] = [
	{
		key: 'morning',
		title: 'Ранок',
		description: 'Що робимо перед школою або виходом з дому.',
		tasks: [
			'Прокидаюся',
			'Заправляю ліжко',
			'Вмиваюся',
			'Чищу зуби',
			'Розчісуюся',
			'Снідаю',
			'Перевіряю рюкзак',
		],
	},
	{
		key: 'afternoon',
		title: 'Обід',
		description: 'Справи після школи та вдень.',
		tasks: [
			'Мию руки після вулиці',
			'Обідаю',
			'Прибираю за собою посуд',
			'Трохи відпочиваю',
			'Роблю домашнє завдання',
			'Питаю дорослих, чи потрібна допомога',
			'Готую речі на гурток або прогулянку',
		],
	},
	{
		key: 'evening',
		title: 'Вечір',
		description: 'Справи перед сном і підготовка до нового дня.',
		tasks: [
			'Вечеряю',
			'Прибираю робоче місце',
			'Готую одяг на завтра',
			'Збираю рюкзак на завтра',
			'Провітрюю кімнату',
			'Приймаю душ або вмиваюся',
			'Чищу зуби',
		],
	},
];

const rankOptions = Array.from({ length: MAX_TASKS }, (_, index) => index + 1);

const shuffle = <T,>(source: T[]): T[] => {
	const next = [...source];

	for (let index = next.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[next[index], next[swapIndex]] = [next[swapIndex], next[index]];
	}

	return next;
};

const createSections = (): DayPartState[] =>
	DAY_PARTS.map((part) => ({
		...part,
		shuffledTasks: shuffle(part.tasks),
	}));

const createInitialAnswers = (sections: DayPartState[]) =>
	sections.reduce<Record<DayPartKey, Record<string, number | null>>>(
		(accumulator, section) => {
			accumulator[section.key] = section.shuffledTasks.reduce<
				Record<string, number | null>
			>((taskAccumulator, task) => {
				taskAccumulator[task] = null;
				return taskAccumulator;
			}, {});
			return accumulator;
		},
		{
			morning: {},
			afternoon: {},
			evening: {},
		},
	);

const hasDuplicateRanks = (answersByTask: Record<string, number | null>) => {
	const values = Object.values(answersByTask).filter(
		(value): value is number => value !== null,
	);
	return new Set(values).size !== values.length;
};

const RoutineRoomPage = ({ onRoomOutcome }: RoutineRoomPageProps) => {
	const navigate = useNavigate();
	const [sections, setSections] = useState<DayPartState[]>(() =>
		createSections(),
	);
	const [answers, setAnswers] = useState<
		Record<DayPartKey, Record<string, number | null>>
	>(() => createInitialAnswers(sections));
	const [feedback, setFeedback] = useState(
		'Простав числа 1-7 біля кожної справи в кожному списку.',
	);
	const [sectionResults, setSectionResults] = useState<Record<
		DayPartKey,
		SectionResult
	> | null>(null);
	const [taskStatuses, setTaskStatuses] = useState<Record<
		DayPartKey,
		Record<string, TaskStatus>
	> | null>(null);
	const [totalScore, setTotalScore] = useState<number | null>(null);
	const [showHintModal, setShowHintModal] = useState(false);
	const [hintOpenCount, setHintOpenCount] = useState(0);
	const hintsLeft = MAX_HINT_OPENS - hintOpenCount;

	const canCheck = useMemo(
		() =>
			sections.every((section) =>
				section.shuffledTasks.every(
					(task) => answers[section.key][task] !== null,
				),
			),
		[answers, sections],
	);

	const resetRound = () => {
		const nextSections = createSections();
		setSections(nextSections);
		setAnswers(createInitialAnswers(nextSections));
		setSectionResults(null);
		setTaskStatuses(null);
		setTotalScore(null);
		setShowHintModal(false);
		setHintOpenCount(0);
		setFeedback('Новий порядок готовий. Відсортуй справи знову.');
		void trackEvent('routine_reset_round');
	};

	const openHintModal = () => {
		if (hintsLeft <= 0) {
			setFeedback(
				'Ліміт підказок вичерпано для цього раунду. Натисни "Новий порядок", щоб знову мати 2 підказки.',
			);
			return;
		}

		setHintOpenCount((current) => current + 1);
		setShowHintModal(true);
		void trackEvent('routine_hint_open', {
			hints_left_after_open: Math.max(0, hintsLeft - 1),
		});
	};

	const updateAnswer = (
		sectionKey: DayPartKey,
		task: string,
		value: number | null,
	) => {
		setAnswers((current) => ({
			...current,
			[sectionKey]: {
				...current[sectionKey],
				[task]: value,
			},
		}));
		setTaskStatuses(null);
	};

	const getUsedRanksInSection = (
		sectionKey: DayPartKey,
		currentTask: string,
	) => {
		const answersByTask = answers[sectionKey];
		const used = new Set<number>();

		Object.entries(answersByTask).forEach(([task, value]) => {
			if (task !== currentTask && value !== null) {
				used.add(value);
			}
		});

		return used;
	};

	const checkAnswers = () => {
		if (!canCheck) {
			setFeedback(
				'Щоб перевірити, потрібно поставити номер біля кожного пункту.',
			);
			return;
		}

		const duplicatedSection = sections.find((section) =>
			hasDuplicateRanks(answers[section.key]),
		);

		if (duplicatedSection) {
			setFeedback(
				`У списку "${duplicatedSection.title}" є повтори чисел. Кожне число 1-7 має бути використане один раз.`,
			);
			return;
		}

		const results = sections.reduce<Record<DayPartKey, SectionResult>>(
			(accumulator, section) => {
				const correctCount = section.tasks.reduce(
					(count, task, index) => {
						const expected = index + 1;
						const selected = answers[section.key][task];
						return selected === expected ? count + 1 : count;
					},
					0,
				);

				accumulator[section.key] = {
					correctCount,
					score: Math.round(
						(correctCount / MAX_TASKS) * MAX_SECTION_SCORE,
					),
				};
				return accumulator;
			},
			{
				morning: { correctCount: 0, score: 0 },
				afternoon: { correctCount: 0, score: 0 },
				evening: { correctCount: 0, score: 0 },
			},
		);

		const statuses = sections.reduce<
			Record<DayPartKey, Record<string, TaskStatus>>
		>(
			(accumulator, section) => {
				accumulator[section.key] = section.tasks.reduce<
					Record<string, TaskStatus>
				>((taskAccumulator, task, index) => {
					const expected = index + 1;
					const selected = answers[section.key][task];
					taskAccumulator[task] =
						selected === expected ? 'correct' : 'wrong';
					return taskAccumulator;
				}, {});
				return accumulator;
			},
			{
				morning: {},
				afternoon: {},
				evening: {},
			},
		);

		const score =
			results.morning.score +
			results.afternoon.score +
			results.evening.score;

		onRoomOutcome(ROOM_ID, 'success', [], score);
		void trackEvent('routine_check_answers', {
			total_score: score,
			morning_score: results.morning.score,
			afternoon_score: results.afternoon.score,
			evening_score: results.evening.score,
		});

		setTaskStatuses(statuses);
		setSectionResults(results);
		setTotalScore(score);
		setFeedback(
			score === MAX_SECTION_SCORE * 3
				? 'Ідеально! Усі три частини дня відсортовано правильно.'
				: `Готово! Ти набрав ${score} із 120 балів. Можна виправити порядок і перевірити ще раз.`,
		);
	};

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<div>
					<p className='eyebrow'>Нова кімната: Щоденні справи</p>
					<h1>
						Ранок, обід, вечір: постав справи у правильному порядку
					</h1>
					<p className='heroLead'>
						У кожному списку є 7 пунктів. Біля кожного пункту обери
						номер від 1 до 7 так, як це відбувається в реальному
						дні.
					</p>
				</div>
				<div className='heroStats'>
					<span>3 частини дня</span>
					<span>По 40 балів за частину</span>
					<span>Максимум: 120 балів</span>
					<button
						type='button'
						className='heroStats__hintButton'
						onClick={openHintModal}
					>
						Підказка ({hintsLeft})
					</button>
				</div>
			</header>

			<section className='routineRoom'>
				{sections.map((section) => (
					<article key={section.key} className='routineCard'>
						<header className='routineCard__header'>
							<div>
								<p className='eyebrow'>{section.title}</p>
								<h3>{section.description}</h3>
							</div>
							{sectionResults ? (
								<span className='routineCard__score'>
									{sectionResults[section.key].score} /{' '}
									{MAX_SECTION_SCORE}
								</span>
							) : null}
						</header>

						<div className='routineList'>
							{section.shuffledTasks.map((task) => {
								const usedRanks = getUsedRanksInSection(
									section.key,
									task,
								);
								const taskStatus =
									taskStatuses?.[section.key]?.[task] ??
									'idle';

								return (
									<label
										key={task}
										className={[
											'routineItem',
											taskStatus === 'correct'
												? 'routineItem--correct'
												: '',
											taskStatus === 'wrong'
												? 'routineItem--wrong'
												: '',
										]
											.filter(Boolean)
											.join(' ')}
									>
										<span>{task}</span>
										<select
											value={
												answers[section.key][task] ?? ''
											}
											onChange={(event) => {
												const nextValue = event.target
													.value
													? Number(event.target.value)
													: null;
												updateAnswer(
													section.key,
													task,
													nextValue,
												);
											}}
										>
											<option value=''>№</option>
											{rankOptions.map((option) => (
												<option
													key={option}
													value={option}
													disabled={usedRanks.has(
														option,
													)}
												>
													{option}
												</option>
											))}
										</select>
									</label>
								);
							})}
						</div>

						{sectionResults ? (
							<p className='routineCard__details'>
								Правильних позицій:{' '}
								{sectionResults[section.key].correctCount} з{' '}
								{MAX_TASKS}
							</p>
						) : null}
					</article>
				))}
			</section>

			<section className='routineActions'>
				<div className='statusBanner'>
					<strong>{feedback}</strong>
					<span>
						{totalScore === null
							? 'Після перевірки отримаєш результат по кожній частині дня.'
							: `Поточний результат: ${totalScore}/120.`}
					</span>
				</div>
				<div className='actionRow'>
					<button
						type='button'
						className='primaryButton'
						onClick={checkAnswers}
					>
						Перевірити
					</button>
					<button
						type='button'
						className='secondaryButton'
						onClick={resetRound}
					>
						Новий порядок
					</button>
					<button
						type='button'
						className='ghostButton'
						onClick={() => navigate('/')}
					>
						До кімнат
					</button>
				</div>
			</section>

			{showHintModal ? (
				<div className='modalOverlay' role='presentation'>
					<div
						className='modalCard modalCard--hint'
						role='dialog'
						aria-modal='true'
						aria-labelledby='routine-hint-title'
					>
						<p className='modalCard__eyebrow'>Підказка</p>
						<h3 id='routine-hint-title'>
							Історія правильного порядку
						</h3>
						<p className='routineHintStory'>
							Вранці ми: 😴 → 🛏️ → 🚿 → 🪥 → 💇 → 🍳 → 🎒.
						</p>
						<p className='routineHintStory'>
							Після школи: 🧼 → 🍲 → 🍽️ → 🛋️ → 📚 → 🙋 → 🎨.
						</p>
						<p className='routineHintStory'>
							Увечері: 🍽️ → 🧹 → 👕 → 🎒 → 🪟 → 🚿 → 🪥🌙.
						</p>
						<button
							type='button'
							className='primaryButton'
							onClick={() => setShowHintModal(false)}
						>
							Зрозуміло
						</button>
					</div>
				</div>
			) : null}
		</main>
	);
};

export default RoutineRoomPage;
