/**
 * Steam level badges, as drawn by Steam's `.friendPlayerLevel` CSS
 * (shared_global.css, copied 21 Nov 2026).
 *
 * - Levels 0–99: a 28×28 circle with a 2px border whose colour depends on
 *   the tens digit (`lvl_0` … `lvl_90`).
 * - Levels 100+: a 32×32 sprite. Each hundred has its own sprite sheet
 *   (`lvl_100` → hexagons, `lvl_200` → shields …), and the tens digit picks
 *   the row (`lvl_plus_10` shifts it up 32px, and so on).
 */
export const LEVEL_IMAGE_BASE = "https://community.fastly.steamstatic.com/public/shared/images/community/";

const RING_COLORS: Record<number, string> = {
  0: "#9b9b9b",
  10: "#c02942",
  20: "#d95b43",
  30: "#fecc23",
  40: "#467a3c",
  50: "#4e8ddb",
  60: "#7652c9",
  70: "#c252c9",
  80: "#542437",
  90: "#997c52",
};

const SPRITE_SHEETS: Record<number, string> = {
  100: "levels_hexagons.png",
  200: "levels_shields.png",
  300: "levels_books.png",
  400: "levels_chevrons.png",
  500: "levels_circle2.png",
  600: "levels_angle.png",
  700: "levels_flag.png",
  800: "levels_wings.png",
  900: "levels_arrows.png",
  1000: "levels_crystals.png",
  1100: "levels_space.png",
  1200: "levels_waterelement.png",
  1300: "levels_fireelement.png",
  1400: "levels_earthelement.png",
  1500: "levels_airelement_1-2.png",
  1600: "levels_airelement_3-4.png",
  1700: "levels_airelement_5-6.png",
  1800: "levels_airelement_7-8.png",
  1900: "levels_airelement_9-10.png",
  2000: "levels_geo_1-2.png?v=2",
  2100: "levels_geo_3-4.png?v=2",
  2200: "levels_geo_5-6.png?v=2",
  2300: "levels_geo_7-8.png?v=2",
  2400: "levels_geo_9-10.png?v=2",
  2500: "levels_mandala_1-2.png?v=2",
  2600: "levels_mandala_3-4.png?v=2",
  2700: "levels_mandala_5-6.png?v=2",
  2800: "levels_mandala_7-8.png?v=2",
  2900: "levels_mandala_9-10.png?v=2",
  3000: "levels_spiro_1-2.png?v=2",
  3100: "levels_spiro_3-4.png?v=2",
  3200: "levels_spiro_5-6.png?v=2",
  3300: "levels_spiro_7-8.png?v=2",
  3400: "levels_spiro_9-10.png?v=2",
  3500: "levels_patterns_1-2.png?v=2",
  3600: "levels_patterns_3-4.png?v=2",
  3700: "levels_patterns_5-6.png?v=2",
  3800: "levels_patterns_7-8.png?v=2",
  3900: "levels_patterns_9-10.png?v=2",
  4000: "levels_shapes_1.png?v=2",
  4100: "levels_shapes_2.png?v=2",
  4200: "levels_shapes_3.png?v=2",
  4300: "levels_shapes_4.png?v=2",
  4400: "levels_shapes_5.png?v=2",
  4500: "levels_grunge_1.png?v=2",
  4600: "levels_grunge_2.png?v=2",
  4700: "levels_grunge_3.png?v=2",
  4800: "levels_grunge_4.png?v=2",
  4900: "levels_grunge_5.png?v=2",
  5000: "levels_halftone_1.png?v=2",
  5100: "levels_halftone_2.png?v=2",
  5200: "levels_halftone_3.png?v=2",
  5300: "levels_5300_dashes.png",
  5400: "levels_5400_crosshatch.png",
  5500: "levels_5500_spiral.png",
  5600: "levels_5600_leaves.png",
  5700: "levels_5700_mountain.png",
  5800: "levels_5800_rain.png",
  5900: "levels_5900_tornado.png",
  6000: "levels_6000_snowflake.png",
  6100: "levels_6100_crown.png",
};

const SPRITE_ROWS: Record<number, string> = {
  10: "0 -32px",
  20: "0 -64px",
  30: "0 -96px",
  40: "0 -128px",
  50: "0 -160px",
  60: "0 -192px",
  70: "0 -224px",
  80: "0 -256px",
  90: "0 -288px",
};

const MAX_HUNDRED = Math.max(...Object.keys(SPRITE_SHEETS).map(Number));

export type LevelBadge =
  | { kind: "ring"; level: number; className: string; borderColor: string }
  | { kind: "sprite"; level: number; className: string; image: string; position: string };

export function levelBadge(level: number): LevelBadge {
  const lvl = Math.max(0, Math.floor(level));
  if (lvl < 100) {
    const tens = Math.floor(lvl / 10) * 10;
    return { kind: "ring", level: lvl, className: `lvl_${tens}`, borderColor: RING_COLORS[tens] };
  }
  const hundreds = Math.min(Math.floor(lvl / 100) * 100, MAX_HUNDRED);
  const plus = Math.floor((lvl % 100) / 10) * 10;
  return {
    kind: "sprite",
    level: lvl,
    className: plus ? `lvl_${hundreds} lvl_plus_${plus}` : `lvl_${hundreds}`,
    image: LEVEL_IMAGE_BASE + SPRITE_SHEETS[hundreds],
    position: plus ? SPRITE_ROWS[plus] : "0 0",
  };
}
