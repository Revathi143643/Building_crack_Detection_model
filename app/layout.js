import './globals.css';

export const metadata = {
  title: 'Structure Scan',
  description: 'AI-assisted building crack detection',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}