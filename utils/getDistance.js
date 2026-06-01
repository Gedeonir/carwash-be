  function getDistance(clat1, clon1, wlat2, wlon2) {
    const R = 6371;

    const dLat = ((wlat2 - clat1) * Math.PI) / 180;
    const dLon = ((wlon2 - clon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((clat1 * Math.PI) / 180) *
        Math.cos((wlat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  module.exports={getDistance}