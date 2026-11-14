import { TEXTURE_FAMILIES, TEXTURE_FAMILY_ORDER, texturePatternId, type TextureTheme } from "./cropTexture";

export type CropPatternDefsProps = {
  /** Which theme variants to define. Default both, so a theme switch needs no re-render. */
  themes?: readonly TextureTheme[];
};

/**
 * Renders the crop-family <pattern> definitions once per page (a 0×0 SVG). Any SVG on the page can
 * then use fill={textureFill(family, theme)} or fill="url(#agro-tex-cereal-dark)".
 */
export function CropPatternDefs({ themes = ["dark", "light"] }: CropPatternDefsProps) {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {themes.flatMap((theme) =>
          TEXTURE_FAMILY_ORDER.map((family) => {
            const s = TEXTURE_FAMILIES[family];
            const [w, h] = s.tile;
            const bare = family === "fallow";
            const base = s.color[theme];
            const ink = bare ? base : theme === "dark" ? "#0b0e0c" : "#ffffff";
            const op = bare ? 1 : theme === "dark" ? 0.45 : 0.55;
            return (
              <pattern key={`${family}-${theme}`} id={texturePatternId(family, theme)} width={w} height={h} patternUnits="userSpaceOnUse">
                <rect width={w} height={h} fill={base} fillOpacity={bare ? (theme === "dark" ? 0.16 : 0.12) : 1} />
                {s.markKind === "fill" ? (
                  <path d={s.mark} fill={ink} fillOpacity={op} />
                ) : (
                  <path d={s.mark} fill="none" stroke={ink} strokeOpacity={op} strokeWidth={s.markWidth} strokeLinecap="square" />
                )}
              </pattern>
            );
          }),
        )}
      </defs>
    </svg>
  );
}
