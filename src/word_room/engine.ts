import type { WordPack, WordRoundResult } from './types';

export const WORD_ROOM_ID = 'word-builder';
export const POINTS_PER_WORD = 5;

const UKRAINIAN_WORD_PATTERN = /^[а-щьюяєіїґ']+$/i;

export const normalizeWord = (value: string) =>
	value.trim().toLocaleLowerCase('uk-UA');

export const isUkrainianWord = (value: string) =>
	UKRAINIAN_WORD_PATTERN.test(value);

const buildLettersMap = (letters: string) => {
	const counter = new Map<string, number>();

	for (const letter of normalizeWord(letters)) {
		counter.set(letter, (counter.get(letter) ?? 0) + 1);
	}

	return counter;
};

export const canBuildWordFromLetters = (word: string, letters: string) => {
	const available = buildLettersMap(letters);

	for (const letter of normalizeWord(word)) {
		const current = available.get(letter) ?? 0;

		if (current === 0) {
			return false;
		}

		available.set(letter, current - 1);
	}

	return true;
};

export const pickWordPack = (
	wordPacks: WordPack[],
	currentPackId?: string,
): WordPack => {
	if (wordPacks.length === 0) {
		throw new Error('Немає наборів літер для гри.');
	}

	const availablePacks = currentPackId
		? wordPacks.filter((pack) => pack.id !== currentPackId)
		: wordPacks;
	const pool = availablePacks.length > 0 ? availablePacks : wordPacks;

	return pool[Math.floor(Math.random() * pool.length)];
};

export const evaluateRound = (
	submittedWords: string[],
	wordPack: WordPack,
): WordRoundResult => {
	const validSet = new Set(wordPack.validWords.map(normalizeWord));
	const acceptedSet = new Set<string>();

	submittedWords.forEach((word) => {
		const normalizedWord = normalizeWord(word);

		if (validSet.has(normalizedWord)) {
			acceptedSet.add(normalizedWord);
		}
	});

	const acceptedWords = [...acceptedSet].sort((first, second) =>
		first.localeCompare(second, 'uk-UA'),
	);
	const missedWords = [...validSet]
		.filter((word) => !acceptedSet.has(word))
		.sort((first, second) => first.localeCompare(second, 'uk-UA'));

	return {
		acceptedWords,
		missedWords,
		score: acceptedWords.length * POINTS_PER_WORD,
	};
};
