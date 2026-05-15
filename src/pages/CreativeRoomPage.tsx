import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Image as KonvaImage, Layer, Rect, Stage } from 'react-konva';
import useUndo from 'use-undo';
import { saveAs } from 'file-saver';
import { Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../analytics';
import {
	MAX_BRUSH_SIZE,
	MIN_BRUSH_SIZE,
	useCreativeRoomStore,
} from '../creative_room/store';
import type { CreativeOperation } from '../creative_room/types';
import { AppButton, AppCard } from '../ui/primitives';

interface CanvasSize {
	width: number;
	height: number;
}

const CREATIVE_ROOM_CANVAS_BG = '#ffffff';
const CREATIVE_PALETTE = [
	'#185775',
	'#f59f2f',
	'#2c9f93',
	'#5f8f2d',
	'#d85b63',
	'#3a6ea5',
	'#7b4ea3',
	'#f06595',
	'#e8590c',
	'#2b8a3e',
	'#0b7285',
	'#495057',
	'#111111',
];

const getPointFromEvent = (event: KonvaEventObject<MouseEvent | TouchEvent>) =>
	event.target.getStage()?.getPointerPosition() ?? null;

const createStrokeId = () =>
	`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const clampCoordinate = (value: number, max: number) =>
	Math.min(Math.max(0, Math.floor(value)), Math.max(0, max - 1));

const drawStrokeOnContext = (
	ctx: CanvasRenderingContext2D,
	op: Extract<CreativeOperation, { tool: 'brush' | 'eraser' }>,
) => {
	if (op.points.length < 2) {
		return;
	}

	ctx.save();
	ctx.strokeStyle = op.tool === 'eraser' ? CREATIVE_ROOM_CANVAS_BG : op.color;
	ctx.lineWidth = op.size;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(op.points[0], op.points[1]);

	for (let i = 2; i < op.points.length; i += 2) {
		ctx.lineTo(op.points[i], op.points[i + 1]);
	}

	ctx.stroke();
	ctx.restore();
};

const colorDistance = (
	r: number,
	g: number,
	b: number,
	targetR: number,
	targetG: number,
	targetB: number,
) => Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);

const hexToRgb = (hexColor: string) => {
	const normalized = hexColor.trim().replace('#', '');

	if (normalized.length === 3) {
		const r = Number.parseInt(normalized[0] + normalized[0], 16);
		const g = Number.parseInt(normalized[1] + normalized[1], 16);
		const b = Number.parseInt(normalized[2] + normalized[2], 16);
		return { r, g, b };
	}

	if (normalized.length === 6) {
		const r = Number.parseInt(normalized.slice(0, 2), 16);
		const g = Number.parseInt(normalized.slice(2, 4), 16);
		const b = Number.parseInt(normalized.slice(4, 6), 16);
		return { r, g, b };
	}

	return null;
};

const floodFillOnContext = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	fillColor: string,
	width: number,
	height: number,
) => {
	const imageData = ctx.getImageData(0, 0, width, height);
	const { data } = imageData;
	const startX = clampCoordinate(x, width);
	const startY = clampCoordinate(y, height);
	const startIndex = (startY * width + startX) * 4;
	const targetR = data[startIndex];
	const targetG = data[startIndex + 1];
	const targetB = data[startIndex + 2];
	const targetA = data[startIndex + 3];

	const fillRgb = hexToRgb(fillColor);

	if (!fillRgb) {
		return;
	}

	const fillR = fillRgb.r;
	const fillG = fillRgb.g;
	const fillB = fillRgb.b;
	const fillA = 255;

	if (
		targetR === fillR &&
		targetG === fillG &&
		targetB === fillB &&
		targetA === fillA
	) {
		return;
	}

	const tolerance = 16;
	const stack = [startX, startY];

	while (stack.length > 0) {
		const cy = stack.pop();
		const cx = stack.pop();

		if (cx === undefined || cy === undefined) {
			continue;
		}

		if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
			continue;
		}

		const index = (cy * width + cx) * 4;
		const currentR = data[index];
		const currentG = data[index + 1];
		const currentB = data[index + 2];
		const currentA = data[index + 3];

		if (
			Math.abs(currentA - targetA) > tolerance ||
			colorDistance(
				currentR,
				currentG,
				currentB,
				targetR,
				targetG,
				targetB,
			) >
				tolerance
		) {
			continue;
		}

		data[index] = fillR;
		data[index + 1] = fillG;
		data[index + 2] = fillB;
		data[index + 3] = fillA;

		stack.push(cx + 1, cy);
		stack.push(cx - 1, cy);
		stack.push(cx, cy + 1);
		stack.push(cx, cy - 1);
	}

	ctx.putImageData(imageData, 0, 0);
};

const renderOperationsToCanvas = (
	operations: CreativeOperation[],
	width: number,
	height: number,
) => {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d', {
		willReadFrequently: true,
	});

	if (!ctx) {
		return null;
	}

	ctx.fillStyle = CREATIVE_ROOM_CANVAS_BG;
	ctx.fillRect(0, 0, width, height);

	for (const operation of operations) {
		if (operation.tool === 'fill') {
			floodFillOnContext(
				ctx,
				operation.x,
				operation.y,
				operation.color,
				width,
				height,
			);
			continue;
		}

		drawStrokeOnContext(ctx, operation);
	}

	return canvas;
};

const CreativeRoomPage = () => {
	const navigate = useNavigate();
	const stageRef = useRef<KonvaStage | null>(null);
	const canvasHostRef = useRef<HTMLDivElement | null>(null);
	const isDrawingRef = useRef(false);
	const [canvasSize, setCanvasSize] = useState<CanvasSize>({
		width: 980,
		height: 600,
	});

	const [historyState, historyActions] = useUndo<CreativeOperation[]>([], {
		useCheckpoints: true,
	});
	const operations = historyState.present;
	const operationsRef = useRef<CreativeOperation[]>(operations);

	const {
		set: setStrokes,
		reset: resetStrokes,
		undo,
		redo,
		canUndo,
		canRedo,
	} = historyActions;

	const {
		activeTool,
		activeColor,
		brushSize,
		setActiveTool,
		setActiveColor,
		setBrushSize,
	} = useCreativeRoomStore();

	const activeToolLabel =
		activeTool === 'brush'
			? 'Пензлик'
			: activeTool === 'eraser'
				? 'Гумка'
				: 'Заливка';

	const solvedLabel = useMemo(() => {
		const strokeCount = operations.filter((op) => op.tool !== 'fill').length;

		if (strokeCount === 0) {
			return 'Полотно порожнє';
		}

		return `Штрихів: ${strokeCount}`;
	}, [operations]);

	useEffect(() => {
		operationsRef.current = operations;
	}, [operations]);

	const renderCanvas = useMemo(
		() =>
			renderOperationsToCanvas(
				operations,
				canvasSize.width,
				canvasSize.height,
			),
		[operations, canvasSize.width, canvasSize.height],
	);

	useEffect(() => {
		const host = canvasHostRef.current;

		if (!host) {
			return;
		}

		const updateSize = () => {
			const hostWidth = Math.max(280, Math.floor(host.clientWidth));
			const nextHeight = Math.max(320, Math.floor(hostWidth * 0.62));
			setCanvasSize((current) => {
				if (
					current.width === hostWidth &&
					current.height === nextHeight
				) {
					return current;
				}

				return {
					width: hostWidth,
					height: nextHeight,
				};
			});
		};

		updateSize();

		const observer = new ResizeObserver(() => {
			updateSize();
		});

		observer.observe(host);

		return () => {
			observer.disconnect();
		};
	}, []);

	const commitOperations = (
		nextOperations: CreativeOperation[],
		checkpoint = false,
	) => {
		operationsRef.current = nextOperations;
		setStrokes(nextOperations, checkpoint);
	};

	const handlePointerStart = (
		event: KonvaEventObject<MouseEvent | TouchEvent>,
	) => {
		if (activeTool === 'fill') {
			const point = getPointFromEvent(event);

			if (!point) {
				return;
			}

			const fillStroke: CreativeOperation = {
				id: createStrokeId(),
				tool: 'fill',
				color: activeColor,
				x: point.x,
				y: point.y,
			};

			commitOperations([...operationsRef.current, fillStroke], true);
			isDrawingRef.current = false;
			void trackEvent('creative_room_fill_canvas', {
				fill_color: activeColor,
				x: Math.round(point.x),
				y: Math.round(point.y),
			});
			return;
		}

		const point = getPointFromEvent(event);

		if (!point) {
			return;
		}

		isDrawingRef.current = true;
		const nextStroke: CreativeOperation = {
			id: createStrokeId(),
			tool: activeTool === 'eraser' ? 'eraser' : 'brush',
			color: activeColor,
			size: brushSize,
			points: [point.x, point.y],
		};

		commitOperations([...operationsRef.current, nextStroke], true);
	};

	const handlePointerMove = (
		event: KonvaEventObject<MouseEvent | TouchEvent>,
	) => {
		if (!isDrawingRef.current) {
			return;
		}

		const point = getPointFromEvent(event);

		if (!point) {
			return;
		}

		const currentStrokes = operationsRef.current;
		const lastStroke = currentStrokes[currentStrokes.length - 1];

		if (!lastStroke || lastStroke.tool === 'fill') {
			return;
		}

		const nextStroke: CreativeOperation = {
			...lastStroke,
			points: [...lastStroke.points, point.x, point.y],
		};
		const nextStrokes = [
			...currentStrokes.slice(0, currentStrokes.length - 1),
			nextStroke,
		];

		commitOperations(nextStrokes);
	};

	const handlePointerEnd = () => {
		isDrawingRef.current = false;
	};

	const handleClear = () => {
		resetStrokes([]);
		isDrawingRef.current = false;
		void trackEvent('creative_room_clear_canvas');
	};

	const handleSaveImage = async () => {
		if (!renderCanvas) {
			return;
		}
		const imageBlob = await new Promise<Blob | null>((resolve) => {
			renderCanvas.toBlob((blob) => resolve(blob), 'image/png');
		});

		if (!imageBlob) {
			return;
		}

		saveAs(imageBlob, `creative-room-${Date.now()}.png`);
		void trackEvent('creative_room_save_image', {
			operation_count: operations.length,
		});
	};

	const handleUndo = () => {
		undo();
	};

	const handleRedo = () => {
		redo();
	};

	return (
		<main className='appShell'>
			<header className='heroHeader'>
				<Stack>
					<p className='eyebrow'>Нова кімната: Творчість</p>
					<h1>
						Малюй, стирай, змінюй кольори і зберігай свої малюнки
					</h1>
					<p className='heroLead'>
						Це кімната для вільної творчості у стилі простого Paint:
						олівець, гумка, товщина лінії, undo/redo та збереження
						PNG.
					</p>
				</Stack>

				<Stack
					className='heroStats heroStats--creativeRoom'
					direction='row'
				>
					<span>{solvedLabel}</span>
					<span>Інструмент: {activeToolLabel}</span>
					<span>Товщина: {brushSize}px</span>
					<AppButton
						type='button'
						tone='ghost'
						className='ghostButton'
						onClick={() => navigate('/')}
					>
						До кімнат
					</AppButton>
				</Stack>
			</header>

			<section className='creativeRoom'>
				<AppCard
					component='article'
					className='creativeRoomCard creativeRoomCard--tools'
				>
					<h2>Панель інструментів</h2>
					<Stack
						className='creativeToolRow'
						sx={{
							flexDirection: 'row',
							flexWrap: 'nowrap',
							gap: 1,
						}}
					>
						<AppButton
							type='button'
							tone={
								activeTool === 'brush' ? 'primary' : 'secondary'
							}
							className={
								activeTool === 'brush'
									? 'primaryButton'
									: 'secondaryButton'
							}
							onClick={() => setActiveTool('brush')}
							sx={{
								minWidth: '90px !important',
								padding: '6px 12px !important',
							}}
						>
							Пензлик
						</AppButton>
						<AppButton
							type='button'
							tone={
								activeTool === 'eraser'
									? 'primary'
									: 'secondary'
							}
							className={
								activeTool === 'eraser'
									? 'primaryButton'
									: 'secondaryButton'
							}
							onClick={() => setActiveTool('eraser')}
							sx={{
								minWidth: '90px !important',
								padding: '6px 12px !important',
							}}
						>
							Гумка
						</AppButton>
						<AppButton
							type='button'
							tone={
								activeTool === 'fill' ? 'primary' : 'secondary'
							}
							className={
								activeTool === 'fill'
									? 'primaryButton'
									: 'secondaryButton'
							}
							onClick={() => setActiveTool('fill')}
							sx={{
								minWidth: '90px !important',
								padding: '6px 12px !important',
							}}
						>
							Заливка
						</AppButton>
					</Stack>

					<div className='creativeSlider'>
						<label htmlFor='creativeBrushSize'>Товщина лінії</label>
						<input
							id='creativeBrushSize'
							type='range'
							min={MIN_BRUSH_SIZE}
							max={MAX_BRUSH_SIZE}
							value={brushSize}
							onChange={(event) =>
								setBrushSize(Number(event.target.value))
							}
						/>
					</div>

					<div className='creativeColors'>
						<p>Кольори</p>
						<div className='creativeColors__grid'>
							{CREATIVE_PALETTE.map((color) => (
								<button
									type='button'
									key={color}
									className='creativeColorSwatch'
									style={{ backgroundColor: color }}
									onClick={() => setActiveColor(color)}
									aria-label={`Колір ${color}`}
									aria-pressed={activeColor === color}
								/>
							))}
						</div>
					</div>

					<div
						className='creativeActions'
						style={{
							display: 'flex',
							gap: 8,
							flexWrap: 'wrap',
							justifyContent: 'space-around',
						}}
					>
						<AppButton
							type='button'
							tone='secondary'
							className='secondaryButton'
							disabled={!canUndo}
							onClick={handleUndo}
						>
							Undo
						</AppButton>
						<AppButton
							type='button'
							tone='secondary'
							className='secondaryButton'
							disabled={!canRedo}
							onClick={handleRedo}
						>
							Redo
						</AppButton>
						<AppButton
							type='button'
							tone='ghost'
							className='ghostButton'
							onClick={handleSaveImage}
						>
							Зберегти PNG
						</AppButton>
						<AppButton
							type='button'
							tone='primary'
							className='primaryButton'
							onClick={handleClear}
						>
							Очистити полотно
						</AppButton>
					</div>
				</AppCard>

				<AppCard
					component='article'
					className='creativeRoomCard creativeRoomCard--canvas'
				>
					<div className='creativeCanvasHost' ref={canvasHostRef}>
						<Stage
							ref={stageRef}
							width={canvasSize.width}
							height={canvasSize.height}
							onMouseDown={handlePointerStart}
							onMousemove={handlePointerMove}
							onMouseup={handlePointerEnd}
							onMouseleave={handlePointerEnd}
							onTouchStart={handlePointerStart}
							onTouchMove={handlePointerMove}
							onTouchEnd={handlePointerEnd}
							className='creativeCanvasStage'
						>
							<Layer>
								<Rect
									x={0}
									y={0}
									width={canvasSize.width}
									height={canvasSize.height}
									fill={CREATIVE_ROOM_CANVAS_BG}
								/>
								{renderCanvas ? (
									<KonvaImage image={renderCanvas} x={0} y={0} />
								) : null}
							</Layer>
						</Stage>
					</div>
				</AppCard>
			</section>
		</main>
	);
};

export default CreativeRoomPage;
