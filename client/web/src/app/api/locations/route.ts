import { validCoordinates } from "@/lib/utils/location";

// A configurable Photon endpoint keeps address lookup independent of the browser.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 200) {
    return Response.json({ error: "Enter an address between 3 and 200 characters." }, { status: 400 });
  }
  try {
    const url = new URL(process.env.PHOTON_API_URL || "https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "5");
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error("Address provider unavailable");
    const data = await response.json();
    if (!Array.isArray(data.features)) throw new Error("Invalid address response");
    const results = data.features.flatMap((feature: {
      geometry?: { coordinates?: unknown[] };
      properties?: Record<string, unknown>;
    }) => {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (typeof lat !== "number" || typeof lng !== "number" || !validCoordinates({ lat, lng })) return [];
      const properties = feature.properties ?? {};
      const part = (key: string) => typeof properties[key] === "string" ? properties[key] as string : "";
      const street = [part("housenumber"), part("street")].filter(Boolean).join(" ");
      const label = [...new Set([part("name"), street, part("district"), part("city"), part("state"), part("country")].filter(Boolean))].join(", ");
      return label ? [{ lat, lng, label }] : [];
    });
    return Response.json({ results });
  } catch {
    return Response.json({ error: "Address search is unavailable. Please try again." }, { status: 503 });
  }
}
