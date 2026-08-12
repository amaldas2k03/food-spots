/**
 * Decodes an encoded polyline (the format the server's Directions response
 * returns) into MapLibre-ordered [lng, lat] pairs.
 */
export function decodePolyline(encoded, precision = 5) {
  if (!encoded) return [];

  const factor = 10 ** precision;
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const nextValue = () => {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += nextValue();
    lng += nextValue();
    coords.push([lng / factor, lat / factor]);
  }

  return coords;
}
