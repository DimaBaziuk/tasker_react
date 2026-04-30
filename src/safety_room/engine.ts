import {
	SAFETY_POINTS_PER_CORRECT,
	SAFETY_SECTION_TEMPLATES,
} from './data';
import type {
	SafetyRoundScore,
	SafetySectionKey,
	SafetySectionScore,
	SafetySectionState,
	SafetySectionTemplate,
} from './types';

const shuffle = <T,>(source: T[]): T[] => {
	const next = [...source];

	for (let index = next.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[next[index], next[swapIndex]] = [next[swapIndex], next[index]];
	}

	return next;
};

const cloneTemplate = (section: SafetySectionTemplate): SafetySectionState => {
	const shuffledCards = shuffle(section.cards);

	return {
		...section,
		initialCards: shuffledCards,
		cards: shuffledCards,
	};
};

export const createSafetySections = (): SafetySectionState[] =>
	shuffle(SAFETY_SECTION_TEMPLATES).map(cloneTemplate);

export const evaluateSafetyRound = (
	sections: SafetySectionState[],
): SafetyRoundScore => {
	const bySection = sections.reduce<Record<SafetySectionKey, SafetySectionScore>>(
		(accumulator, section) => {
			const keptIds = new Set(section.cards.map((card) => card.id));
			const correctCount = section.initialCards.reduce((count, card) => {
				if (card.isSafe) {
					return keptIds.has(card.id) ? count + 1 : count;
				}

				return keptIds.has(card.id) ? count : count + 1;
			}, 0);
			const remainingDangerCount = section.cards.filter(
				(card) => !card.isSafe,
			).length;

			accumulator[section.key] = {
				correctCount,
				totalCards: section.initialCards.length,
				score: correctCount * SAFETY_POINTS_PER_CORRECT,
				remainingDangerCount,
			};
			return accumulator;
		},
		{
			fire: {
				correctCount: 0,
				totalCards: 0,
				score: 0,
				remainingDangerCount: 0,
			},
			electric: {
				correctCount: 0,
				totalCards: 0,
				score: 0,
				remainingDangerCount: 0,
			},
			water: {
				correctCount: 0,
				totalCards: 0,
				score: 0,
				remainingDangerCount: 0,
			},
		},
	);

	const totalScore = Object.values(bySection).reduce(
		(sum, section) => sum + section.score,
		0,
	);
	const maxScore = Object.values(bySection).reduce(
		(sum, section) => sum + section.totalCards,
		0,
	) * SAFETY_POINTS_PER_CORRECT;

	return {
		totalScore,
		maxScore,
		bySection,
	};
};
