import { useEffect, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Library, Heart } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function Resources() {
  const [places, setPlaces] = useState<google.maps.places.PlaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  useEffect(() => {
    if (!isLoaded) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLoc = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        const service = new google.maps.places.PlacesService(document.createElement("div"));

        service.nearbySearch(
          {
            location: userLoc,
            keyword: "donation drive books library",
            rankBy: google.maps.places.RankBy.DISTANCE,
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setPlaces(results);
            } else {
              setError(true);
            }
            setLoading(false);
          }
        );
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
  }, [isLoaded]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-12 border-b border-border/40 pb-8">
          <h1 className="font-serif text-4xl font-medium italic tracking-tight mb-2">Community Resources</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Local access & philanthropy
          </p>
        </header>

        {loading && (
          <p className="animate-pulse text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            Scanning perimeter...
          </p>
        )}

        {!loading && error && (
          <div className="text-center p-12 border-2 border-dashed border-border/60 rounded-lg">
            <p className="text-destructive font-medium">Unable to load nearby places. Please check location permissions.</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {places.map((place) => (
              <div
                key={place.place_id}
                className="group border-l border-border/70 pl-6 py-2 transition-colors hover:border-primary"
              >
                <div className="flex items-center gap-3 mb-3">
                  {place.types?.includes("library") ? (
                    <Library className="w-4 h-4 opacity-60" />
                  ) : (
                    <Heart className="w-4 h-4 opacity-60 text-primary" />
                  )}
                  <h3 className="font-serif text-xl font-medium">{place.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 font-sans">{place.vicinity}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    place.name || ""
                  )}&query_place_id=${place.place_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] uppercase tracking-widest underline underline-offset-4 hover:text-primary transition-colors"
                >
                  View Location
                </a>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-24 flex items-center justify-between opacity-30 grayscale border-t border-dashed pt-8">
          <span className="text-[8px] font-mono uppercase">Data Source: Google Places API</span>
          <img
            src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
            alt="Google"
            className="h-3"
          />
        </footer>
      </main>
    </div>
  );
}
