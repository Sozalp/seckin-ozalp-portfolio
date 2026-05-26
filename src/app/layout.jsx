import "./globals.css";

export const metadata = {
  title: "Seçkin Özalp · Lead 3D Artist / VFX",
  description: "Twenty-plus years modeling, simulating and compositing — currently shipping 3D for mobile games.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        />
        <script defer src="https://perchlens.com/cv.js" data-site="cv_o5bo0ruo7a"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
