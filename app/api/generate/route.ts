import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import archiver from 'archiver';
import { Writable } from 'stream';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ── Collect archiver output into a Buffer ──────────────────────────────────
function archiverToBuffer(archive: archiver.Archiver): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const writable = new Writable({
            write(chunk, _enc, cb) {
                chunks.push(Buffer.from(chunk));
                cb();
            },
        });
        archive.pipe(writable);
        writable.on('finish', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);
        archive.finalize();
    });
}

// ── Make a PNG buffer from SVG at a given size ─────────────────────────────
async function svgToPng(
    svgBuffer: Buffer,
    size: number,
    opts: { flatten?: boolean; background?: string } = {}
): Promise<Buffer> {
    let pipeline = sharp(svgBuffer, { density: 300 }).resize(size, size);
    if (opts.flatten) {
        pipeline = pipeline.flatten({ background: opts.background ?? '#ffffff' });
    }
    return pipeline.png({ compressionLevel: 9 }).toBuffer();
}

// ── Extract a named SVG layer by group id ──────────────────────────────────
// Wraps the matched <g> content in a minimal <svg> with the same viewBox.
function extractSvgLayer(
    svgText: string,
    ids: string[]   // tries each id in order, returns first match
): string | null {
    // Parse viewBox from root <svg>
    const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/i);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';
    const [, , vw, vh] = viewBox.split(/\s+/).map(Number);

    for (const id of ids) {
        // Match <g id="<id>" ...> ... </g>  (non-greedy, handles nested tags)
        const re = new RegExp(
            `<g[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/g>`,
            'i'
        );
        const match = svgText.match(re);
        if (match) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${vw || 100}" height="${vh || 100}">${match[0]}</svg>`;
        }
    }
    return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parsePlatforms(v: string | null): string[] {
    if (!v) return ['ios', 'android', 'macos', 'windows'];
    try { return JSON.parse(v); } catch { return ['ios', 'android', 'macos', 'windows']; }
}

// ── POST /api/generate ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('svg') as File | null;
        const platformsRaw = formData.get('platforms') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No SVG file provided.' }, { status: 400 });
        }

        const platforms = parsePlatforms(platformsRaw);

        const svgArrayBuffer = await file.arrayBuffer();
        const svgBuffer = Buffer.from(svgArrayBuffer);
        const svgText = svgBuffer.toString('utf8');

        // Quick validation
        if (!svgText.includes('<svg') && !svgText.includes('<?xml')) {
            return NextResponse.json({ error: 'File does not appear to be a valid SVG.' }, { status: 400 });
        }

        const archive = archiver('zip', { zlib: { level: 6 } });

        // ── iOS ──────────────────────────────────────────────────────────────
        if (platforms.includes('ios')) {
            const iosSizes: { px: number; name: string }[] = [
                { px: 1024, name: 'AppIcon-1024x1024.png' },
                { px: 180, name: 'AppIcon-60x60@3x.png' },
                { px: 167, name: 'AppIcon-83.5x83.5@2x.png' },
                { px: 120, name: 'AppIcon-60x60@2x.png' },
            ];
            for (const { px, name } of iosSizes) {
                const buf = await svgToPng(svgBuffer, px, { flatten: true, background: '#ffffff' });
                archive.append(buf, { name: `iOS/${name}` });
            }
            const contentsJson = {
                images: [
                    { size: '1024x1024', idiom: 'ios-marketing', filename: 'AppIcon-1024x1024.png', scale: '1x' },
                    { size: '60x60', idiom: 'iphone', filename: 'AppIcon-60x60@3x.png', scale: '3x' },
                    { size: '60x60', idiom: 'iphone', filename: 'AppIcon-60x60@2x.png', scale: '2x' },
                    { size: '83.5x83.5', idiom: 'ipad', filename: 'AppIcon-83.5x83.5@2x.png', scale: '2x' },
                ],
                info: { version: 1, author: 'xcode' },
            };
            archive.append(JSON.stringify(contentsJson, null, 2), { name: 'iOS/Contents.json' });
        }

        // ── Android ──────────────────────────────────────────────────────────
        if (platforms.includes('android')) {
            // Play Store icon (always the full SVG, white background)
            const store = await svgToPng(svgBuffer, 512, { flatten: true, background: '#ffffff' });
            archive.append(store, { name: 'Android/store-icon-512.png' });

            // ── Adaptive layers ─────────────────────────────────────────────
            // Try to detect named layers in the SVG (Figma / Illustrator / Inkscape convention)
            // Accepted foreground IDs: foreground, ic_foreground, Foreground, fg
            // Accepted background IDs: background, ic_background, Background, bg
            const fgSvg = extractSvgLayer(svgText, ['foreground', 'ic_foreground', 'Foreground', 'fg']);
            const bgSvg = extractSvgLayer(svgText, ['background', 'ic_background', 'Background', 'bg']);

            const hasLayers = !!(fgSvg && bgSvg);

            if (hasLayers && fgSvg && bgSvg) {
                // Proper layer-aware export
                const fgBuf = await sharp(Buffer.from(fgSvg), { density: 300 })
                    .resize(432, 432)
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                archive.append(fgBuf, { name: 'Android/adaptive-foreground-432.png' });

                const bgBuf = await sharp(Buffer.from(bgSvg), { density: 300 })
                    .resize(432, 432)
                    .flatten({ background: '#ffffff' })
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                archive.append(bgBuf, { name: 'Android/adaptive-background-432.png' });
            } else {
                // Fallback: full icon as foreground, solid white background
                // This is the single-layer SVG case.
                const fgBuf = await sharp(svgBuffer, { density: 300 })
                    .resize(432, 432)
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                archive.append(fgBuf, { name: 'Android/adaptive-foreground-432.png' });

                const bgBuf = await sharp({
                    create: { width: 432, height: 432, channels: 3, background: '#ffffff' },
                })
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                archive.append(bgBuf, { name: 'Android/adaptive-background-432.png' });
            }

            // README explaining layers
            const adaptiveReadme = `Android Adaptive Icon Layers – README
======================================

FOREGROUND: adaptive-foreground-432.png
  The icon artwork on a transparent background.
  Important: Keep content within the central 66% (safe zone) to avoid
  cropping on circular/squircle launcher shapes.

BACKGROUND: adaptive-background-432.png
  A flat color or simple pattern layer.

Layers detected in your SVG: ${hasLayers ? 'YES ✓' : 'NO – single-layer fallback used'}
${!hasLayers ? `
To get proper layer separation, name your SVG groups:
  - Foreground group id: "foreground"
  - Background group id: "background"
See the app for full instructions.
` : ''}
Usage in Android Studio:
  Place both PNGs in res/mipmap-anydpi-v26/ as an XML adaptive icon,
  or use "New > Image Asset" and point to each layer.
`;
            archive.append(adaptiveReadme, { name: 'Android/ADAPTIVE_ICON_README.txt' });

            // mipmap density folders
            const mipmaps: { dpi: string; px: number }[] = [
                { dpi: 'mdpi', px: 48 },
                { dpi: 'hdpi', px: 72 },
                { dpi: 'xhdpi', px: 96 },
                { dpi: 'xxhdpi', px: 144 },
                { dpi: 'xxxhdpi', px: 192 },
            ];
            for (const { dpi, px } of mipmaps) {
                const buf = await svgToPng(svgBuffer, px, { flatten: true, background: '#ffffff' });
                archive.append(buf, { name: `Android/mipmap-${dpi}/ic_launcher.png` });
            }
        }

        // ── macOS ─────────────────────────────────────────────────────────────
        if (platforms.includes('macos')) {
            const macosSizes = [1024, 512, 256, 128, 64, 32, 16];
            for (const px of macosSizes) {
                const buf = await svgToPng(svgBuffer, px);
                archive.append(buf, { name: `macOS/icon_${px}x${px}.png` });
            }
            const retinaSizes = [512, 256, 128, 64, 32, 16];
            for (const px of retinaSizes) {
                const buf = await svgToPng(svgBuffer, px * 2);
                archive.append(buf, { name: `macOS/icon_${px}x${px}@2x.png` });
            }
            const readme = `macOS Icon Set – Usage
======================
Drop the contents of this folder into an .iconset folder, then run:
  iconutil -c icns <YourApp>.iconset
This produces a native .icns file for macOS app distribution.`;
            archive.append(readme, { name: 'macOS/README.txt' });
        }

        // ── Windows ───────────────────────────────────────────────────────────
        if (platforms.includes('windows')) {
            const icoSizes = [256, 48, 32, 16];
            const pngBuffers: Buffer[] = [];
            for (const px of icoSizes) {
                const buf = await svgToPng(svgBuffer, px, { flatten: true, background: '#ffffff' });
                pngBuffers.push(buf);
            }
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const pngToIco = require('png-to-ico');
                const icoBuffer: Buffer = await pngToIco(pngBuffers);
                archive.append(icoBuffer, { name: 'Windows/app.ico' });
            } catch {
                for (let i = 0; i < icoSizes.length; i++) {
                    archive.append(pngBuffers[i], { name: `Windows/icon-${icoSizes[i]}.png` });
                }
            }
            for (let i = 0; i < icoSizes.length; i++) {
                archive.append(pngBuffers[i], { name: `Windows/icon-${icoSizes[i]}x${icoSizes[i]}.png` });
            }
        }

        // ── Seal the ZIP ──────────────────────────────────────────────────────
        const zipBuffer = await archiverToBuffer(archive);

        // Copy to a plain ArrayBuffer to satisfy TypeScript's strict BodyInit typing
        const ab = zipBuffer.buffer.slice(zipBuffer.byteOffset, zipBuffer.byteOffset + zipBuffer.byteLength) as ArrayBuffer;
        const zipBlob = new Blob([ab], { type: 'application/zip' });
        return new NextResponse(zipBlob, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="app-icons.zip"',
                'Content-Length': String(zipBuffer.byteLength),
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[/api/generate]', err);
        return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 500 });
    }
}
