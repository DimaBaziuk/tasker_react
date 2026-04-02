export type MoveId = "up" | "down" | "left" | "right";

export type DifficultyKey = "easy" | "medium" | "hard";

export interface Point {
    x: number;
    y: number;
}

export interface Decoration {
    id: string;
    point: Point;
    emoji: string;
    label: string;
}

export interface MoveDefinition {
    id: MoveId;
    label: string;
    arrow: string;
    dx: number;
    dy: number;
}

export interface RoomDefinition {
    id: string;
    title: string;
    difficultyKey: DifficultyKey;
    difficultyLabel: string;
    characterLabel: string;
    characterEmoji: string;
    gridSize: number;
    obstacleCount: number;
    start: Point;
    exit: Point;
    obstacles: Point[];
    obstacleEmoji: string;
    decorations: Decoration[];
    solutionMoves: MoveId[];
    description: string;
    successTitle: string;
    successMessage: string;
    failureTitle: string;
    failureMessage: string;
    hintSummary: string;
    theme: {
        surface: string;
        accent: string;
        accentSoft: string;
        glow: string;
    };
}

const DECORATION_POOL = [
    { emoji: "📘", label: "Книжка" },
    { emoji: "🧸", label: "Іграшка" },
    { emoji: "⭐", label: "Зірка" },
    { emoji: "🎲", label: "Кубик" },
    { emoji: "🪁", label: "Кайт" },
    { emoji: "🧩", label: "Пазл" },
    { emoji: "🎈", label: "Кулька" },
    { emoji: "🪄", label: "Паличка" },
] as const;

const DIRECTION_MAP: Record<MoveId, MoveDefinition> = {
    up: { id: "up", label: "Вгору", arrow: "↑", dx: 0, dy: -1 },
    down: { id: "down", label: "Вниз", arrow: "↓", dx: 0, dy: 1 },
    left: { id: "left", label: "Ліворуч", arrow: "←", dx: -1, dy: 0 },
    right: { id: "right", label: "Праворуч", arrow: "→", dx: 1, dy: 0 },
};

const ROOM_PRESETS = [
    {
        id: "bright-start",
        title: "Кімната світлого старту",
        difficultyKey: "easy" as DifficultyKey,
        difficultyLabel: "Легкий рівень",
        characterLabel: "Хлопець",
        characterEmoji: "👦",
        gridSize: 7,
        obstacleCount: 6,
        start: { x: 0, y: 6 },
        exit: { x: 6, y: 0 },
        obstacleEmoji: "🧱",
        description: "Перший маршрут для знайомства з блоками: рухайся обережно, але сміливо.",
        successTitle: "Чудово!",
        successMessage: "Ти провів героя до виходу без жодного зіткнення.",
        failureTitle: "Спробуй ще раз",
        failureMessage: "Герой зустрів перешкоду і повертається на старт. Перебудуй маршрут.",
        hintSummary: "Почни з простих рухів і звертай увагу на вільні клітинки між перешкодами.",
        theme: {
            surface: "linear-gradient(135deg, rgba(255, 247, 214, 0.95), rgba(255, 231, 188, 0.98))",
            accent: "#f59f2f",
            accentSoft: "#ffe5b4",
            glow: "rgba(245, 159, 47, 0.28)",
        },
    },
    {
        id: "mirror-hall",
        title: "Дзеркальна зала",
        difficultyKey: "medium" as DifficultyKey,
        difficultyLabel: "Середній рівень",
        characterLabel: "Дівчина",
        characterEmoji: "👧",
        gridSize: 8,
        obstacleCount: 12,
        start: { x: 0, y: 7 },
        exit: { x: 7, y: 1 },
        obstacleEmoji: "🧱",
        description: "Тут більше перешкод, тож маршрут треба будувати акуратніше.",
        successTitle: "Супер!",
        successMessage: "Маршрут спрацював, а героїня дісталась до виходу.",
        failureTitle: "Маршрут зламався",
        failureMessage: "На шляху трапилась перешкода. Збери нову послідовність блоків.",
        hintSummary: "Спробуй спочатку пройти через найбільший вільний коридор.",
        theme: {
            surface: "linear-gradient(135deg, rgba(232, 248, 247, 0.96), rgba(199, 237, 233, 0.98))",
            accent: "#2c9f93",
            accentSoft: "#d8f4ef",
            glow: "rgba(44, 159, 147, 0.22)",
        },
    },
    {
        id: "forest-labyrinth",
        title: "Лісовий лабіринт",
        difficultyKey: "hard" as DifficultyKey,
        difficultyLabel: "Складний рівень",
        characterLabel: "Тваринка",
        characterEmoji: "🦝",
        gridSize: 9,
        obstacleCount: 16,
        start: { x: 0, y: 8 },
        exit: { x: 8, y: 0 },
        obstacleEmoji: "🌲",
        description: "Більше перешкод, більше уважності та більше місця для тренування логіки.",
        successTitle: "Вітаємо!",
        successMessage: "Ти пройшов найскладнішу кімнату і навчив героя мислити крок за кроком.",
        failureTitle: "Лабіринт переміг",
        failureMessage: "Шлях зачепив перешкоду. Почни з початку і зміни послідовність блоків.",
        hintSummary: "У складній кімнаті краще спершу знайти найдовший вільний прохід до виходу.",
        theme: {
            surface: "linear-gradient(135deg, rgba(240, 248, 227, 0.97), rgba(216, 235, 200, 0.99))",
            accent: "#5f8f2d",
            accentSoft: "#dff0ba",
            glow: "rgba(95, 143, 45, 0.22)",
        },
    },
] as const;

export const MOVE_DEFINITIONS = Object.values(DIRECTION_MAP);

export function getMoveDefinition(move: MoveId): MoveDefinition {
    return DIRECTION_MAP[move];
}

export function pointKey(point: Point): string {
    return `${point.x}:${point.y}`;
}

export function isSamePoint(first: Point, second: Point): boolean {
    return first.x === second.x && first.y === second.y;
}

export function movePoint(point: Point, moveId: MoveId): Point {
    const move = DIRECTION_MAP[moveId];

    return {
        x: point.x + move.dx,
        y: point.y + move.dy,
    };
}

export function createRooms(): RoomDefinition[] {
    return ROOM_PRESETS.map((preset) => buildRoom(preset));
}

export function createRoom(roomId: string): RoomDefinition | null {
    const preset = ROOM_PRESETS.find((room) => room.id === roomId);

    return preset ? buildRoom(preset) : null;
}

function buildRoom(preset: (typeof ROOM_PRESETS)[number]): RoomDefinition {
    let generatedObstacles: Point[] = [];
    let generatedDecorations: Decoration[] = [];
    let solutionMoves: MoveId[] = [];

    for (let attempt = 0; attempt < 300; attempt += 1) {
        const blocked = new Set<string>();
        const obstacles: Point[] = [];
        const candidateCells = getAllCells(preset.gridSize).filter(
            (cell) => !isSamePoint(cell, preset.start) && !isSamePoint(cell, preset.exit),
        );

        shuffle(candidateCells).some((cell) => {
            if (obstacles.length >= preset.obstacleCount) {
                return true;
            }

            obstacles.push(cell);
            blocked.add(pointKey(cell));
            return false;
        });

        const path = findPath(preset.gridSize, preset.start, preset.exit, blocked);

        if (path) {
            generatedObstacles = obstacles;
            solutionMoves = pathToMoves(path);
            generatedDecorations = generateDecorations(
                preset.gridSize,
                blocked,
                path,
                4 + Math.min(3, preset.obstacleCount - 3),
            );
            break;
        }
    }

    if (!solutionMoves.length) {
        const path = findPath(preset.gridSize, preset.start, preset.exit, new Set());

        if (!path) {
            throw new Error(`Не вдалося побудувати кімнату ${preset.id}`);
        }

        solutionMoves = pathToMoves(path);
        generatedDecorations = generateDecorations(preset.gridSize, new Set(), path, 4);
    }

    return {
        id: preset.id,
        title: preset.title,
        difficultyKey: preset.difficultyKey,
        difficultyLabel: preset.difficultyLabel,
        characterLabel: preset.characterLabel,
        characterEmoji: preset.characterEmoji,
        gridSize: preset.gridSize,
        obstacleCount: preset.obstacleCount,
        start: preset.start,
        exit: preset.exit,
        obstacles: generatedObstacles,
        obstacleEmoji: preset.obstacleEmoji,
        decorations: generatedDecorations,
        solutionMoves,
        description: preset.description,
        successTitle: preset.successTitle,
        successMessage: preset.successMessage,
        failureTitle: preset.failureTitle,
        failureMessage: preset.failureMessage,
        hintSummary: preset.hintSummary,
        theme: preset.theme,
    };
}

function getAllCells(size: number): Point[] {
    const cells: Point[] = [];

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            cells.push({ x, y });
        }
    }

    return cells;
}

function findPath(
    size: number,
    start: Point,
    exit: Point,
    blocked: Set<string>,
): Point[] | null {
    const queue: Point[] = [start];
    const visited = new Set<string>([pointKey(start)]);
    const previous = new Map<string, string>();

    while (queue.length > 0) {
        const current = queue.shift()!;

        if (isSamePoint(current, exit)) {
            return rebuildPath(start, exit, previous);
        }

        for (const next of getNeighbors(current)) {
            if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size) {
                continue;
            }

            const nextKey = pointKey(next);

            if (blocked.has(nextKey) || visited.has(nextKey)) {
                continue;
            }

            visited.add(nextKey);
            previous.set(nextKey, pointKey(current));
            queue.push(next);
        }
    }

    return null;
}

function rebuildPath(start: Point, exit: Point, previous: Map<string, string>): Point[] {
    const path: Point[] = [exit];
    let currentKey = pointKey(exit);

    while (currentKey !== pointKey(start)) {
        const previousKey = previous.get(currentKey);

        if (!previousKey) {
            return [start, exit];
        }

        const [x, y] = previousKey.split(":").map(Number);
        path.push({ x, y });
        currentKey = previousKey;
    }

    return path.reverse();
}

function pathToMoves(path: Point[]): MoveId[] {
    const moves: MoveId[] = [];

    for (let index = 1; index < path.length; index += 1) {
        const previous = path[index - 1];
        const current = path[index];

        if (current.x === previous.x + 1) {
            moves.push("right");
        } else if (current.x === previous.x - 1) {
            moves.push("left");
        } else if (current.y === previous.y + 1) {
            moves.push("down");
        } else if (current.y === previous.y - 1) {
            moves.push("up");
        }
    }

    return moves;
}

function generateDecorations(size: number, blocked: Set<string>, path: Point[], count: number): Decoration[] {
    const pathKeys = new Set(path.map(pointKey));
    const occupied = new Set<string>([...blocked, ...pathKeys]);
    const candidates = getAllCells(size).filter((cell) => !occupied.has(pointKey(cell)));
    const decorated: Decoration[] = [];
    const shuffled = shuffle(candidates);

    for (let index = 0; index < count && index < shuffled.length; index += 1) {
        const source = DECORATION_POOL[index % DECORATION_POOL.length];
        decorated.push({
            id: `${source.label}-${index}`,
            point: shuffled[index],
            emoji: source.emoji,
            label: source.label,
        });
    }

    return decorated;
}

function getNeighbors(point: Point): Point[] {
    return [
        { x: point.x + 1, y: point.y },
        { x: point.x - 1, y: point.y },
        { x: point.x, y: point.y + 1 },
        { x: point.x, y: point.y - 1 },
    ];
}

function shuffle<T>(items: T[]): T[] {
    const clone = [...items];

    for (let index = clone.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
    }

    return clone;
}