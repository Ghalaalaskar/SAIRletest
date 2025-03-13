import React, { useEffect, useState, useCallback  } from 'react';
import { GoogleMap, InfoWindowF, MarkerF ,HeatmapLayer} from '@react-google-maps/api';
import motorcycle from '../../images/motorcycle.png';
import '../../css/CustomModal.css';
import _debounce from 'lodash.debounce'; 


const containerStyle = {
  width: '90%',  // Set the map width
  height: '600px', // Set the map height
  margin: 'auto',  // Center the map
};

// const beigeMapStyle = [
//   { elementType: "geometry", stylers: [{ color: "									#FFFAF0" }] }, // Base Color
//   { elementType: "labels.text.fill", stylers: [{ color: "#776543" }] }, // Dark Brown Text
//   { elementType: "labels.text.stroke", stylers: [{ color: "#f3f3f3" }] }, // Light Stroke Around Text
//   { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] }, // Hide Borders
//   { featureType: "water", stylers: [{ color: "#d4c4b7" }] }, // Light Beige Water
//   { featureType: "road", stylers: [{ color: "#e6d5c3" }] }, // Light Beige Roads
// ];

const GDTMap = ({ locations }) => {  
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [map, setMap] = useState(null); 
  // const [isMapLoaded, setIsMapLoaded] = useState(false); 
  const [mapCenter, setMapCenter] = useState({ lat: 24.7136, lng: 46.6753 }); // Default center
  const [lastKnownLocations, setLastKnownLocations] = useState(() => {
    const storedLocations = localStorage.getItem("lastKnownLocations");
    return storedLocations ? JSON.parse(storedLocations) : []; 
  });
  const [initialLoad, setInitialLoad] = useState(true); // Track if it's the initial load


  console.log("GDTMap Component");
  const updateMapData = useCallback(() => {
    if (locations.length > 0 && window.google && window.google.maps) {
      const newHeatmapData = locations
        .filter(loc => loc && !isNaN(loc.lat) && !isNaN(loc.lng))
        .map(loc => new window.google.maps.LatLng(loc.lat, loc.lng));
      setHeatmapData(newHeatmapData);

      // Only set lastKnownLocations and mapCenter on the first load
      if (initialLoad) {
        setLastKnownLocations(locations);
        setMapCenter({ lat: locations[0].lat, lng: locations[0].lng });
        setInitialLoad(false); // Prevent further updates
      }
    }
  }, [locations, initialLoad]);

  useEffect(() => {
    updateMapData();
  }, [locations, updateMapData]);

  

  /*useEffect(() => {
    console.log("Locations received:", locations);
    
    if (locations.length > 0) {
      try {
        if (!window.google || !window.google.maps) {
          console.warn("Google Maps API is not loaded yet.");
          return;
        }

        setHeatmapData(
          locations
            .filter(loc => loc && !isNaN(loc.lat) && !isNaN(loc.lng)) 
            .map(loc => new window.google.maps.LatLng(loc.lat, loc.lng))
        );
        setLastKnownLocations(locations); // 
        localStorage.setItem("lastKnownLocations", JSON.stringify(locations)); 

      } catch (error) {
        console.error("Error creating LatLng objects:", error);
      }
    }
  }, [locations]); */

  useEffect(() => {
    if (window.google && window.google.maps) {
      console.log("Google Maps API Loaded Successfully");
      // setIsMapLoaded(true);
    }
  }, []);

  const motorcycleIcon = {
    url: motorcycle, 
    scaledSize: new window.google.maps.Size(50, 50), 
    origin: new window.google.maps.Point(0, 0), 
    anchor: new window.google.maps.Point(25, 50)
  };


  /* const center = locations.length > 0 ? { lat: locations[0].lat, lng: locations[0].lng } : { lat: 24.7136, lng: 46.6753 };
  const center = lastKnownLocations.length > 0 
  ? { lat: lastKnownLocations[0].lat, lng: lastKnownLocations[0].lng } 
  : { lat: 24.7136, lng: 46.6753 };
  // if (!isMapLoaded) {
  //   return <div className="loading-message">Loading Map...</div>;
  // }*/

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={mapCenter} 
        zoom={14}
        // options={{ styles: beigeMapStyle }} 
        onClick={() => setSelectedLocation(null)} 
        // onLoad={() => setIsMapLoaded(true)}
      >
        
        {heatmapData.length > 0 && (
          <HeatmapLayer
            data={heatmapData}
            options={{
              radius: 30,
              opacity: 0.7,
              gradient: [
                'rgba(0, 0, 255, 0)',    // Transparent blue
                'rgba(0, 255, 255, 1)',  // Cyan
                'rgba(0, 255, 0, 1)',    // Green
                'rgba(255, 255, 0, 1)',  // Yellow
                'rgba(255, 128, 0, 1)',  // Orange
                'rgba(255, 0, 0, 1)',    // Red
              ],
            }}
          />
        )}

{lastKnownLocations.map((location, index) => ( //  {isMapLoaded &&locations.map
          <MarkerF
            key={index}
            position={{ lat: location.lat, lng: location.lng }}
            icon={motorcycleIcon} 
            onClick={() => {
              setSelectedLocation(location);
            }}
          />
        ))}

{selectedLocation &&  (
  <InfoWindowF
    position={{ lat: selectedLocation.lat + 0.00012, lng: selectedLocation.lng }} 
    onCloseClick={() => setSelectedLocation(null)}
  >
    <div>
      <h4>Driver Info</h4>
      <p><strong>GPS Number:</strong> {selectedLocation.gpsNumber}</p>
      <p><strong>Latitude:</strong> {selectedLocation.lat}</p>
      <p><strong>Longitude:</strong> {selectedLocation.lng}</p>
    </div>
  </InfoWindowF>
)}
      </GoogleMap>
    </div>
  );
};

export default GDTMap;