import "./globals.css";

export const metadata = {
  title: "Seckin Ozalp Portfolio",
  description: "3D, VFX, game art and selected film work portfolio."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
