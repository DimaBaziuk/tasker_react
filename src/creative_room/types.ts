export type CreativeTool = 'brush' | 'eraser' | 'fill';

export interface CreativeStrokeOperation {
	id: string;
	tool: 'brush' | 'eraser';
	color: string;
	size: number;
	points: number[];
}

export interface CreativeFillOperation {
	id: string;
	tool: 'fill';
	color: string;
	x: number;
	y: number;
}

export type CreativeOperation = CreativeStrokeOperation | CreativeFillOperation;
