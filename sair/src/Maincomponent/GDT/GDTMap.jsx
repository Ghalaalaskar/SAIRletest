import React from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import '../../css/CustomModal.css';

const GDTMap = ({ locations }) => {
  const containerStyle = {
    width: '90%', 
    height: '600px', 
    margin: 'auto',
  };

  const center = {
    lat: locations[0].lat, // Center the map around the first location
    lng: locations[0].lng,
  };

  // Function to open Google Maps in a new tab
  const handleMarkerClick = (lat, lng, placeName) => {
    console.log(`Opening Google Maps at: ${lat}, ${lng}`);
    const encodedPlaceName = encodeURIComponent(placeName);
    const googleMapsUrl = `https://www.google.com/maps/place/${encodedPlaceName}/@${lat},${lng},17z`;
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
        {locations.map((location, index) => (
          <MarkerF
            key={index}
            position={{ lat: location.lat, lng: location.lng }}
            onClick={() => handleMarkerClick(location.lat, location.lng, location.placeName)}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default GDTMap;