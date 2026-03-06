'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Platform = 'ios' | 'android' | 'macos' | 'windows';
type Status = 'idle' | 'loading' | 'done' | 'error';

const STEPS = [
    { id: 'upload', label: 'Reading SVG file…' },
    { id: 'ios', label: 'Generating iOS icons…' },
    { id: 'android', label: 'Generating Android icons…' },
    { id: 'macos', label: 'Generating macOS icon set…' },
    { id: 'windows', label: 'Building Windows .ico file…' },
    { id: 'zip', label: 'Packaging ZIP archive…' },
];

const PLATFORMS: { id: Platform; name: string; icon: string; desc: string }[] = [
    { id: 'ios', name: 'iOS & WatchOS', icon: '🍎', desc: '1024, 180, 167, 120 px · PNG, no alpha' },
    { id: 'android', name: 'Android', icon: '🤖', desc: '512 px store · 432 px adaptive layers' },
    { id: 'macos', name: 'macOS', icon: '🖥️', desc: 'PNG set 16–1024 px · @1x & @2x retina' },
    { id: 'windows', name: 'Windows', icon: '🪟', desc: '.ico 16 – 256 px + individual PNGs' },
];

// ── Component ──────────────────────────────────────────────────────────────
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
        setSvgFile(file);
        setSvgUrl(URL.createObjectURL(file));
        setErrorMsg(null);
        setDownloadUrl(null);
        setStatus('idle');
    }, [svgUrl]);

    const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) acceptFile(file);
    }, [acceptFile]);

    const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) acceptFile(file);
    };

    const removeFile = () => {
        if (svgUrl) URL.revokeObjectURL(svgUrl);
        setSvgFile(null); setSvgUrl(null);
        setStatus('idle'); setDownloadUrl(null); setErrorMsg(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const togglePlatform = (p: Platform) =>
        setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

    // ── Generate ──────────────────────────────────────────────────────────
    const generate = async () => {
        if (!svgFile || platforms.length === 0) return;
        setStatus('loading'); setErrorMsg(null); setDownloadUrl(null); setActiveStep(0);

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

            setActiveStep(STEPS.length);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStatus('done');

            const a = document.createElement('a');
            a.href = url;
            a.download = 'apico-icons.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
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
        <div className="bg-mesh min-h-screen text-white" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

            {/* ── Body ── */}
            <div className="max-w-2xl mx-auto px-5 pb-20">

                {/* ── Logo / Nav ── */}
                <nav className="pt-8 pb-2 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/apico_logo.svg" alt="Apico" className="h-8 w-auto brightness-200 saturate-0 invert opacity-90" />
                </nav>

                {/* ── Hero ── */}
                <header className="pt-10 pb-8 text-center">
                    <h1 className="text-5xl font-bold leading-tight tracking-tight mb-4">
                        App icons for{' '}
                        <span className="headline-gradient">every platform.</span>
                    </h1>
                    <p className="text-base text-purple-200/70 max-w-md mx-auto leading-relaxed">
                        Generate high-quality assets for all platforms in seconds. Upload once, export everywhere with isometric precision.
                    </p>
                </header>

                {/* ── Content ── */}
                <div className="space-y-5">

                    {/* ── Card header row ── */}
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300/50">Source SVG</p>
                        <button
                            id="best-practices-btn"
                            onClick={() => setShowModal(true)}
                            type="button"
                            className="flex items-center gap-1.5 text-xs font-semibold transition-colors px-3 py-1.5 rounded-full"
                            style={{ color: '#9e1ff9', background: 'rgba(158,31,249,0.1)', border: '1px solid rgba(158,31,249,0.3)' }}
                        >
                            ✨ Best Practices
                        </button>
                    </div>

                    {/* ── Drop zone ── */}
                    <div
                        id="dropzone"
                        role="button"
                        tabIndex={0}
                        aria-label="Drop SVG file here or click to browse"
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => !svgFile && inputRef.current?.click()}
                        onKeyDown={e => e.key === 'Enter' && !svgFile && inputRef.current?.click()}
                        className={[
                            'relative cursor-pointer',
                            svgFile ? 'dropzone-filled' : dragOver ? 'dropzone-base dropzone-drag' : 'dropzone-base',
                        ].join(' ')}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".svg,image/svg+xml"
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            onChange={onInputChange}
                            id="svg-input"
                            style={{ pointerEvents: svgFile ? 'none' : 'auto' }}
                        />

                        {svgFile && svgUrl ? (
                            /* ── File preview ── */
                            <div className="flex items-center gap-4 px-5 py-4" onClick={e => e.stopPropagation()}>
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                                    style={{ background: 'rgba(158,31,249,0.15)', border: '1px solid rgba(158,31,249,0.4)' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={svgUrl} alt="SVG preview" className="w-10 h-10 object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{svgFile.name}</p>
                                    <p className="text-xs text-purple-300/60 mt-0.5">{(svgFile.size / 1024).toFixed(1)} KB · SVG ready</p>
                                </div>
                                <button
                                    onClick={removeFile}
                                    type="button"
                                    className="text-xs font-semibold text-purple-300/70 hover:text-red-400 border border-purple-800/50 hover:border-red-400/40 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            /* ── Empty state ── */
                            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                                    style={{ background: 'rgba(158,31,249,0.2)', border: '1px solid rgba(158,31,249,0.4)', boxShadow: '0 0 20px rgba(158,31,249,0.3)' }}>
                                    ☁️
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-white">Drag &amp; Drop SVG</p>
                                    <p className="text-xs text-purple-300/60 mt-1.5">
                                        or{' '}
                                        <span
                                            className="text-neon underline decoration-transparent hover:decoration-purple-500 transition-all cursor-pointer"
                                            onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                                        >
                                            click to browse files
                                        </span>
                                        . Supports SVG files only.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Target Platforms ── */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">📱</span>
                            <p className="text-sm font-semibold text-white tracking-wide">Target Platforms</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {PLATFORMS.map(p => {
                                const isActive = platforms.includes(p.id);
                                return (
                                    <label
                                        key={p.id}
                                        id={`platform-${p.id}`}
                                        className={['platform-tile flex items-center gap-3 px-4 py-3 cursor-pointer select-none', isActive ? 'selected' : ''].join(' ')}
                                    >
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={isActive}
                                            onChange={() => togglePlatform(p.id)}
                                        />
                                        <span className="text-lg leading-none flex-shrink-0">{p.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white leading-tight">{p.name}</p>
                                            <p className="text-[10px] text-purple-300/50 mt-0.5 leading-tight">{p.desc}</p>
                                        </div>
                                        {isActive && (
                                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                                                style={{ background: '#9e1ff9', boxShadow: '0 0 8px rgba(158,31,249,0.6)' }}>✓</div>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Android adaptive tip ── */}
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs text-purple-200/70 leading-relaxed"
                        style={{ background: 'rgba(158,31,249,0.08)', border: '1px solid rgba(158,31,249,0.2)' }}>
                        <span className="text-sm mt-0.5 flex-shrink-0">🤖</span>
                        <span>
                            <strong className="text-white">Android Adaptive Icons:</strong> Name your SVG groups{' '}
                            <code className="code-inline">foreground</code> &amp; <code className="code-inline">background</code> for proper layer separation.{' '}
                            <button className="underline decoration-transparent hover:decoration-purple-400 transition-all font-semibold" style={{ color: '#9e1ff9' }} onClick={() => setShowModal(true)} type="button">
                                Learn how →
                            </button>
                        </span>
                    </div>

                    {/* ── Generate button ── */}
                    <button
                        id="generate-btn"
                        onClick={generate}
                        disabled={!canGenerate}
                        type="button"
                        className="w-full py-4 btn-neon text-sm uppercase tracking-widest"
                    >
                        <span className="flex items-center justify-center gap-2.5">
                            {isLoading ? (
                                <><span className="spinner" /> Generating Icons…</>
                            ) : (
                                <>⚡ Generate Icons</>
                            )}
                        </span>
                    </button>

                    {/* ── Progress steps ── */}
                    {isLoading && (
                        <div className="space-y-2 animate-fade-up px-1">
                            {STEPS.map((s, i) => (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-2.5 text-xs transition-colors duration-200"
                                    style={{
                                        color: i === activeStep ? '#9e1ff9' : i < activeStep ? '#4ade80' : 'rgba(192,106,255,0.3)',
                                    }}
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                                        style={{
                                            background: i === activeStep ? '#9e1ff9' : i < activeStep ? '#4ade80' : 'rgba(158,31,249,0.2)',
                                            boxShadow: i === activeStep ? '0 0 8px rgba(158,31,249,0.7)' : 'none',
                                        }}
                                    />
                                    {s.label}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Error ── */}
                    {errorMsg && (
                        <div role="alert" className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs text-red-300 animate-fade-up"
                            style={{ background: 'rgba(200,30,30,0.15)', border: '1px solid rgba(200,30,30,0.3)' }}>
                            <span className="flex-shrink-0">⚠️</span> {errorMsg}
                        </div>
                    )}

                    {/* ── Success ── */}
                    {status === 'done' && downloadUrl && (
                        <div id="result-card" className="success-card text-center px-6 py-7 space-y-3 animate-fade-up">
                            <span className="text-3xl">🎉</span>
                            <div>
                                <p className="font-bold text-white text-base">Icons generated!</p>
                                <p className="text-xs text-green-300/70 mt-1">Your ZIP started downloading automatically.</p>
                            </div>
                            <a
                                id="download-link"
                                href={downloadUrl}
                                download="apico-icons.zip"
                                className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full text-black transition-all"
                                style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', boxShadow: '0 0 16px rgba(74,222,128,0.4)' }}
                            >
                                ⬇ Download apico-icons.zip
                            </a>
                        </div>
                    )}
                </div>

                {/* ── What's included ── */}
                <section className="mt-6 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300/50 text-center">
                        What&apos;s included
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: '🔲', title: 'Multi-Resolution', body: 'We generate over 40 different sizes for iOS, Android, and Web manifests.' },
                            { icon: '🎨', title: 'Adaptive Design', body: 'Automatic generation of foreground and background layers for Android Adaptive icons.' },
                            { icon: '📦', title: 'One-Click Zip', body: 'Download everything in a neatly organized ZIP file ready for production deployment.' },
                        ].map(f => (
                            <div key={f.title} className="feature-card">
                                <div className="text-xl mb-2">{f.icon}</div>
                                <p className="text-xs font-bold text-white mb-1">{f.title}</p>
                                <p className="text-[10px] text-purple-300/50 leading-relaxed">{f.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Footer ── */}
                <footer className="text-center pt-10 text-[10px] text-purple-300/30">
                    © 2024 apico engine. Powered by isometric rendering technology.
                </footer>
            </div>

            {/* ── Best Practices Modal ── */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-up"
                    style={{ background: 'rgba(6,0,15,0.85)', backdropFilter: 'blur(8px)' }}
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="w-full max-w-md max-h-[88vh] flex flex-col rounded-2xl"
                        style={{ background: '#110828', border: '1px solid rgba(158,31,249,0.35)', boxShadow: '0 0 40px rgba(158,31,249,0.25)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0"
                            style={{ borderBottom: '1px solid rgba(158,31,249,0.15)' }}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                                    style={{ background: 'rgba(158,31,249,0.25)', border: '1px solid rgba(158,31,249,0.4)' }}>
                                    ✨
                                </div>
                                <h2 className="text-sm font-bold text-white">Best Practices</h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                type="button"
                                aria-label="Close"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-purple-400 hover:text-white hover:bg-red-500/20 text-xs transition-all"
                            >✕</button>
                        </div>

                        {/* Modal body */}
                        <div className="overflow-y-auto modal-scroll px-6 py-5 space-y-5 flex-1 text-sm text-purple-200/70">

                            <p className="text-xs text-purple-300/60 leading-relaxed">
                                Follow these guidelines to ensure your generated icons look professional across all platforms.
                            </p>

                            {/* General */}
                            <section>
                                <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-widest" style={{ color: '#9e1ff9' }}>General Guidelines</h3>
                                <ul className="space-y-3">
                                    {[
                                        ['Square viewBox', <>Set your artboard to a square (e.g. <code className="code-inline">1024×1024</code>) and export with <code className="code-inline">viewBox=&quot;0 0 1024 1024&quot;</code>.</>],
                                        ['No external references', <>Avoid <code className="code-inline">&lt;image href=&quot;…&quot;&gt;</code>. All assets must be embedded inline.</>],
                                        ['Outline your text', 'Convert all text to paths before exporting. Fonts are not available server-side.'],
                                        ['Safe zone', <>Keep important content within the central <strong className="text-white">80%</strong> of the canvas.</>],
                                        ['Avoid hairlines', 'Strokes thinner than ~3% of canvas width disappear at 16×16 px.'],
                                        ['No background needed', 'The generator composites a white background for iOS and Windows automatically.'],
                                    ].map(([title, body], i) => (
                                        <li key={i} className="flex gap-2.5 leading-relaxed">
                                            <span className="font-bold flex-shrink-0 mt-0.5" style={{ color: '#9e1ff9' }}>→</span>
                                            <span><strong className="text-white">{title}</strong> — {body}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <hr style={{ borderColor: 'rgba(158,31,249,0.15)' }} />

                            {/* Android */}
                            <section>
                                <h3 className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#9e1ff9' }}>🤖 Android Adaptive Icons</h3>
                                <p className="text-xs leading-relaxed mb-3">
                                    Adaptive icons have two layers: a <strong className="text-white">foreground</strong> (artwork on transparent) and a <strong className="text-white">background</strong> (flat color/pattern).
                                </p>
                                <p className="text-xs mb-3">Name your top-level SVG groups using one of these IDs:</p>
                                <div className="rounded-xl overflow-hidden text-xs mb-4" style={{ border: '1px solid rgba(158,31,249,0.2)' }}>
                                    <div className="grid grid-cols-[120px_1fr] font-bold uppercase tracking-wider text-[9px] text-purple-400/60"
                                        style={{ background: 'rgba(158,31,249,0.1)' }}>
                                        <span className="px-3 py-2.5" style={{ borderRight: '1px solid rgba(158,31,249,0.2)' }}>Layer</span>
                                        <span className="px-3 py-2.5">Accepted IDs</span>
                                    </div>
                                    {[
                                        ['🖼 Foreground', ['foreground', 'ic_foreground', 'Foreground', 'fg']],
                                        ['🎨 Background', ['background', 'ic_background', 'Background', 'bg']],
                                    ].map(([label, codes], i) => (
                                        <div key={i} className="grid grid-cols-[120px_1fr]" style={{ borderTop: '1px solid rgba(158,31,249,0.1)' }}>
                                            <span className="px-3 py-2.5 text-white font-semibold" style={{ borderRight: '1px solid rgba(158,31,249,0.1)' }}>{label as string}</span>
                                            <span className="px-3 py-2.5 flex flex-wrap gap-1">
                                                {(codes as string[]).map(c => <code key={c} className="code-inline">{c}</code>)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2.5 mb-3">
                                    {[
                                        ['Figma', 'Name the top-level frames/groups in your Layers panel foreground and background, then export the whole frame as SVG.'],
                                        ['Illustrator', 'Use the Layers panel to name each layer group. Export as SVG with "Use Artboards" off.'],
                                        ['Inkscape', 'Select each group → Object Properties → set ID to foreground or background → export as Plain SVG.'],
                                    ].map(([tool, tip], i) => (
                                        <div key={i} className="flex gap-2.5 text-xs leading-relaxed">
                                            <span className="w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5"
                                                style={{ background: '#9e1ff9' }}>{i + 1}</span>
                                            <span><strong className="text-white">{tool}:</strong> {tip}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-xl px-4 py-3 text-xs leading-relaxed"
                                    style={{ background: 'rgba(158,31,249,0.08)', border: '1px solid rgba(158,31,249,0.2)' }}>
                                    💡 <strong className="text-white">Safe zone:</strong> Keep foreground artwork within the central <strong className="text-white">66%</strong> of the 432×432 canvas.
                                </div>
                            </section>

                            <hr style={{ borderColor: 'rgba(158,31,249,0.15)' }} />

                            {/* iOS */}
                            <section>
                                <h3 className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#9e1ff9' }}>🍎 iOS</h3>
                                <ul className="space-y-1.5 text-xs leading-relaxed">
                                    <li className="flex gap-2"><span className="font-bold flex-shrink-0" style={{ color: '#9e1ff9' }}>→</span> Exported as PNG with white background (Apple rejects alpha channels).</li>
                                    <li className="flex gap-2"><span className="font-bold flex-shrink-0" style={{ color: '#9e1ff9' }}>→</span> A <code className="code-inline">Contents.json</code> is included for direct Xcode asset catalog import.</li>
                                    <li className="flex gap-2"><span className="font-bold flex-shrink-0" style={{ color: '#9e1ff9' }}>→</span> Use the 1024×1024 master for App Store submission.</li>
                                </ul>
                            </section>

                            <hr style={{ borderColor: 'rgba(158,31,249,0.15)' }} />

                            {/* macOS */}
                            <section>
                                <h3 className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#9e1ff9' }}>🖥️ macOS</h3>
                                <ul className="space-y-1.5 text-xs leading-relaxed">
                                    <li className="flex gap-2"><span className="font-bold flex-shrink-0" style={{ color: '#9e1ff9' }}>→</span> Full PNG set at 16–1024 px plus @2x retina variants.</li>
                                    <li className="flex gap-2"><span className="font-bold flex-shrink-0" style={{ color: '#9e1ff9' }}>→</span> Convert to <code className="code-inline">.icns</code> with:
                                        <code className="code-block">iconutil -c icns YourApp.iconset</code>
                                    </li>
                                </ul>
                            </section>

                            <hr style={{ borderColor: 'rgba(158,31,249,0.15)' }} />

                            {/* Windows */}
                            <section className="pb-2">
                                <h3 className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: '#9e1ff9' }}>🪟 Windows</h3>
                                <ul className="space-y-1.5 text-xs leading-relaxed">
                                    <li className="flex gap-2"><span className="font-bold flex-shrink-0" style={{ color: '#9e1ff9' }}>→</span> Multi-resolution <code className="code-inline">.ico</code> (256, 48, 32, 16 px).</li>
                                    <li className="flex gap-2"><span className="font-bold flex-shrink-0" style={{ color: '#9e1ff9' }}>→</span> Individual PNGs at each size also included.</li>
                                    <li className="flex gap-2"><span className="font-bold flex-shrink-0" style={{ color: '#9e1ff9' }}>→</span> All exports have a white background.</li>
                                </ul>
                            </section>

                            {/* CTA */}
                            <button
                                onClick={() => setShowModal(false)}
                                type="button"
                                className="w-full py-3 btn-neon text-xs tracking-widest"
                            >
                                Got it, thanks!
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
