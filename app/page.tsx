'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Platform = 'ios' | 'android' | 'macos' | 'windows';
type Status = 'idle' | 'loading' | 'done' | 'error';

interface StepDef { id: string; label: string; }

const STEPS: StepDef[] = [
    { id: 'upload', label: 'Reading SVG file…' },
    { id: 'ios', label: 'Generating iOS icons…' },
    { id: 'android', label: 'Generating Android icons…' },
    { id: 'macos', label: 'Generating macOS icon set…' },
    { id: 'windows', label: 'Building Windows .ico file…' },
    { id: 'zip', label: 'Packaging ZIP archive…' },
];

const PLATFORMS: { id: Platform; name: string; icon: string; desc: string }[] = [
    { id: 'ios', name: 'iOS', icon: '🍎', desc: '1024, 180, 167, 120 px' },
    { id: 'android', name: 'Android', icon: '🤖', desc: '512 px store + adaptive' },
    { id: 'macos', name: 'macOS', icon: '🖥️', desc: 'PNG set 16–1024 px' },
    { id: 'windows', name: 'Windows', icon: '🪟', desc: '.ico 16–256 px' },
];

// ── Main component ─────────────────────────────────────────────────────────
export default function HomePage() {
    const [svgFile, setSvgFile] = useState<File | null>(null);
    const [svgUrl, setSvgUrl] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [platforms, setPlatforms] = useState<Platform[]>(['ios', 'android', 'macos', 'windows']);
    const [status, setStatus] = useState<Status>('idle');
    const [activeStep, setActiveStep] = useState<number>(-1);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close modal on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
        if (showModal) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showModal]);

    // ── File handling ──────────────────────────────────────────────────────
    const acceptFile = useCallback((file: File) => {
        if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
            setErrorMsg('Please upload an SVG file.');
            return;
        }
        if (svgUrl) URL.revokeObjectURL(svgUrl);
        const url = URL.createObjectURL(file);
        setSvgFile(file);
        setSvgUrl(url);
        setErrorMsg(null);
        setDownloadUrl(null);
        setStatus('idle');
    }, [svgUrl]);

    const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) acceptFile(file);
    }, [acceptFile]);

    const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) acceptFile(file);
    };

    const removeFile = () => {
        if (svgUrl) URL.revokeObjectURL(svgUrl);
        setSvgFile(null);
        setSvgUrl(null);
        setStatus('idle');
        setDownloadUrl(null);
        setErrorMsg(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    // ── Platform toggle ────────────────────────────────────────────────────
    const togglePlatform = (p: Platform) => {
        setPlatforms(prev =>
            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
        );
    };

    // ── Generate ───────────────────────────────────────────────────────────
    const generate = async () => {
        if (!svgFile || platforms.length === 0) return;

        setStatus('loading');
        setErrorMsg(null);
        setDownloadUrl(null);
        setActiveStep(0);

        // Simulate step progress while server works
        let stepIndex = 0;
        const stepInterval = setInterval(() => {
            stepIndex = Math.min(stepIndex + 1, STEPS.length - 1);
            setActiveStep(stepIndex);
        }, 600);

        try {
            const fd = new FormData();
            fd.append('svg', svgFile);
            fd.append('platforms', JSON.stringify(platforms));

            const res = await fetch('/api/generate', { method: 'POST', body: fd });

            clearInterval(stepInterval);

            if (!res.ok) {
                const json = await res.json().catch(() => ({ error: 'Server error' }));
                throw new Error(json.error ?? 'Generation failed');
            }

            setActiveStep(STEPS.length); // all done
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('done');

            // Auto-trigger download
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'app-icons.zip';
            anchor.click();
        } catch (err) {
            clearInterval(stepInterval);
            setErrorMsg(err instanceof Error ? err.message : 'Unknown error occurred.');
            setStatus('error');
        }
    };

    const isLoading = status === 'loading';
    const canGenerate = !!svgFile && platforms.length > 0 && !isLoading;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Header ── */}
            <div className="container">
                <header className="header">
                    <h1>
                        Icons for every<br />
                        <span>platform, instantly.</span>
                    </h1>
                    <p>
                        Upload one SVG. Get production-ready icons for iOS, Android, macOS
                        &amp; Windows — bundled in a single ZIP.
                    </p>
                </header>

                {/* ── Main card ── */}
                <main>
                    <div className="card">

                        {/* ── Drop zone header row ── */}
                        <div className="dropzone-header">
                            <span className="section-label" style={{ marginBottom: 0 }}>Source SVG</span>
                            <button
                                id="best-practices-btn"
                                className="btn-guide"
                                onClick={() => setShowModal(true)}
                                type="button"
                            >
                                📖 SVG Best Practices
                            </button>
                        </div>

                        {/* ── Drop zone ── */}
                        <div className="dropzone-wrapper">
                            <div
                                id="dropzone"
                                className={`dropzone${dragOver ? ' drag-over' : ''}${svgFile ? ' has-file' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={onDrop}
                                onClick={() => !svgFile && inputRef.current?.click()}
                                role="button"
                                tabIndex={0}
                                aria-label="Drop SVG file here or click to browse"
                                onKeyDown={e => e.key === 'Enter' && !svgFile && inputRef.current?.click()}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".svg,image/svg+xml"
                                    className="hidden-input"
                                    onChange={onInputChange}
                                    id="svg-input"
                                    style={{ pointerEvents: svgFile ? 'none' : 'auto' }}
                                />

                                {svgFile && svgUrl ? (
                                    <div className="svg-preview" onClick={e => e.stopPropagation()}>
                                        <div className="svg-preview-thumb">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={svgUrl} alt="SVG preview" />
                                        </div>
                                        <div className="svg-preview-meta">
                                            <strong>{svgFile.name}</strong>
                                            <span>{(svgFile.size / 1024).toFixed(1)} KB · SVG</span>
                                        </div>
                                        <button className="btn-remove" onClick={removeFile} type="button">
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="dropzone-icon">🎨</div>
                                        <div className="dropzone-text">
                                            <strong>
                                                Drop your SVG here
                                            </strong>
                                            <span>
                                                or{' '}
                                                <span
                                                    className="dropzone-link"
                                                    onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                                                >
                                                    browse to upload
                                                </span>
                                                {' '}· SVG files only
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── Platform selection ── */}
                        <p className="section-label">Target Platforms</p>
                        <div className="platform-grid">
                            {PLATFORMS.map(p => (
                                <label
                                    key={p.id}
                                    className={`platform-card${platforms.includes(p.id) ? ' active' : ''}`}
                                    id={`platform-${p.id}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={platforms.includes(p.id)}
                                        onChange={() => togglePlatform(p.id)}
                                    />
                                    <span className="platform-icon">{p.icon}</span>
                                    <div className="platform-info">
                                        <strong>{p.name}</strong>
                                        <span>{p.desc}</span>
                                    </div>
                                    <div className="platform-check">✓</div>
                                </label>
                            ))}
                        </div>

                        {/* ── Android layer tip ── */}
                        <div className="android-tip">
                            <span className="tip-icon">🤖</span>
                            <span>
                                <strong>Android Adaptive Icons:</strong> Name your SVG groups{' '}
                                <code>foreground</code> &amp; <code>background</code> for proper layer separation.{' '}
                                <button className="tip-link" onClick={() => setShowModal(true)} type="button">Learn how →</button>
                            </span>
                        </div>

                        {/* ── Generate button ── */}
                        <button
                            id="generate-btn"
                            className="btn-generate"
                            onClick={generate}
                            disabled={!canGenerate}
                            type="button"
                        >
                            <span className="btn-inner">
                                {isLoading ? (
                                    <>
                                        <span className="spinner" />
                                        Generating Icons…
                                    </>
                                ) : (
                                    <>
                                        ⚡ Generate Icons
                                    </>
                                )}
                            </span>
                        </button>

                        {/* ── Progress steps ── */}
                        {isLoading && (
                            <div className="progress-steps">
                                {STEPS.map((s, i) => (
                                    <div
                                        key={s.id}
                                        className={`step-item${i === activeStep ? ' active' : i < activeStep ? ' done' : ''}`}
                                    >
                                        <span className="step-dot" />
                                        {s.label}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Error ── */}
                        {errorMsg && <div className="error-banner" role="alert">⚠️ {errorMsg}</div>}

                        {/* ── Success ── */}
                        {status === 'done' && downloadUrl && (
                            <div className="result-card" id="result-card">
                                <span className="result-icon">🎉</span>
                                <h3>Icons generated successfully!</h3>
                                <p>Your ZIP file should have started downloading automatically.</p>
                                <a
                                    id="download-link"
                                    className="btn-download"
                                    href={downloadUrl}
                                    download="app-icons.zip"
                                >
                                    ⬇ Download app-icons.zip
                                </a>
                            </div>
                        )}

                        {/* ── Format summary ── */}
                        <div className="format-summary">
                            <p className="section-label">What&apos;s included</p>
                            <div className="format-grid">
                                <div className="format-item">
                                    <span className="fi-icon">🍎</span>
                                    <div>
                                        <strong>iOS</strong>
                                        <span>1024, 180, 167, 120 px<br />PNG · no alpha</span>
                                    </div>
                                </div>
                                <div className="format-item">
                                    <span className="fi-icon">🤖</span>
                                    <div>
                                        <strong>Android</strong>
                                        <span>512 px store icon<br />432 px adaptive layers<br />mipmap mdpi→xxxhdpi</span>
                                    </div>
                                </div>
                                <div className="format-item">
                                    <span className="fi-icon">🖥️</span>
                                    <div>
                                        <strong>macOS</strong>
                                        <span>PNG set 16–1024 px<br />@1x &amp; @2x retina</span>
                                    </div>
                                </div>
                                <div className="format-item">
                                    <span className="fi-icon">🪟</span>
                                    <div>
                                        <strong>Windows</strong>
                                        <span>.ico (256, 48, 32, 16 px)<br />+ individual PNGs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="footer">
                    Built with Next.js &amp; Sharp · All processing happens server-side · No data stored
                </footer>
            </div>

            {/* ── Instructions Modal ── */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)} role="dialog" aria-modal="true" aria-label="SVG Best Practices">
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>SVG Best Practices</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)} type="button" aria-label="Close">✕</button>
                        </div>
                        <div className="modal-body">

                            {/* General */}
                            <div className="modal-section">
                                <h3>General Guidelines</h3>
                                <ul>
                                    <li><strong>Square viewBox</strong> — Set your artboard to a square (e.g. <code>1024×1024</code>) and export with <code>viewBox="0 0 1024 1024"</code>. Non-square SVGs will be distorted.</li>
                                    <li><strong>No external references</strong> — Avoid <code>&lt;image href=&quot;…&quot;&gt;</code>. All assets must be embedded inline.</li>
                                    <li><strong>Outline your text</strong> — Convert all text to outlines/paths before exporting. Fonts are not available server-side.</li>
                                    <li><strong>Safe zone</strong> — Keep all important content within the central <strong>80%</strong> of the canvas. Device launchers and OS chrome may clip corners.</li>
                                    <li><strong>Avoid hairlines</strong> — Strokes thinner than ~3% of your canvas width will disappear at 16×16 px (Windows/macOS).</li>
                                    <li><strong>No background required</strong> — The generator composites a white background automatically for iOS and Windows. Your SVG can have a transparent root.</li>
                                </ul>
                            </div>

                            <div className="modal-divider" />

                            {/* Android */}
                            <div className="modal-section">
                                <h3>🤖 Android Adaptive Icons (Layer Names)</h3>
                                <p className="modal-desc">
                                    Android adaptive icons consist of two separate layers: a <strong>foreground</strong> (your artwork on a transparent background) and a <strong>background</strong> (a flat color or pattern). If your SVG has a single layer, the generator uses the full icon as the foreground and a white rectangle as the background — which is technically valid but not ideal.
                                </p>
                                <p className="modal-desc">
                                    To get proper layer separation, <strong>name your top-level SVG groups</strong> using one of these IDs:
                                </p>
                                <div className="layer-table">
                                    <div className="layer-row header">
                                        <span>Layer</span><span>Accepted group IDs</span>
                                    </div>
                                    <div className="layer-row">
                                        <span>🖼 Foreground</span>
                                        <span><code>foreground</code> · <code>ic_foreground</code> · <code>Foreground</code> · <code>fg</code></span>
                                    </div>
                                    <div className="layer-row">
                                        <span>🎨 Background</span>
                                        <span><code>background</code> · <code>ic_background</code> · <code>Background</code> · <code>bg</code></span>
                                    </div>
                                </div>
                                <div className="modal-steps">
                                    <div className="step"><span className="step-num">1</span><span><strong>Figma:</strong> Name the top-level frames/groups in your Layers panel <code>foreground</code> and <code>background</code>, then export the whole frame as a single SVG.</span></div>
                                    <div className="step"><span className="step-num">2</span><span><strong>Illustrator:</strong> Use the Layers panel to name each layer group. Export as SVG with &quot;Use Artboards&quot; off.</span></div>
                                    <div className="step"><span className="step-num">3</span><span><strong>Inkscape:</strong> Select each group, open <em>Object Properties</em>, set the <em>ID</em> field to <code>foreground</code> or <code>background</code>, then export as Plain SVG.</span></div>
                                </div>
                                <div className="modal-callout">
                                    💡 <strong>Android safe zone:</strong> Keep your foreground artwork within the central <strong>66%</strong> of the 432×432 canvas. Launchers crop the outer 33% on circular/squircle shapes.
                                </div>
                            </div>

                            <div className="modal-divider" />

                            {/* iOS */}
                            <div className="modal-section">
                                <h3>🍎 iOS Icons</h3>
                                <ul>
                                    <li>All iOS icons are exported as <strong>PNG with a white background</strong> (no transparency — Apple rejects icons with alpha channels).</li>
                                    <li>A <code>Contents.json</code> file is included for direct import into an <strong>Xcode asset catalog</strong>.</li>
                                    <li>Use the 1024×1024 master as your App Store submission icon.</li>
                                </ul>
                            </div>

                            <div className="modal-divider" />

                            {/* macOS */}
                            <div className="modal-section">
                                <h3>🖥️ macOS Icons</h3>
                                <ul>
                                    <li>A full PNG set is exported (16 px → 1024 px at 1× and @2× retina).</li>
                                    <li>To convert to a native <code>.icns</code> file, open Terminal and run:<br />
                                        <code className="code-block">iconutil -c icns YourApp.iconset</code>
                                        <br />A <code>README.txt</code> with this command is included in the ZIP.
                                    </li>
                                </ul>
                            </div>

                            <div className="modal-divider" />

                            {/* Windows */}
                            <div className="modal-section">
                                <h3>🪟 Windows Icons</h3>
                                <ul>
                                    <li>A multi-resolution <code>.ico</code> file is generated containing 256, 48, 32, and 16 px frames.</li>
                                    <li>Individual PNGs at each size are also included.</li>
                                    <li>All Windows icons have a white background (transparency is not standard in <code>.ico</code>).</li>
                                </ul>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
