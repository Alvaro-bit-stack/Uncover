import "./globals.css";

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