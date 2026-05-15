import { create } from 'zustand';
import type { CreativeTool } from './types';

interface CreativeRoomStore {
	activeTool: CreativeTool;
	activeColor: string;
	brushSize: number;
	setActiveTool: (tool: CreativeTool) => void;
	setActiveColor: (color: string) => void;
	setBrushSize: (size: number) => void;
}

const MIN_BRUSH_SIZE = 2;
const MAX_BRUSH_SIZE = 40;

const clampBrushSize = (size: number) =>
	Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, Math.round(size)));

export const useCreativeRoomStore = create<CreativeRoomStore>((set) => ({
	activeTool: 'brush',
	activeColor: '#17313d',
	brushSize: 8,
	setActiveTool: (tool) => set({ activeTool: tool }),
	setActiveColor: (color) => set({ activeColor: color }),
	setBrushSize: (size) => set({ brushSize: clampBrushSize(size) }),
}));

export { MAX_BRUSH_SIZE, MIN_BRUSH_SIZE };
