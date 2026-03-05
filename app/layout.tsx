import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Apico – App Icon Generator for iOS, Android, macOS & Windows',
    description:
        'Upload one SVG and instantly generate production-ready app icons for iOS, Android, macOS, and Windows. Download everything as a single ZIP.',
    openGraph: {
        type: 'website',
        title: 'Apico – App Icon Generator',
        description:
            'Generate icons for iOS, Android, macOS & Windows — from a single SVG. Download as a ZIP in seconds.',
        images: [
            {
                url: '/og-preview.png',
                width: 1200,
                height: 630,
                alt: 'Apico – Generate app icons for every platform from a single SVG',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Apico – App Icon Generator',
        description:
            'Generate icons for iOS, Android, macOS & Windows — from a single SVG.',
        images: ['/og-preview.png'],
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
