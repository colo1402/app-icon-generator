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
    { id: 'ios', name: 'iOS', icon: '🍎', desc: '1024, 180, 167, 120 px' },
    { id: 'android', name: 'Android', icon: '🤖', desc: '512 px + adaptive layers' },
    { id: 'macos', name: 'macOS', icon: '🖥️', desc: 'PNG set 16 – 1024 px' },
    { id: 'windows', name: 'Windows', icon: '🪟', desc: '.ico 16 – 256 px' },
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
            a.href = url; a.download = 'apico-icons.zip'; a.click();
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
        <div className="min-h-screen bg-white relative overflow-x-hidden">

            {/* ── Background gradient blobs (reference-inspired) ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -left-56 top-1/4 w-[480px] h-[480px] bg-gradient-to-br from-violet-400 via-purple-400 to-blue-400 rounded-full opacity-[0.15] blur-3xl" />
                <div className="absolute -right-56 top-1/3 w-[480px] h-[480px] bg-gradient-to-bl from-orange-400 via-rose-400 to-pink-300 rounded-full opacity-[0.15] blur-3xl" />
                <div className="absolute left-1/2 -translate-x-1/2 -top-32 w-80 h-80 bg-gradient-to-b from-indigo-300 to-transparent rounded-full opacity-10 blur-3xl" />
            </div>

            {/* ── Page content ── */}
            <div className="relative z-10 max-w-2xl mx-auto px-5 pb-16">

                {/* ── Wordmark nav ── */}
                <nav className="pt-10 pb-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/apico_logo.svg" alt="Apico" className="h-9 w-auto" />
                </nav>

                {/* ── Hero ── */}
                <header className="pt-12 pb-10 text-center">
                    <h1 className="text-[3.25rem] font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-4">
                        App icons for<br />every platform.
                    </h1>
                    <p className="text-lg text-gray-500 max-w-sm mx-auto leading-relaxed">
                        Upload one SVG. Get production-ready icons for iOS, Android, macOS & Windows — bundled in a ZIP.
                    </p>
                </header>

                {/* ── Main card ── */}
                <main className="bg-white border border-gray-200 rounded-3xl shadow-card p-7 space-y-6">

                    {/* ── Dropzone header ── */}
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Source SVG</span>
                        <button
                            id="best-practices-btn"
                            onClick={() => setShowModal(true)}
                            type="button"
                            className="text-xs font-semibold text-[#093CF3] hover:text-[#0730c2] transition-colors flex items-center gap-1"
                        >
                            📖 Best Practices
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
                            'relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden',
                            svgFile
                                ? 'border-emerald-300 bg-emerald-50/50 cursor-default'
                                : dragOver
                                    ? 'border-[#093CF3] bg-blue-50/60 drag-shimmer'
                                    : 'border-gray-200 bg-gray-50/50 hover:border-[#093CF3] hover:bg-blue-50/20',
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
                                <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={svgUrl} alt="SVG preview" className="w-10 h-10 object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{svgFile.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{(svgFile.size / 1024).toFixed(1)} KB · SVG</p>
                                </div>
                                <button
                                    onClick={removeFile}
                                    type="button"
                                    className="text-xs font-medium text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            /* ── Empty state ── */
                            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#093CF3,#3B5FF5)', boxShadow: '0 8px 24px rgba(9,60,243,0.25)' }}>
                                    🎨
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Drop your SVG here</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        or{' '}
                                        <span
                                            className="text-[#093CF3] underline decoration-transparent hover:decoration-[#093CF3] transition-all cursor-pointer"
                                            onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                                        >
                                            browse to upload
                                        </span>
                                        {' '}· SVG files only
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Platform selector ── */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Target Platforms</p>
                        <div className="grid grid-cols-2 gap-2">
                            {PLATFORMS.map(p => {
                                const isActive = platforms.includes(p.id);
                                return (
                                    <label
                                        key={p.id}
                                        id={`platform-${p.id}`}
                                        className={[
                                            'flex items-center gap-3 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all duration-150 select-none',
                                            isActive
                                                ? 'border-[#093CF3] bg-blue-50 shadow-sm'
                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                                        ].join(' ')}
                                    >
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={isActive}
                                            onChange={() => togglePlatform(p.id)}
                                        />
                                        <span className="text-xl leading-none">{p.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-[#093CF3]' : 'text-gray-800'}`}>{p.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{p.desc}</p>
                                        </div>
                                        <div className={[
                                            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-150',
                                            isActive
                                                ? 'text-white opacity-100 scale-100'
                                                : 'border border-gray-200 opacity-0 scale-75',
                                        ].join(' ')} style={isActive ? { background: '#093CF3' } : {}}>✓</div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Android adaptive tip ── */}
                    <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-gray-600 leading-relaxed">
                        <span className="text-base mt-0.5 flex-shrink-0">🤖</span>
                        <span>
                            <strong className="text-gray-900">Android Adaptive Icons:</strong> Name your SVG groups{' '}
                            <code className="code-inline">foreground</code> &amp; <code className="code-inline">background</code> for proper layer separation.{' '}
                            <button className="text-[#093CF3] underline decoration-transparent hover:decoration-[#093CF3] transition-all" onClick={() => setShowModal(true)} type="button">
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
                        className={[
                            'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200',
                            canGenerate
                                ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.99] shadow-lg shadow-gray-900/20'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                        ].join(' ')}
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
                        <div className="space-y-2 animate-fade-up">
                            {STEPS.map((s, i) => (
                                <div
                                    key={s.id}
                                    className={[
                                        'flex items-center gap-2.5 text-xs transition-colors duration-200',
                                        i === activeStep ? 'text-[#093CF3]' : i < activeStep ? 'text-emerald-500' : 'text-gray-300',
                                    ].join(' ')}
                                >
                                    <span className={[
                                        'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all',
                                        i === activeStep ? '' : i < activeStep ? 'bg-emerald-400' : 'bg-gray-200',
                                    ].join(' ')} style={i === activeStep ? { background: '#093CF3', boxShadow: '0 0 6px 2px rgba(9,60,243,0.35)' } : {}} />
                                    {s.label}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Error ── */}
                    {errorMsg && (
                        <div role="alert" className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 animate-fade-up">
                            <span className="flex-shrink-0">⚠️</span> {errorMsg}
                        </div>
                    )}

                    {/* ── Success ── */}
                    {status === 'done' && downloadUrl && (
                        <div id="result-card" className="text-center px-6 py-7 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fade-up">
                            <span className="text-3xl">🎉</span>
                            <div>
                                <p className="font-bold text-gray-900 text-base">Icons generated!</p>
                                <p className="text-xs text-gray-500 mt-1">Your ZIP started downloading automatically.</p>
                            </div>
                            <a
                                id="download-link"
                                href={downloadUrl}
                                download="apico-icons.zip"
                                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-emerald-200"
                            >
                                ⬇ Download apico-icons.zip
                            </a>
                        </div>
                    )}

                    {/* ── Divider ── */}
                    <div className="border-t border-gray-100" />

                    {/* ── What's included ── */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">What&apos;s included</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { icon: '🍎', name: 'iOS', detail: '1024, 180, 167, 120 px · PNG, no alpha' },
                                { icon: '🤖', name: 'Android', detail: '512 px store · 432 px adaptive · mipmap' },
                                { icon: '🖥️', name: 'macOS', detail: 'PNG 16–1024 px · @1x & @2x retina' },
                                { icon: '🪟', name: 'Windows', detail: '.ico 256/48/32/16 px + PNGs' },
                            ].map(item => (
                                <div key={item.name} className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-800">{item.name}</p>
                                        <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{item.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* ── Footer ── */}
                <footer className="text-center pt-10 text-xs text-gray-400">
                    Built with Next.js & Sharp · All processing happens server-side · No data stored
                </footer>
            </div>

            {/* ── Instructions Modal ── */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-up"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-gray-100 flex-shrink-0">
                            <h2 className="text-base font-bold text-gray-900">SVG Best Practices</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                type="button"
                                aria-label="Close"
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 text-sm transition-all"
                            >✕</button>
                        </div>

                        {/* Modal body */}
                        <div className="overflow-y-auto modal-scroll px-7 py-6 space-y-6 flex-1">

                            {/* General */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 mb-3">General Guidelines</h3>
                                <ul className="space-y-2.5">
                                    {[
                                        ['Square viewBox', <>Set your artboard to a square (e.g. <code className="code-inline">1024×1024</code>) and export with <code className="code-inline">viewBox=&quot;0 0 1024 1024&quot;</code>. Non-square SVGs will be distorted.</>],
                                        ['No external references', <>Avoid <code className="code-inline">&lt;image href=&quot;…&quot;&gt;</code>. All assets must be embedded inline.</>],
                                        ['Outline your text', 'Convert all text to paths before exporting. Fonts are not available server-side.'],
                                        ['Safe zone', <>Keep important content within the central <strong>80%</strong> of the canvas. Launchers may clip corners.</>],
                                        ['Avoid hairlines', 'Strokes thinner than ~3% of canvas width disappear at 16×16 px.'],
                                        ['No background needed', 'The generator composites a white background for iOS and Windows automatically.'],
                                    ].map(([title, body], i) => (
                                        <li key={i} className="flex gap-2.5 text-sm text-gray-600 leading-relaxed">
                                            <span className="font-bold flex-shrink-0 mt-0.5" style={{ color: '#093CF3' }}>→</span>
                                            <span><strong className="text-gray-800">{title}</strong> — {body}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <div className="border-t border-gray-100" />

                            {/* Android */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">🤖 Android Adaptive Icons</h3>
                                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                    Adaptive icons have two layers: a <strong className="text-gray-800">foreground</strong> (artwork on transparent) and a <strong className="text-gray-800">background</strong> (flat color/pattern). Without named layers, the full icon becomes the foreground with a white background — valid but not ideal.
                                </p>
                                <p className="text-sm text-gray-600 mb-3">Name your top-level SVG groups using one of these IDs:</p>
                                <div className="rounded-2xl border border-gray-200 overflow-hidden text-xs mb-4">
                                    <div className="grid grid-cols-[130px_1fr] bg-gray-50 font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                                        <span className="px-4 py-2.5 border-r border-gray-200">Layer</span>
                                        <span className="px-4 py-2.5">Accepted IDs</span>
                                    </div>
                                    {[
                                        ['🖼 Foreground', ['foreground', 'ic_foreground', 'Foreground', 'fg']],
                                        ['🎨 Background', ['background', 'ic_background', 'Background', 'bg']],
                                    ].map(([label, codes], i) => (
                                        <div key={i} className="grid grid-cols-[130px_1fr] border-t border-gray-100">
                                            <span className="px-4 py-2.5 border-r border-gray-100 text-gray-700 font-semibold">{label as string}</span>
                                            <span className="px-4 py-2.5 text-gray-600 flex flex-wrap gap-1">
                                                {(codes as string[]).map(c => <code key={c} className="code-inline">{c}</code>)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2.5 mb-4">
                                    {[
                                        ['Figma', 'Name the top-level frames/groups in your Layers panel foreground and background, then export the whole frame as SVG.'],
                                        ['Illustrator', 'Use the Layers panel to name each layer group. Export as SVG with "Use Artboards" off.'],
                                        ['Inkscape', 'Select each group → Object Properties → set ID to foreground or background → export as Plain SVG.'],
                                    ].map(([tool, tip], i) => (
                                        <div key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                                            <span className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#093CF3' }}>{i + 1}</span>
                                            <span><strong className="text-gray-800">{tool}:</strong> {tip}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-gray-600 leading-relaxed">
                                    💡 <strong className="text-gray-800">Safe zone:</strong> Keep foreground artwork within the central <strong>66%</strong> of the 432×432 canvas — launchers crop the outer 33% on circular shapes.
                                </div>
                            </section>

                            <div className="border-t border-gray-100" />

                            {/* iOS */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">🍎 iOS</h3>
                                <ul className="space-y-1.5 text-sm text-gray-600 leading-relaxed">
                                    <li className="flex gap-2"><span className="font-bold" style={{ color: '#093CF3' }}>→</span> Exported as PNG with white background (Apple rejects alpha channels).</li>
                                    <li className="flex gap-2"><span className="font-bold" style={{ color: '#093CF3' }}>→</span> A <code className="code-inline">Contents.json</code> is included for direct Xcode asset catalog import.</li>
                                    <li className="flex gap-2"><span className="font-bold" style={{ color: '#093CF3' }}>→</span> Use the 1024×1024 master for App Store submission.</li>
                                </ul>
                            </section>

                            <div className="border-t border-gray-100" />

                            {/* macOS */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">🖥️ macOS</h3>
                                <ul className="space-y-1.5 text-sm text-gray-600 leading-relaxed">
                                    <li className="flex gap-2"><span className="font-bold" style={{ color: '#093CF3' }}>→</span> Full PNG set at 16–1024 px plus @2x retina variants.</li>
                                    <li className="flex gap-2"><span className="font-bold" style={{ color: '#093CF3' }}>→</span> Convert to <code className="code-inline">.icns</code> with:
                                        <code className="code-block">iconutil -c icns YourApp.iconset</code>
                                        A README with this command is included in the ZIP.
                                    </li>
                                </ul>
                            </section>

                            <div className="border-t border-gray-100" />

                            {/* Windows */}
                            <section className="pb-1">
                                <h3 className="text-sm font-bold text-gray-900 mb-2">🪟 Windows</h3>
                                <ul className="space-y-1.5 text-sm text-gray-600 leading-relaxed">
                                    <li className="flex gap-2"><span className="font-bold" style={{ color: '#093CF3' }}>→</span> Multi-resolution <code className="code-inline">.ico</code> (256, 48, 32, 16 px).</li>
                                    <li className="flex gap-2"><span className="font-bold" style={{ color: '#093CF3' }}>→</span> Individual PNGs at each size also included.</li>
                                    <li className="flex gap-2"><span className="font-bold" style={{ color: '#093CF3' }}>→</span> All exports have a white background.</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
