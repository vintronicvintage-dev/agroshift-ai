# Image credits

All images in this folder are optimised WebP derivatives of public-domain US federal government
works (NASA, USGS Landsat data, USDA). Originals are not committed. Retrieved and checked on
2026-11-13. The same records drive the "Image credits" section of the Methods page
(`src/lib/ui/images.ts`). Using NASA imagery does not imply NASA endorsement of AgroShift; no NASA
insignia or logo is used.

Licence basis: works of the US federal government are not subject to copyright in the US
(17 U.S.C. § 105). NASA media usage guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/
Landsat data are distributed by USGS without restriction.

| File | Title | Author / credit line | Source page | Direct file URL | Licence | Retrieved | What was verified | Edits |
|---|---|---|---|---|---|---|---|---|
| `harran-plain-2002.webp` (1400×1662, 347 KB) | Harran Plain and Atatürk Reservoir, Şanlıurfa, Türkiye. Landsat 7, 24 Aug 2002 | Image courtesy USDA Foreign Agricultural Service (PECAD), Landsat 7 data. Published in NASA Earth Observatory, "Just add water: A modern agricultural revolution in the Fertile Crescent", by Rebecca Lindsey and Curt Reynolds | https://science.nasa.gov/earth/earth-observatory/just-add-water-a-modern-agricultural-revolution-in-the-fertile-crescent | https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/harranplains/images/ataturk_2002.jpg | Public domain (US government work: USDA, Landsat) | 2026-11-13 | Source page names the file ("August 24, 2002, 3.2 MB JPEG"), the satellite, the place (Harran Plains, southeastern Turkey) and the credit; USDA FAS is a federal agency | Cropped (black scene edge removed), resized, WebP q50 |
| `gs-field.webp` (192×192, 8 KB) | Irrigated parcels on the Harran Plain (detail of the image above) | as above | as above | as above | Public domain | 2026-11-13 | as above | Detail crop, 192 px |
| `gs-water.webp` (192×192, 5 KB) | Center-pivot irrigation in western Texas, USA, from the ISS (iss074e0603632), 16 May 2026 | NASA | https://images.nasa.gov/details/iss074e0603632 | https://images-assets.nasa.gov/image/iss074e0603632/iss074e0603632~large.jpg | Public domain (NASA) | 2026-11-13 | NASA Image and Video Library API metadata: title, description (crop circles are center-pivot systems), "Credit: NASA" | Cropped, contrast raised against haze, 192 px |
| `gs-compare.webp` (192×192, 10 KB) | Fall harvest in eastern Kazakhstan, Landsat 8 OLI, 9 Sep 2013 | NASA Earth Observatory image by Jesse Allen, using Landsat data from the U.S. Geological Survey. Caption by Holli Riebeek | https://images.nasa.gov/details/GSFC_20171208_Archive_e001371 | https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001371/GSFC_20171208_Archive_e001371~large.jpg | Public domain (NASA / USGS) | 2026-11-13 | API metadata: credit line, instrument, date, place (rain-fed wheat region) | Cropped, 192 px |
| `gs-scenario.webp` (192×192, 6 KB) | Disappearing Lake Tuz, Central Anatolia, Türkiye. Landsat 8 OLI false color, 9 Aug 2021 | NASA Earth Observatory images by Joshua Stevens, using Landsat data from the U.S. Geological Survey. Story by Kathryn Hansen | https://science.nasa.gov/earth/earth-observatory/disappearing-lake-tuz-149211 | https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/149000/149211/tuz_oli_2021228_lrg.jpg | Public domain (NASA / USGS) | 2026-11-13 | Source page: credit line, sensor, date, false-color note | Cropped (west shore), 192 px. Labelled false color in alt text |
| `gs-evidence.webp` (192×192, 5 KB) | Aqua satellite orbiting Earth, artist concept (PIA18156) | NASA (JPL Photojournal) | https://images.nasa.gov/details/PIA18156 | https://images-assets.nasa.gov/image/PIA18156/PIA18156~orig.jpg | Public domain (NASA) | 2026-11-13 | API metadata: title, "secondary_creator: NASA", Aqua carries MODIS (the vegetation data the app uses) | Cropped to the spacecraft, 192 px |

## Considered and not used

- Unsplash: the search endpoint refused scripted requests from this machine, so no licence could be
  verified per photo; nothing from Unsplash is used.
- Pexels: blocks scripts (403); not attempted.
- NASA ISS photos of the Atatürk Reservoir (iss074e0591602, iss075e0002070): clean licence, but the
  Landsat Harran scene shows the irrigated fields themselves, which is what the product is about.
- Center-pivot fields in southern Egypt (iss074e0247459): mostly cloud and desert at thumbnail size.
- SMAP artist concept (PIA17898): AgroShift does not use SMAP data, so it would misrepresent the
  data sources; the Aqua (MODIS) render was used instead.
- Per-crop photos for the 12 crops: not done. A consistent, correctly identified, verifiably licensed
  set for every crop was not available from the allowed sources, and a partial set would be worse
  than the existing colour glyphs.
