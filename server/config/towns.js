// Approximate coordinates for towns in Cameroon used for location-based search.
// Coordinates are [longitude, latitude] matching GeoJSON convention.
const TOWNS = {
  buea:      { lng: 9.24,  lat: 4.15,  label: 'Buea' },
  molyko:    { lng: 9.25,  lat: 4.16,  label: 'Molyko' },
  limbe:     { lng: 9.20,  lat: 4.02,  label: 'Limbe' },
  tiko:      { lng: 9.36,  lat: 4.08,  label: 'Tiko' },
  kumba:     { lng: 9.45,  lat: 4.64,  label: 'Kumba' },
  douala:    { lng: 9.77,  lat: 4.05,  label: 'Douala' },
  yaounde:   { lng: 11.50, lat: 3.85,  label: 'Yaounde' },
  bamenda:   { lng: 10.15, lat: 5.96,  label: 'Bamenda' },
  bafoussam: { lng: 10.42, lat: 5.47,  label: 'Bafoussam' },
};

module.exports = TOWNS;
