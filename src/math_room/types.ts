export type MathGrade = 1 | 2 | 3 | 4;
export type MathTaskKind = 'expression' | 'oral';

export type MathCellStatus = 'idle' | 'correct' | 'wrong';

export interface MathTask {
	id: string;
	grade: MathGrade;
	kind: MathTaskKind;
	expression: string;
	answer: number;
}

export interface MathGridCell {
	id: string;
	task: MathTask;
	status: MathCellStatus;
	lastSubmittedAnswer: number | null;
	attempts: number;
}
