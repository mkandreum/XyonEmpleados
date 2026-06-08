/**
 * Utilidades para validación de geolocalización GPS
 */

/**
 * Calcula la distancia entre dos puntos GPS usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en metros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distancia en metros

    return distance;
}

/**
 * Valida que las coordenadas GPS sean válidas
 * @param {number} latitude - Latitud (-90 a 90)
 * @param {number} longitude - Longitud (-180 a 180)
 * @returns {boolean} true si las coordenadas son válidas
 */
function validateCoordinates(latitude, longitude) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return false;
    }

    if (isNaN(latitude) || isNaN(longitude)) {
        return false;
    }

    if (latitude < -90 || latitude > 90) {
        return false;
    }

    if (longitude < -180 || longitude > 180) {
        return false;
    }

    return true;
}

/**
 * Valida que un fichaje esté dentro del rango permitido de la oficina
 * @param {object} officeLocation - { latitude, longitude } de la oficina
 * @param {object} fichajeLocation - { latitude, longitude, accuracy } del fichaje
 * @param {number} maxDistance - Distancia máxima permitida en metros (default: 500)
 * @returns {object} { valid: boolean, distance: number, message: string }
 */
function validateFichajeLocation(officeLocation, fichajeLocation, maxDistance = 500) {
    // Si no hay ubicación de oficina configurada, permitir fichaje
    if (!officeLocation || !officeLocation.latitude || !officeLocation.longitude) {
        return {
            valid: true,
            distance: null,
            message: 'Ubicación de oficina no configurada. Fichaje permitido.'
        };
    }

    // Validar coordenadas de la oficina
    if (!validateCoordinates(officeLocation.latitude, officeLocation.longitude)) {
        console.error('Coordenadas de oficina inválidas:', officeLocation);
        return {
            valid: false,
            distance: null,
            message: 'Configuración de ubicación de oficina inválida. Contacta con administración.'
        };
    }

    // Validar coordenadas del fichaje
    if (!validateCoordinates(fichajeLocation.latitude, fichajeLocation.longitude)) {
        return {
            valid: false,
            distance: null,
            message: 'Coordenadas GPS inválidas. Verifica que los permisos de ubicación estén habilitados.'
        };
    }

    // Calcular distancia
    const distance = calculateDistance(
        officeLocation.latitude,
        officeLocation.longitude,
        fichajeLocation.latitude,
        fichajeLocation.longitude
    );

    // Validar distancia máxima
    // Si accuracy es baja (número alto), ser más permisivo
    const adjustedMaxDistance = fichajeLocation.accuracy 
        ? maxDistance + Math.min(fichajeLocation.accuracy, 100) // Añadir hasta 100m por accuracy baja
        : maxDistance;

    if (distance > adjustedMaxDistance) {
        return {
            valid: false,
            distance: Math.round(distance),
            message: `Debes estar cerca de la oficina para fichar. Distancia actual: ${Math.round(distance)}m (máximo: ${Math.round(adjustedMaxDistance)}m)`
        };
    }

    return {
        valid: true,
        distance: Math.round(distance),
        message: `Ubicación validada correctamente (${Math.round(distance)}m de la oficina)`
    };
}

module.exports = {
    calculateDistance,
    validateCoordinates,
    validateFichajeLocation
};
