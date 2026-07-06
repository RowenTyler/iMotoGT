// Server Component - renders the hero heading immediately on the server
// This eliminates the 8,140ms element render delay for LCP
export function HeroHeading() {
  return (
    <div className="relative z-10 text-center mb-8">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
        Find Your Perfect Car
      </h1>
      <p className="text-xl opacity-90 text-white drop-shadow-md">
        Search from thousands of vehicles across South Africa
      </p>
    </div>
  )
}
