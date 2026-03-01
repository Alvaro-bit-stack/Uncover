import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "leaflet/dist/leaflet.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-quest-dark">
      <body className="antialiased max-w-md mx-auto">
        {children}
      </body>
    </html>
  );
}