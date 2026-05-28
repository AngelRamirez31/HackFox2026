import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "80vh",
};

const center = {
  lat: 32.5149,
  lng: -117.0382,
};

function MapView() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  if (!isLoaded) {
    return <p>Cargando mapa...</p>;
  }

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
      <Marker position={center} />
    </GoogleMap>
  );
}

export default MapView;