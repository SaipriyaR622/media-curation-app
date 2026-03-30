import { useState, useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Library, Users, MapPin } from "lucide-react";

// The types of places your professor wants to see
const SEARCH_TYPES = ["library", "community_center"];

export default function CommunityResources() {
  const [places, setPlaces] = useState<google.maps.places.PlaceResult[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "idle">("idle");

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: "AIzaSyAkgwHMZIaZbB6hHjt0pYwmb7nRht2B8LQ", // Replace with your key
    libraries: ["places"],
  });

  useEffect(() => {
    if (!isLoaded) return;

    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userLoc = new google.maps.LatLng(latitude, longitude);

        // PlacesService needs an HTML element to attach attributions (even if hidden)
        const attrDiv = document.createElement("div");
        const service = new google.maps.places.PlacesService(attrDiv);

        const request = {
          location: userLoc,
          radius: 5000, // 5km search radius
          type: "library", // Google allows one type per request in basic Nearby Search
        };

        service.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPlaces(results);
            setStatus("idle");
          } else {
            setStatus("error");
          }
        });
      },
      () => setStatus("error")
    );
  }, [isLoaded]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Local Resources</h1>
        <p className="text-muted-foreground">Nearby libraries and community centers to help your curation journey.</p>
      </header>

      {status === "loading" && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      )}

      {status === "error" && (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-destructive font-medium">Unable to load nearby places. Please check location permissions.</p>
        </div>
      )}

      <div className="grid gap-6">
        {places.map((place) => (
          <Card key={place.place_id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-full">
                {place.types?.includes("library") ? <Library className="w-6 h-6 text-primary" /> : <Users className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <CardTitle>{place.name}</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  {place.vicinity}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {place.rating && (
                <span className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  ★ {place.rating} ({place.user_ratings_total} reviews)
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}