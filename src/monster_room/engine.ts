import type {
	Collectible,
	Direction,
	Monster,
	MonsterRoomRoundState,
	Point,
	TurnResult,
} from './types';

export const MONSTER_ROOM_ID = 'monster-maze';
export const MONSTER_GRID_SIZE = 9;
export const MONSTER_REQUIRED_COLLECTIBLES = 10;
export const MONSTER_COUNT = 3;
export const MONSTER_POINTS_PER_COLLECTIBLE = 10;
export const MONSTER_EXIT_BONUS = 80;

export const PLAYER_START: Point = { x: 0, y: 8 };
export const ROOM_EXIT: Point = { x: 8, y: 0 };

const WALLS: Point[] = [
	{ x: 1, y: 1 },
	{ x: 2, y: 1 },
	{ x: 4, y: 1 },
	{ x: 6, y: 1 },
	{ x: 7, y: 1 },
	{ x: 1, y: 3 },
	{ x: 3, y: 3 },
	{ x: 4, y: 3 },
	{ x: 6, y: 3 },
	{ x: 2, y: 5 },
	{ x: 4, y: 5 },
	{ x: 6, y: 5 },
	{ x: 7, y: 5 },
	{ x: 1, y: 6 },
	{ x: 3, y: 6 },
	{ x: 5, y: 7 },
	{ x: 7, y: 7 },
];

const MONSTER_SPAWNS: Point[] = [
	{ x: 8, y: 8 },
	{ x: 8, y: 4 },
	{ x: 5, y: 0 },
];

const COLLECTIBLE_EMOJI_POOL = [
	'🍒',
	'🍓',
	'🍋',
	'🍏',
	'🍇',
	'🥝',
	'🍬',
	'⭐',
	'🌟',
	'🪙',
	'🧩',
	'🎯',
	'🍀',
] as const;

const MONSTER_EMOJI_POOL = ['👻', '👾', '🤖', '😈', '🕷️'] as const;

const DIRECTIONS: Record<Direction, Point> = {
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
};

const pointKey = (point: Point) => `${point.x}:${point.y}`;

const isSamePoint = (first: Point, second: Point) =>
	first.x === second.x && first.y === second.y;

const movePoint = (point: Point, direction: Direction): Point => ({
	x: point.x + DIRECTIONS[direction].x,
	y: point.y + DIRECTIONS[direction].y,
});

const isInsideBoard = (point: Point) =>
	point.x >= 0 &&
	point.y >= 0 &&
	point.x < MONSTER_GRID_SIZE &&
	point.y < MONSTER_GRID_SIZE;

const shuffle = <T,>(items: T[]): T[] => {
	const next = [...items];

	for (let index = next.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[next[index], next[swapIndex]] = [next[swapIndex], next[index]];
	}

	return next;
};

const createWallSet = () => new Set(WALLS.map((wall) => pointKey(wall)));

const WALL_SET = createWallSet();

const getAllFreeCells = (): Point[] => {
	const forbidden = new Set<string>([
		pointKey(PLAYER_START),
		pointKey(ROOM_EXIT),
		...WALL_SET,
		...MONSTER_SPAWNS.map(pointKey),
	]);
	const cells: Point[] = [];

	for (let y = 0; y < MONSTER_GRID_SIZE; y += 1) {
		for (let x = 0; x < MONSTER_GRID_SIZE; x += 1) {
			const point = { x, y };
			if (!forbidden.has(pointKey(point))) {
				cells.push(point);
			}
		}
	}

	return cells;
};

const buildCollectibles = (): Collectible[] => {
	const cells = shuffle(getAllFreeCells()).slice(0, MONSTER_REQUIRED_COLLECTIBLES);
	const emojis = shuffle([...COLLECTIBLE_EMOJI_POOL]).slice(
		0,
		MONSTER_REQUIRED_COLLECTIBLES,
	);

	return cells.map((position, index) => ({
		id: `collectible-${index + 1}`,
		emoji: emojis[index],
		position,
		collected: false,
	}));
};

const buildMonsters = (): Monster[] => {
	const emojis = shuffle([...MONSTER_EMOJI_POOL]).slice(0, MONSTER_COUNT);

	return MONSTER_SPAWNS.slice(0, MONSTER_COUNT).map((spawn, index) => ({
		id: `monster-${index + 1}`,
		emoji: emojis[index],
		position: spawn,
	}));
};

const isBlockedPoint = (point: Point) =>
	!isInsideBoard(point) || WALL_SET.has(pointKey(point));

const pickMonsterDirection = (
	monsterPosition: Point,
	playerPosition: Point,
): Direction => {
	const candidates = shuffle(Object.keys(DIRECTIONS) as Direction[]).filter(
		(direction) => {
			const next = movePoint(monsterPosition, direction);
			return !isBlockedPoint(next);
		},
	);

	if (candidates.length === 0) {
		return 'up';
	}

	if (Math.random() < 0.7) {
		const best = candidates
			.map((direction) => {
				const next = movePoint(monsterPosition, direction);
				const distance =
					Math.abs(next.x - playerPosition.x) +
					Math.abs(next.y - playerPosition.y);
				return { direction, distance };
			})
			.sort((first, second) => first.distance - second.distance)[0];

		return best.direction;
	}

	return candidates[0];
};

const moveMonsters = (
	monsters: Monster[],
	playerPosition: Point,
): Monster[] => {
	return monsters.map((monster) => {
		const direction = pickMonsterDirection(monster.position, playerPosition);
		const nextPosition = movePoint(monster.position, direction);

		if (isBlockedPoint(nextPosition)) {
			return monster;
		}

		return {
			...monster,
			position: nextPosition,
		};
	});
};

const collectAtPosition = (
	collectibles: Collectible[],
	position: Point,
): { collectibles: Collectible[]; collectedEmoji?: string } => {
	let collectedEmoji: string | undefined;

	const nextCollectibles = collectibles.map((collectible) => {
		if (collectible.collected || !isSamePoint(collectible.position, position)) {
			return collectible;
		}

		collectedEmoji = collectible.emoji;
		return {
			...collectible,
			collected: true,
		};
	});

	return { collectibles: nextCollectibles, collectedEmoji };
};

const hasMonsterCollision = (
	playerPosition: Point,
	monsters: Monster[],
): boolean => monsters.some((monster) => isSamePoint(monster.position, playerPosition));

export const getMonsterWalls = (): Point[] => [...WALLS];

export const calculateMonsterRoomScore = (collectedCount: number) => {
	const clampedCollected = Math.min(
		MONSTER_REQUIRED_COLLECTIBLES,
		Math.max(0, Math.floor(collectedCount)),
	);

	if (clampedCollected < MONSTER_REQUIRED_COLLECTIBLES) {
		return clampedCollected * MONSTER_POINTS_PER_COLLECTIBLE;
	}

	return (
		MONSTER_REQUIRED_COLLECTIBLES * MONSTER_POINTS_PER_COLLECTIBLE +
		MONSTER_EXIT_BONUS
	);
};

export const createMonsterRoomRound = (): MonsterRoomRoundState => ({
	playerPosition: PLAYER_START,
	monsters: buildMonsters(),
	collectibles: buildCollectibles(),
	collectedCount: 0,
	hasEscaped: false,
	tick: 0,
});

export const runTurn = (
	state: MonsterRoomRoundState,
	direction: Direction,
): TurnResult => {
	const nextPlayerPosition = movePoint(state.playerPosition, direction);

	if (isBlockedPoint(nextPlayerPosition)) {
		return {
			state,
			event: 'blocked',
		};
	}

	const afterPlayerStep = collectAtPosition(state.collectibles, nextPlayerPosition);
	const collectedCount = afterPlayerStep.collectibles.filter(
		(collectible) => collectible.collected,
	).length;

	if (
		collectedCount >= MONSTER_REQUIRED_COLLECTIBLES &&
		isSamePoint(nextPlayerPosition, ROOM_EXIT)
	) {
		return {
			state: {
				...state,
				playerPosition: nextPlayerPosition,
				collectibles: afterPlayerStep.collectibles,
				collectedCount,
				hasEscaped: true,
				tick: state.tick + 1,
			},
			event: 'escaped',
			collectedEmoji: afterPlayerStep.collectedEmoji,
		};
	}

	const movedMonsters = moveMonsters(state.monsters, nextPlayerPosition);

	if (hasMonsterCollision(nextPlayerPosition, movedMonsters)) {
		return {
			state: {
				...state,
				playerPosition: nextPlayerPosition,
				monsters: movedMonsters,
				collectibles: afterPlayerStep.collectibles,
				collectedCount,
				tick: state.tick + 1,
			},
			event: 'collision',
			collectedEmoji: afterPlayerStep.collectedEmoji,
		};
	}

	return {
		state: {
			...state,
			playerPosition: nextPlayerPosition,
			monsters: movedMonsters,
			collectibles: afterPlayerStep.collectibles,
			collectedCount,
			tick: state.tick + 1,
		},
		event: 'moved',
		collectedEmoji: afterPlayerStep.collectedEmoji,
	};
};
