export type SafetySectionKey = 'fire' | 'electric' | 'water';

export interface SafetyCard {
	id: string;
	emoji: string;
	text: string;
	isSafe: boolean;
}

export interface SafetySectionTemplate {
	key: SafetySectionKey;
	title: string;
	description: string;
	cards: SafetyCard[];
}

export interface SafetySectionState extends SafetySectionTemplate {
	initialCards: SafetyCard[];
}

export interface SafetySectionScore {
	correctCount: number;
	totalCards: number;
	score: number;
	remainingDangerCount: number;
}

export interface SafetyRoundScore {
	totalScore: number;
	maxScore: number;
	bySection: Record<SafetySectionKey, SafetySectionScore>;
}
