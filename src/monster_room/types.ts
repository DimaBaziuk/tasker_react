export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
	x: number;
	y: number;
}

export interface Monster {
	id: string;
	emoji: string;
	position: Point;
}

export interface Collectible {
	id: string;
	emoji: string;
	position: Point;
	collected: boolean;
}

export interface MonsterRoomRoundState {
	playerPosition: Point;
	walls: Point[];
	monsters: Monster[];
	collectibles: Collectible[];
	collectedCount: number;
	hasEscaped: boolean;
	tick: number;
}

export interface TurnResult {
	state: MonsterRoomRoundState;
	event: 'moved' | 'blocked' | 'collision' | 'escaped';
	collectedEmoji?: string;
}
