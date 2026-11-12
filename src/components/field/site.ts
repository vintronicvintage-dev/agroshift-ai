/** The chosen location: a bundled pilot region or any point picked on the map. */
export interface Site {
  kind: "pilot" | "point";
  id: string | null;
  nameTr: string | null;
  nameEn: string | null;
  lat: number;
  lon: number;
  retrievedAt: string | null;
}
