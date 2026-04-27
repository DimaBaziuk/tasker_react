import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../analytics';
import {
	canBuildWordFromLetters,
	evaluateRound,
	isUkrainianWord,
	normalizeWord,
	pickWordPack,
	POINTS_PER_WORD,
	WORD_ROOM_ID,
} from '../word_room/engine';
import type { WordRoundResult } from '../word_room/types';
import { WORD_PACKS } from '../word_room/wordPacks';

interface WordBuilderRoomPageProps {
	onRoomOutcome: (
		roomId: string,
		outcome: 'success' | 'failure',
		roomEmojis?: string[],
		scoreOverride?: number,
	) => void;
}

const LETTERS_SPACING = ' ';

const WordBuilderRoomPage = ({ onRoomOutcome }: WordBuilderRoomPageProps) => {
	const navigate = useNavigate();
	const [currentPack, setCurrentPack] = useState(() =>
		pickWordPack(WORD_PACKS),
	);
	const [candidateWord, setCandidateWord] = useState('');
	const [submittedWords, setSubmittedWords] = useState<string[]>([]);
	const [result, setResult] = useState<WordRoundResult | null>(null);
	const [feedback, setFeedback] = useState(
		'Складай слова з поданих літер і додавай у список. За кожне правильне слово ти отримуєш 5 балів.',
	);

	const isRoundChecked = result !== null;

	const lettersDisplay = useMemo(
		() => currentPack.letters.split('').join(LETTERS_SPACING),
		[currentPack.letters],
	);

	const handleAddWord = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (isRoundChecked) {
			setFeedback(
				'Раунд уже перевірено. Натисни "Нові слова", щоб почати новий.',
			);
			return;
		}

		const normalizedWord = normalizeWord(candidateWord);

		if (normalizedWord.length < 2) {
			setFeedback('Слово має містити щонайменше 2 літери.');
			return;
		}

		if (!isUkrainianWord(normalizedWord)) {
			setFeedback(
				'Використовуй лише українські літери без цифр і пробілів.',
			);
			return;
		}

		if (!canBuildWordFromLetters(normalizedWord, currentPack.letters)) {
			setFeedback('Це слово не можна скласти з цього набору літер.');
			return;
		}

		if (submittedWords.includes(normalizedWord)) {
			setFeedback('Таке слово вже додано.');
			return;
		}

		setSubmittedWords((current) => [...current, normalizedWord]);
		setCandidateWord('');
		setFeedback(`Слово "${normalizedWord}" додано. Думай далі!`);
		void trackEvent('word_room_add_word', {
			pack_id: currentPack.id,
			word_length: normalizedWord.length,
			submitted_words_count: submittedWords.length + 1,
		});
	};

	const handleCheckRound = () => {
		if (isRoundChecked) {
			return;
		}

		if (submittedWords.length === 0) {
			setFeedback('Спершу додай хоча б одне слово.');
			return;
		}

		const nextResult = evaluateRound(submittedWords, currentPack);
		setResult(nextResult);
		onRoomOutcome(WORD_ROOM_ID, 'success', [], nextResult.score);

		setFeedback(
			nextResult.acceptedWords.length === currentPack.validWords.length
				? 'Блискуче! Ти знайшов усі можливі слова.'
				: `Перевірено! Твій результат: ${nextResult.score} балів.`,
		);

		void trackEvent('word_room_check_round', {
			pack_id: currentPack.id,
			accepted_words_count: nextResult.acceptedWords.length,
			all_words_count: currentPack.validWords.length,
			score: nextResult.score,
		});
	};

	const handleNewWords = () => {
		const nextPack = pickWordPack(WORD_PACKS, currentPack.id);
		setCurrentPack(nextPack);
		setCandidateWord('');
		setSubmittedWords([]);
		setResult(null);
		setFeedback('Новий набір готовий. Складай якомога більше слів.');
		void trackEvent('word_room_new_pack', {
			previous_pack_id: currentPack.id,
			next_pack_id: nextPack.id,
		});
	};

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<div>
					<p className='eyebrow'>Нова кімната: Словотвор</p>
					<h1>Склади якомога більше слів із перемішаних літер</h1>
					<p className='heroLead'>
						Додавай слова у список, а коли закінчаться ідеї -
						натискай "Перевірити". За кожне правильне слово отримуєш{' '}
						{POINTS_PER_WORD} балів.
					</p>
				</div>

				<div className='heroStats heroStats--wordRoom'>
					<span className='wordRoomStat'>
						Наборів: {WORD_PACKS.length}
					</span>
					<span className='wordRoomStat'>
						Поточний набір: {currentPack.validWords.length} слів
					</span>
					<button
						type='button'
						className='ghostButton'
						onClick={() => navigate('/')}
					>
						До кімнат
					</button>
				</div>
			</header>

			<section className='wordRoom'>
				<article className='wordRoomCard'>
					<h2>Літери цього раунду</h2>
					<p className='wordRoomLetters'>{lettersDisplay}</p>
					<p className='wordRoomHint'>
						Кожну літеру можна використати не більше разів, ніж вона
						зустрічається у наборі.
					</p>

					<form className='wordRoomForm' onSubmit={handleAddWord}>
						<label htmlFor='wordInput'>Твоє слово</label>
						<input
							id='wordInput'
							type='text'
							value={candidateWord}
							onChange={(event) =>
								setCandidateWord(event.target.value)
							}
							disabled={isRoundChecked}
							placeholder='Наприклад: штора'
							autoComplete='off'
						/>

						<div className='actionRow wordRoomActions'>
							<button
								type='submit'
								className='secondaryButton'
								disabled={isRoundChecked}
							>
								Додати
							</button>
							<button
								type='button'
								className='primaryButton'
								onClick={handleCheckRound}
								disabled={isRoundChecked}
							>
								Перевірити
							</button>
							{isRoundChecked ? (
								<button
									type='button'
									className='ghostButton'
									onClick={handleNewWords}
								>
									Нові слова
								</button>
							) : null}
						</div>
					</form>
				</article>

				<article className='wordRoomCard'>
					<h2>Твої слова ({submittedWords.length})</h2>
					{submittedWords.length === 0 ? (
						<p className='emptyState'>Поки що список порожній.</p>
					) : (
						<ul className='wordRoomList'>
							{submittedWords.map((word) => (
								<li key={word}>{word}</li>
							))}
						</ul>
					)}
				</article>

				<article className='wordRoomCard'>
					<h2>Результат</h2>
					<p className='wordRoomFeedback'>{feedback}</p>

					{result ? (
						<>
							<p className='wordRoomScore'>
								Зараховано: {result.acceptedWords.length} слів ={' '}
								<strong>{result.score} балів</strong>
							</p>
							<div className='wordRoomColumns'>
								<div>
									<h3>Знайдено</h3>
									{result.acceptedWords.length > 0 ? (
										<ul className='wordRoomList'>
											{result.acceptedWords.map(
												(word) => (
													<li key={word}>{word}</li>
												),
											)}
										</ul>
									) : (
										<p className='emptyState'>
											Немає зарахованих слів.
										</p>
									)}
								</div>
								<div>
									<h3>Ще можна було скласти</h3>
									{result.missedWords.length > 0 ? (
										<ul className='wordRoomList'>
											{result.missedWords.map((word) => (
												<li key={word}>{word}</li>
											))}
										</ul>
									) : (
										<p className='emptyState'>
											Ти знайшов усі слова.
										</p>
									)}
								</div>
							</div>
						</>
					) : (
						<p className='helperText'>
							Результат з'явиться після натискання кнопки
							"Перевірити".
						</p>
					)}
				</article>
			</section>
		</main>
	);
};

export default WordBuilderRoomPage;
