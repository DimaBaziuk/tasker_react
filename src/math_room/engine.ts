import type { MathGrade, MathGridCell, MathTask } from './types';

export const MATH_ROOM_ID = 'math-grid';
export const MATH_GRID_SIZE = 9;
export const MATH_POINTS_PER_CORRECT = 7;

const TOTAL_CELLS = MATH_GRID_SIZE * MATH_GRID_SIZE;
const GRADES: MathGrade[] = [1, 2, 3, 4];

const shuffle = <T,>(items: T[]): T[] => {
	const next = [...items];

	for (let index = next.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[next[index], next[swapIndex]] = [next[swapIndex], next[index]];
	}

	return next;
};

const randomInt = (min: number, max: number): number =>
	Math.floor(Math.random() * (max - min + 1)) + min;

const createGrade1Task = (): Omit<MathTask, 'id' | 'grade'> => {
	if (Math.random() < 0.6) {
		const left = randomInt(0, 9);
		const right = randomInt(0, 10 - left);
		return {
			kind: 'expression',
			expression: `${left} + ${right}`,
			answer: left + right,
		};
	}

	const left = randomInt(0, 10);
	const right = randomInt(0, left);
	return {
		kind: 'expression',
		expression: `${left} - ${right}`,
		answer: left - right,
	};
};

const createGrade1OralTask = (): Omit<MathTask, 'id' | 'grade'> => {
	if (Math.random() < 0.5) {
		const apples = randomInt(2, 7);
		const got = randomInt(1, 3);
		return {
			kind: 'oral',
			expression: `Було ${apples} яблук. Додали ще ${got}. Скільки стало?`,
			answer: apples + got,
		};
	}

	const candies = randomInt(4, 10);
	const gaveAway = randomInt(1, Math.min(4, candies - 1));
	return {
		kind: 'oral',
		expression: `Було ${candies} цукерок. ${gaveAway} віддали. Скільки залишилось?`,
		answer: candies - gaveAway,
	};
};

const createGrade2Task = (): Omit<MathTask, 'id' | 'grade'> => {
	if (Math.random() < 0.55) {
		const left = randomInt(10, 90);
		const right = randomInt(10, 99 - left);
		return {
			kind: 'expression',
			expression: `${left} + ${right}`,
			answer: left + right,
		};
	}

	const left = randomInt(20, 99);
	const right = randomInt(10, left);
	return {
		kind: 'expression',
		expression: `${left} - ${right}`,
		answer: left - right,
	};
};

const createGrade2OralTask = (): Omit<MathTask, 'id' | 'grade'> => {
	if (Math.random() < 0.5) {
		const firstDay = randomInt(12, 35);
		const secondDay = randomInt(10, 30);
		return {
			kind: 'oral',
			expression: `За перший день прочитали ${firstDay} сторінок, за другий ${secondDay}. Скільки разом?`,
			answer: firstDay + secondDay,
		};
	}

	const total = randomInt(35, 90);
	const spent = randomInt(10, 30);
	return {
		kind: 'oral',
		expression: `Було ${total} грн. Витратили ${spent} грн. Скільки залишилось?`,
		answer: total - spent,
	};
};

const createGrade3Task = (): Omit<MathTask, 'id' | 'grade'> => {
	if (Math.random() < 0.6) {
		const left = randomInt(2, 9);
		const right = randomInt(2, 9);
		return {
			kind: 'expression',
			expression: `${left} x ${right}`,
			answer: left * right,
		};
	}

	const right = randomInt(2, 9);
	const answer = randomInt(2, 12);
	const left = right * answer;
	return {
		kind: 'expression',
		expression: `${left} : ${right}`,
		answer,
	};
};

const createGrade3OralTask = (): Omit<MathTask, 'id' | 'grade'> => {
	if (Math.random() < 0.5) {
		const boxes = randomInt(3, 8);
		const inEach = randomInt(3, 7);
		return {
			kind: 'oral',
			expression: `Є ${boxes} коробок, у кожній по ${inEach} олівців. Скільки олівців всього?`,
			answer: boxes * inEach,
		};
	}

	const total = randomInt(18, 72);
	const groups = randomInt(2, 8);
	const adjustedTotal = total - (total % groups);
	const safeTotal = adjustedTotal === 0 ? groups * 4 : adjustedTotal;
	return {
		kind: 'oral',
		expression: `${safeTotal} печив поділили порівну між ${groups} дітьми. Скільки отримала кожна дитина?`,
		answer: safeTotal / groups,
	};
};

const createGrade4Task = (): Omit<MathTask, 'id' | 'grade'> => {
	const variant = randomInt(1, 4);

	if (variant === 1) {
		const left = randomInt(100, 600);
		const right = randomInt(20, 300);
		return {
			kind: 'expression',
			expression: `${left} + ${right}`,
			answer: left + right,
		};
	}

	if (variant === 2) {
		const left = randomInt(220, 900);
		const right = randomInt(40, left - 20);
		return {
			kind: 'expression',
			expression: `${left} - ${right}`,
			answer: left - right,
		};
	}

	if (variant === 3) {
		const left = randomInt(11, 25);
		const right = randomInt(2, 9);
		return {
			kind: 'expression',
			expression: `${left} x ${right}`,
			answer: left * right,
		};
	}

	const divisor = randomInt(2, 12);
	const answer = randomInt(10, 36);
	const dividend = divisor * answer;
	return {
		kind: 'expression',
		expression: `${dividend} : ${divisor}`,
		answer,
	};
};

const createGrade4OralTask = (): Omit<MathTask, 'id' | 'grade'> => {
	if (Math.random() < 0.34) {
		const left = randomInt(120, 450);
		const right = randomInt(80, 260);
		return {
			kind: 'oral',
			expression: `У першій бібліотеці ${left} книг, у другій ${right}. Скільки книг разом?`,
			answer: left + right,
		};
	}

	if (Math.random() < 0.67) {
		const total = randomInt(360, 840);
		const sold = randomInt(120, 280);
		return {
			kind: 'oral',
			expression: `Було ${total} квитків, продали ${sold}. Скільки квитків залишилось?`,
			answer: total - sold,
		};
	}

	const groups = randomInt(5, 12);
	const each = randomInt(14, 35);
	return {
		kind: 'oral',
		expression: `${groups} класів отримали по ${each} зошитів. Скільки зошитів отримали всі класи разом?`,
		answer: groups * each,
	};
};

const createOralTaskByGrade = (
	grade: MathGrade,
): Omit<MathTask, 'id' | 'grade'> =>
	grade === 1
		? createGrade1OralTask()
		: grade === 2
			? createGrade2OralTask()
			: grade === 3
				? createGrade3OralTask()
				: createGrade4OralTask();

const createTaskByGrade = (
	grade: MathGrade,
	index: number,
): MathTask => {
	const payload =
		grade === 1
			? createGrade1Task()
			: grade === 2
				? createGrade2Task()
				: grade === 3
					? createGrade3Task()
					: createGrade4Task();

	return {
		id: `math-task-${index + 1}`,
		grade,
		kind: payload.kind,
		expression: payload.expression,
		answer: payload.answer,
	};
};

const createBalancedGradePool = (): MathGrade[] => {
	const gradePool: MathGrade[] = [];
	const baseCount = Math.floor(TOTAL_CELLS / GRADES.length);
	const remainder = TOTAL_CELLS % GRADES.length;

	GRADES.forEach((grade, index) => {
		const gradeCount = baseCount + (index < remainder ? 1 : 0);

		for (let index = 0; index < gradeCount; index += 1) {
			gradePool.push(grade);
		}
	});

	return shuffle(gradePool);
};

export const createMathGrid = (): MathGridCell[] => {
	const grades = createBalancedGradePool();

	return grades.map((grade, index) => {
		const task =
			Math.random() < 0.35
				? {
					id: `math-task-${index + 1}`,
					grade,
					...createOralTaskByGrade(grade),
				  }
				: createTaskByGrade(grade, index);

		return {
			id: `cell-${index + 1}`,
			task,
			status: 'idle',
			lastSubmittedAnswer: null,
			attempts: 0,
		};
	});
};

export const evaluateMathAnswer = (
	cell: MathGridCell,
	candidateAnswer: number,
): MathGridCell => {
	const isCorrect = candidateAnswer === cell.task.answer;

	return {
		...cell,
		status: isCorrect ? 'correct' : 'wrong',
		lastSubmittedAnswer: candidateAnswer,
		attempts: cell.attempts + 1,
	};
};
