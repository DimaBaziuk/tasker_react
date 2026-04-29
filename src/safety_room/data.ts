import type { SafetySectionTemplate } from './types';

export const SAFETY_ROOM_ID = 'safety-lab';
export const SAFETY_POINTS_PER_CORRECT = 10;

export const SAFETY_SECTION_TEMPLATES: SafetySectionTemplate[] = [
	{
		key: 'fire',
		title: 'Пожежна безпека',
		description:
			'Залиш у списку лише безпечні дії. Небезпечні картки перетягни за межі секції.',
		cards: [
			{
				id: 'fire-1',
				emoji: '🧯',
				text: 'Тримай сірники подалі від дітей і без нагляду дорослих не користуйся ними.',
				isSafe: true,
			},
			{
				id: 'fire-2',
				emoji: '⛽',
				text: 'Підливати бензин у вогонь, щоб швидше розгорівся.',
				isSafe: false,
			},
			{
				id: 'fire-3',
				emoji: '🚪',
				text: 'Тримати шлях до виходу з кімнати вільним від речей.',
				isSafe: true,
			},
			{
				id: 'fire-4',
				emoji: '🔥',
				text: 'Сушити одяг просто над увімкненою плитою або обігрівачем.',
				isSafe: false,
			},
			{
				id: 'fire-5',
				emoji: '📞',
				text: 'Одразу кликати дорослих і дзвонити 101, якщо бачиш вогонь.',
				isSafe: true,
			},
			{
				id: 'fire-6',
				emoji: '🧨',
				text: 'Гратися запальничкою в кімнаті або на балконі.',
				isSafe: false,
			},
			{
				id: 'fire-7',
				emoji: '🏕️',
				text: 'Біля вогнища бути обережним і тримати дистанцію від полум\'я.',
				isSafe: true,
			},
			{
				id: 'fire-8',
				emoji: '🕯️',
				text: 'Залишати свічку без нагляду, коли виходиш з кімнати.',
				isSafe: false,
			},
			{
				id: 'fire-9',
				emoji: '✅',
				text: 'Знати, де вдома вогнегасник, і як ним користуватися з дорослими.',
				isSafe: true,
			},
			{
				id: 'fire-10',
				emoji: '🚫',
				text: 'Ховатися у шафі під час пожежі замість того, щоб виходити.',
				isSafe: false,
			},
		],
	},
	{
		key: 'electric',
		title: 'Електробезпека',
		description:
			'Залиш у списку лише безпечні дії. Небезпечні картки перетягни за межі секції.',
		cards: [
			{
				id: 'electric-1',
				emoji: '👐',
				text: 'Витирати руки насухо перед тим, як торкатися вимикача.',
				isSafe: true,
			},
			{
				id: 'electric-2',
				emoji: '💧',
				text: 'Лити воду на розетку, якщо поруч пил або бруд.',
				isSafe: false,
			},
			{
				id: 'electric-3',
				emoji: '🔌',
				text: 'Витягувати вилку з розетки за корпус, а не за шнур.',
				isSafe: true,
			},
			{
				id: 'electric-4',
				emoji: '⚠️',
				text: 'Засовувати металеві предмети в розетку.',
				isSafe: false,
			},
			{
				id: 'electric-5',
				emoji: '🧑‍🔧',
				text: 'Повідомляти дорослих, якщо дріт пошкоджений або іскрить.',
				isSafe: true,
			},
			{
				id: 'electric-6',
				emoji: '🚿',
				text: 'Користуватися феном у ванній поруч із водою.',
				isSafe: false,
			},
			{
				id: 'electric-7',
				emoji: '🔒',
				text: 'Вимикати прилад з мережі, якщо ним не користуєшся.',
				isSafe: true,
			},
			{
				id: 'electric-8',
				emoji: '⚡',
				text: 'Торкатися оголеного дроту, щоб перевірити, чи є струм.',
				isSafe: false,
			},
			{
				id: 'electric-9',
				emoji: '🛡️',
				text: 'Користуватися заглушками для розеток, якщо вдома є малі діти.',
				isSafe: true,
			},
			{
				id: 'electric-10',
				emoji: '🧱',
				text: 'Підключати багато потужних приладів в один подовжувач.',
				isSafe: false,
			},
		],
	},
];
