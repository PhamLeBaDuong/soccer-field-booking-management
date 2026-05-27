import * as fieldService from "../services/fieldService.js";

function handleError(res, error) {
    const clientPhrases = ["required", "not found", "must be valid", "must be a positive"];
    const msg = error.message?.toLowerCase() ?? "";
    const isClient = clientPhrases.some(p => msg.includes(p));
    if (isClient) return res.status(400).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
}

/**
 * GET /api/fields
 * Query params (all optional): complexId, type, indoor, lights
 *
 * Returns all fields enriched with parent complex info.
 */
export async function getAllFields(req, res) {
    try {
        const { complexId, type, indoor, lights } = req.query;
        res.json(await fieldService.getAllFields({ complexId, type, indoor, lights }));
    } catch (error) { handleError(res, error); }
}

/**
 * GET /api/fields/nearby?lat=X&lng=Y&radius=km
 *
 * Returns fields within `radius` km of the given coordinates, sorted nearest-first.
 * Each result includes a `distanceKm` property.
 * Default radius: 50 km.
 */
export async function getNearbyFields(req, res) {
    const { lat, lng, radius } = req.query;
    try {
        res.json(await fieldService.getNearbyFields(lat, lng, radius));
    } catch (error) { handleError(res, error); }
}

/**
 * GET /api/fields/:fieldId
 *
 * Returns a single field with complex + owner info.
 */
export async function getFieldById(req, res) {
    try {
        res.json(await fieldService.getFieldById(req.params.fieldId));
    } catch (error) { handleError(res, error); }
}
