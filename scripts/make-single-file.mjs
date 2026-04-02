import { promises as fs } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');

const html = await fs.readFile(indexPath, 'utf8');

const scriptMatch = html.match(
	/<script type="module" crossorigin src="([^"]+)"><\/script>/,
);
const styleMatch = html.match(
	/<link rel="stylesheet" crossorigin href="([^"]+)">/,
);

if (!scriptMatch || !styleMatch) {
	throw new Error(
		'Не вдалося знайти згенеровані CSS або JS файли в dist/index.html',
	);
}

const jsPath = path.join(distDir, scriptMatch[1].replace(/^\.\//, ''));
const cssPath = path.join(distDir, styleMatch[1].replace(/^\.\//, ''));

const [js, css] = await Promise.all([
	fs.readFile(jsPath, 'utf8'),
	fs.readFile(cssPath, 'utf8'),
]);

const jsBase64 = Buffer.from(js, 'utf8').toString('base64');
const escapedCss = css.replaceAll('</style>', '<\\/style>');

const bootstrapScript = `
const moduleBytes = Uint8Array.from(atob('${jsBase64}'), (character) => character.charCodeAt(0));
const moduleUrl = URL.createObjectURL(
	new Blob([moduleBytes], { type: 'text/javascript;charset=utf-8' }),
);

import(moduleUrl).catch((error) => {
	console.error(error);
});
`;

const singleFileHtml = html
	.replace(
		scriptMatch[0],
		`<script type="module">\n${bootstrapScript}\n</script>`,
	)
	.replace(styleMatch[0], `<style>\n${escapedCss}\n</style>`);

await fs.writeFile(indexPath, singleFileHtml, 'utf8');
await fs.rm(path.join(distDir, 'assets'), { recursive: true, force: true });
