import { useState } from 'react';
import {
	DragDropProvider,
	useDraggable,
	useDroppable,
	type DragEndEvent,
} from '@dnd-kit/react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../analytics';
import { SAFETY_POINTS_PER_CORRECT, SAFETY_ROOM_ID } from '../safety_room/data';
import {
	createSafetySections,
	evaluateSafetyRound,
} from '../safety_room/engine';
import type {
	SafetyCard,
	SafetyRoundScore,
	SafetySectionKey,
	SafetySectionState,
} from '../safety_room/types';

interface SafetyRoomPageProps {
	onRoomOutcome: (
		roomId: string,
		outcome: 'success' | 'failure',
		roomEmojis?: string[],
		scoreOverride?: number,
	) => void;
}

interface DragData {
	kind: 'card' | 'section' | 'trash';
	sectionKey: SafetySectionKey;
	cardId?: string;
}

interface SafetyCardItemProps {
	card: SafetyCard;
	sectionKey: SafetySectionKey;
	showEvaluation: boolean;
}

interface SafetySectionColumnProps {
	section: SafetySectionState;
	showEvaluation: boolean;
	remainingDangerCount: number | null;
}

const getSectionModifierClass = (key: SafetySectionKey) =>
	key === 'fire' ? 'safetySection--fire' : 'safetySection--electric';

const SafetyCardItem = ({
	card,
	sectionKey,
	showEvaluation,
}: SafetyCardItemProps) => {
	const { ref, isDragging } = useDraggable({
		id: card.id,
		data: {
			kind: 'card',
			sectionKey,
			cardId: card.id,
		} satisfies DragData,
	});

	const evaluationClassName = showEvaluation
		? card.isSafe
			? 'safetyCard--safe'
			: 'safetyCard--unsafeLeft'
		: '';

	return (
		<article
			ref={ref}
			className={`safetyCard ${isDragging ? 'safetyCard--dragging' : ''} ${evaluationClassName}`.trim()}
		>
			<p>
				<span className='safetyCard__emoji' aria-hidden='true'>
					{card.emoji}
				</span>{' '}
				{card.text}
			</p>
			{showEvaluation ? (
				<span className='safetyCard__label'>
					{card.isSafe
						? 'Правильно залишено'
						: 'Небезпечно: потрібно викинути'}
				</span>
			) : (
				<span className='safetyCard__label'>
					Перетягни за межі секції, якщо небезпечно
				</span>
			)}
		</article>
	);
};

const SafetySectionColumn = ({
	section,
	showEvaluation,
	remainingDangerCount,
}: SafetySectionColumnProps) => {
	const { ref: cardsRef, isDropTarget: isCardsDropTarget } = useDroppable({
		id: `section-${section.key}`,
		data: {
			kind: 'section',
			sectionKey: section.key,
		} satisfies DragData,
	});
	const { ref: trashRef, isDropTarget: isTrashDropTarget } = useDroppable({
		id: `trash-${section.key}`,
		data: {
			kind: 'trash',
			sectionKey: section.key,
		} satisfies DragData,
	});

	return (
		<article
			className={`safetySection ${getSectionModifierClass(section.key)} ${isCardsDropTarget ? 'safetySection--activeDrop' : ''}`.trim()}
		>
			<header className='safetySection__header'>
				<div>
					<h3>{section.title}</h3>
					<p>{section.description}</p>
				</div>
				<div className='safetySection__stats'>
					<span>Карток: {section.cards.length}</span>
					<span>
						{showEvaluation
							? `Небезпечних на момент перевірки: ${remainingDangerCount ?? 0}`
							: 'Небезпечні рахуються після "Перевірити"'}
					</span>
				</div>
			</header>

			<div ref={cardsRef} className='safetySection__cards'>
				{section.cards.length === 0 ? (
					<p className='emptyState'>
						Усі картки прибрані. Перевір відповідь або почни новий
						раунд.
					</p>
				) : (
					section.cards.map((card) => (
						<SafetyCardItem
							key={card.id}
							card={card}
							sectionKey={section.key}
							showEvaluation={showEvaluation}
						/>
					))
				)}
			</div>

			<div
				ref={trashRef}
				className={`safetyTrashZone ${isTrashDropTarget ? 'safetyTrashZone--active' : ''}`.trim()}
			>
				<span className='safetyTrashZone__icon' aria-hidden='true'>
					🗑️
				</span>
				<p>Перетягни сюди картку, щоб викинути її</p>
			</div>
		</article>
	);
};

const SafetyRoomPage = ({ onRoomOutcome }: SafetyRoomPageProps) => {
	const navigate = useNavigate();
	const [sections, setSections] = useState<SafetySectionState[]>(() =>
		createSafetySections(),
	);
	const [feedback, setFeedback] = useState(
		'Перетягуй картки за межі секцій і перевір, чи ти впевнений у своєму результаті.',
	);
	const [roundScore, setRoundScore] = useState<SafetyRoundScore | null>(null);
	const [removedDangerCards, setRemovedDangerCards] = useState(0);

	const findCard = (sectionKey: SafetySectionKey, cardId: string) =>
		sections
			.find((section) => section.key === sectionKey)
			?.cards.find((card) => card.id === cardId) ?? null;

	const removeDangerCard = (sectionKey: SafetySectionKey, cardId: string) => {
		const card = findCard(sectionKey, cardId);

		if (!card) {
			return;
		}

		setSections((current) =>
			current.map((section) =>
				section.key === sectionKey
					? {
							...section,
							cards: section.cards.filter(
								(item) => item.id !== cardId,
							),
						}
					: section,
			),
		);
		if (!card.isSafe) {
			setRemovedDangerCards((current) => current + 1);
		}
		setRoundScore(null);
		setFeedback(
			card.isSafe
				? 'Картку прибрано. Перевір уважно, чи ти впевнений у цьому рішенні.'
				: 'Картку прибрано. Продовжуй сортувати.',
		);
		void trackEvent('safety_room_discard_card', {
			section_key: sectionKey,
			card_id: cardId,
			card_is_safe: card.isSafe,
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		if (event.canceled || !event.operation.source) {
			return;
		}

		const sourceData = event.operation.source.data as DragData | undefined;
		const targetData = event.operation.target?.data as DragData | undefined;

		if (!sourceData || sourceData.kind !== 'card' || !sourceData.cardId) {
			return;
		}

		if (!targetData) {
			removeDangerCard(sourceData.sectionKey, sourceData.cardId);
			return;
		}

		if (targetData.kind === 'section') {
			if (targetData.sectionKey !== sourceData.sectionKey) {
				setFeedback(
					'Картки не можна переносити між секціями. Викидай картки лише за межі своєї секції.',
				);
			}
			return;
		}

		if (targetData.kind === 'trash') {
			if (targetData.sectionKey !== sourceData.sectionKey) {
				setFeedback(
					'Викидати картки можна лише у зоні видалення своєї секції.',
				);
				return;
			}

			removeDangerCard(sourceData.sectionKey, sourceData.cardId);
		}
	};

	const checkAnswers = () => {
		const score = evaluateSafetyRound(sections);
		setRoundScore(score);
		onRoomOutcome(SAFETY_ROOM_ID, 'success', [], score.totalScore);
		setFeedback(
			score.totalScore === score.maxScore
				? 'Чудово! Усі відповіді правильні в обох секціях.'
				: `Перевірено: ${score.totalScore} із ${score.maxScore} балів. Тепер видно, скільки небезпечних залишилось саме на момент перевірки.`,
		);
		void trackEvent('safety_room_check_answers', {
			total_score: score.totalScore,
			max_score: score.maxScore,
			fire_score: score.bySection.fire.score,
			electric_score: score.bySection.electric.score,
			removed_danger_cards: removedDangerCards,
		});
	};

	const startNewRound = () => {
		setSections(createSafetySections());
		setRoundScore(null);
		setRemovedDangerCards(0);
		setFeedback('Новий раунд готовий: секції та картки перемішано.');
		void trackEvent('safety_room_new_round');
	};

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<div>
					<p className='eyebrow'>Нова кімната: Безпека вдома</p>
					<h1>Відсортуй безпечні дії: вогонь та електрика</h1>
					<p className='heroLead'>
						Кожна правильна відповідь приносить{' '}
						{SAFETY_POINTS_PER_CORRECT} балів. У кожній секції по 10
						карток: частина безпечні, частина небезпечні.
					</p>
				</div>

				<div className='heroStats heroStats--safetyRoom'>
					<span>2 секції в одному раунді</span>
					<span>10 карток на секцію</span>
					<span>Максимум 200 балів</span>
					<button
						type='button'
						className='ghostButton'
						onClick={() => navigate('/')}
					>
						До кімнат
					</button>
				</div>
			</header>

			<DragDropProvider onDragEnd={handleDragEnd}>
				<section className='safetyRoom'>
					{sections.map((section) => (
						<SafetySectionColumn
							key={section.key}
							section={section}
							showEvaluation={roundScore !== null}
							remainingDangerCount={
								roundScore
									? roundScore.bySection[section.key]
											.remainingDangerCount
									: null
							}
						/>
					))}
				</section>
			</DragDropProvider>

			<section className='safetySummary'>
				<p className='wordRoomFeedback'>{feedback}</p>
				<div className='safetySummary__stats'>
					<span>
						Викинуто небезпечних карток: {removedDangerCards}
					</span>
					{roundScore ? (
						<>
							<span>
								Пожежна безпека:{' '}
								{roundScore.bySection.fire.score} /{' '}
								{roundScore.bySection.fire.totalCards *
									SAFETY_POINTS_PER_CORRECT}
							</span>
							<span>
								Електробезпека:{' '}
								{roundScore.bySection.electric.score} /{' '}
								{roundScore.bySection.electric.totalCards *
									SAFETY_POINTS_PER_CORRECT}
							</span>
							<span>
								Загальний результат: {roundScore.totalScore} /{' '}
								{roundScore.maxScore}
							</span>
						</>
					) : (
						<span>
							Натисни "Перевірити", щоб побачити результат.
						</span>
					)}
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
						onClick={startNewRound}
					>
						Новий раунд
					</button>
				</div>
			</section>
		</main>
	);
};

export default SafetyRoomPage;
