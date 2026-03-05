import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'App Icon Generator – iOS, Android, macOS & Windows Icons from SVG',
    description:
        'Upload one SVG and instantly generate production-ready app icons for iOS, Android, macOS, and Windows. Download everything as a single ZIP file.',
    openGraph: {
        type: 'website',
        title: 'App Icon Generator',
        description:
            'Generate icons for iOS, Android, macOS & Windows — from a single SVG. Download as a ZIP in seconds.',
        images: [
            {
                url: '/og-preview.png',
                width: 1200,
                height: 630,
                alt: 'App Icon Generator – Generate icons for every platform from a single SVG',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'App Icon Generator',
        description:
            'Generate icons for iOS, Android, macOS & Windows — from a single SVG. Download as a ZIP in seconds.',
        images: ['/og-preview.png'],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
