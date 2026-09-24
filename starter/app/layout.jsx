import './globals.css';

export const metadata = {
  title: 'SDLC Demo App',
  description: 'Built phase by phase with the SDLC lifecycle plugin',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
