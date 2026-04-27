export interface WordPack {
	id: string;
	letters: string;
	validWords: string[];
}

export interface WordRoundResult {
	acceptedWords: string[];
	missedWords: string[];
	score: number;
}
