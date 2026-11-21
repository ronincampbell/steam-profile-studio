/**
 * Steam profile themes.
 *
 * A profile's theme is a class on Steam's <body>, `<theme_id>Theme` (e.g.
 * Fuzzycast's page has `SteelTheme`). Each class only sets CSS variables
 * (header/content gradients, showcase header and button colours). The
 * values below are copied from Steam's profilev2.css on 21 Nov 2026.
 *
 * Where a profile's theme comes from: IPlayerService/GetProfileCustomization
 * returns `profile_theme.theme_id` (e.g. "Steel"); no key needed. Points Shop
 * theme items carry the same id in `community_item_data.profile_theme_id`.
 * "GameProfile" items have no colour scheme of their own in the CSS, so they
 * fall back to the default theme.
 */
export interface ThemeColors {
  gradientRight: string;
  gradientLeft: string;
  gradientBackground: string;
  gradientBackgroundRight: string;
  gradientBackgroundLeft: string;
  colorShowcaseHeader: string;
  gradientShowcaseHeaderLeft: string;
  btnBackground: string;
  btnBackgroundHover: string;
  btnOutline: string;
}

function t(
  gradientRight: string,
  gradientLeft: string,
  gradientBackground: string,
  gradientBackgroundRight: string,
  gradientBackgroundLeft: string,
  colorShowcaseHeader: string,
  gradientShowcaseHeaderLeft: string,
  btnBackground: string,
  btnBackgroundHover: string,
  btnOutline: string,
): ThemeColors {
  return {
    gradientRight,
    gradientLeft,
    gradientBackground,
    gradientBackgroundRight,
    gradientBackgroundLeft,
    colorShowcaseHeader,
    gradientShowcaseHeaderLeft,
    btnBackground,
    btnBackgroundHover,
    btnOutline,
  };
}

export const THEMES: Record<string, ThemeColors> = {
  Default: t(
    "rgba(109, 38, 44, 0.301)",
    "rgba(50, 255, 193, 0.103)",
    "rgba(34, 35, 48, 0.93)",
    "rgba(109, 38, 44, 0)",
    "rgba(50, 255, 193, 0.103)",
    "rgba(43, 45, 68, 0.93)",
    "rgba(115, 173, 184, 0.247)",
    "rgba(43, 52, 68)",
    "rgb(53, 62, 78)",
    "rgb(93, 102, 118)",
  ),
  Cosmic: t(
    "rgba(248, 70, 180, 0.301)",
    "rgba(9, 243, 99, 0.247)",
    "rgba(46, 13, 36, 0.93)",
    "rgba(70, 227, 248, 0)",
    "rgba(239, 243, 9, 0.13)",
    "rgba(57, 24, 61, 0.93)",
    "rgba(20, 60, 68, 0.93)",
    "rgb(90, 40, 92)",
    "rgb(100, 50, 102)",
    "rgba(140, 90, 142)",
  ),
  Summer: t(
    "rgba(252, 197, 16, 0.301)",
    "rgba(9, 243, 153, 0.247)",
    "rgba(51, 27, 16, 0.93)",
    "rgba(252, 197, 16, 0)",
    "rgba(48, 243, 9, 0.13)",
    "rgba(70, 53, 31, 0.93)",
    "rgba(33, 78, 76, 0.93)",
    "rgb(95, 76, 39)",
    "rgb(105, 86, 49)",
    "rgb(145, 126, 89)",
  ),
  Midnight: t(
    "rgba(51, 54, 253, 0.233)",
    "rgba(12, 85, 241, 0.37)",
    "rgba(10, 14, 32, 0.93)",
    "rgba(51, 54, 253, 0)",
    "rgba(12, 85, 241, 0.13)",
    "rgba(34, 32, 61, 0.93)",
    "rgba(20, 33, 68, 0.93)",
    "rgb(38, 36, 68)",
    "rgb(48, 46, 78)",
    "rgb(88, 86, 108)",
  ),
  DarkMode: t(
    "rgba(49, 49, 49, 0.233)",
    "rgba(51, 51, 51, 0.37)",
    "rgba(24, 24, 24, 0.93)",
    "rgba(34, 34, 34, 0)",
    "rgba(32, 32, 32, 0.13)",
    "rgba(0, 0, 0, 0.5)",
    "rgba(0, 0, 0, 0.5)",
    "rgba(0, 0, 0, 0.5)",
    "rgba(40, 40, 40, 1)",
    "rgb(80, 80, 80)",
  ),
  Steel: t(
    "rgba(70, 106, 128, 0.233)",
    "rgba(86, 120, 134, 0.37)",
    "rgba(41, 46, 51, 0.93)",
    "rgba(17, 24, 29, 0)",
    "rgba(19, 27, 31, 0)",
    "rgba(55, 62, 76, 0.93)",
    "rgba(68, 83, 93, 0.93)",
    "rgb(66, 76, 92)",
    "rgb(76, 86, 102)",
    "rgb(106, 126, 142)",
  ),
  PinkTeal: t(
    "rgb(139 29 68)",
    "rgb(137 30 67)",
    "rgb(0 255 255 / 15%)",
    "rgb(0 0 0 / 0%)",
    "rgb(0 0 0 / 0%)",
    "rgb(42 117 122)",
    "rgb(42 117 122)",
    "rgb(42 117 122)",
    "rgb(57 166 173)",
    "rgb(55 162 169)",
  ),
  MutedRed: t(
    "rgb(142 40 40 / 23%)",
    "rgb(163 53 53 / 37%)",
    "rgb(96 17 2 / 30%)",
    "rgb(253 51 51 / 0%)",
    "rgba(241, 12, 12, 0.13)",
    "rgb(49 9 9 / 81%)",
    "rgb(182 27 23 / 35%)",
    "rgb(58 13 10)",
    "rgb(105 26 21)",
    "rgb(108, 90, 86)",
  ),
  SteamGreen: t(
    "#393e2b",
    "rgb(71 78 52)",
    "rgb(53 58 39)",
    "rgb(194 253 51 / 0%)",
    "rgb(206 241 12 / 0%)",
    "rgb(62 69 44)",
    "rgb(83 92 60)",
    "rgb(73 82 53)",
    "rgb(82 91 59)",
    "rgb(92 111 45)",
  ),
  BlueRed: t(
    "rgb(253 56 51 / 23%)",
    "rgb(12 230 241 / 37%)",
    "rgb(10 25 32 / 30%)",
    "rgb(253 51 51 / 15%)",
    "rgb(12 241 241 / 13%)",
    "rgb(64 23 23 / 50%)",
    "rgb(27 113 132 / 93%)",
    "rgb(45 93 111)",
    "rgb(36 121 130)",
    "rgb(86 105 108)",
  ),
  GoldBurgundy: t(
    "rgb(253 219 51 / 23%)",
    "rgb(97 75 37)",
    "rgb(39 27 16 / 50%)",
    "rgb(0 0 0 / 35%)",
    "rgb(0 0 0 / 35%)",
    "rgb(53 28 22 / 76%)",
    "rgb(120 92 20 / 69%)",
    "rgb(57 38 25)",
    "rgb(77 52 36)",
    "rgb(108, 90, 86)",
  ),
  VibrantBlue: t(
    "#008ada8a",
    "rgb(47 137 188)",
    "#0203048a",
    "rgb(253 51 51 / 0%)",
    "rgb(12 140 241 / 17%)",
    "rgb(19 57 95)",
    "rgb(39 106 141)",
    "rgb(25 70 107)",
    "rgb(35 87 130)",
    "rgb(34 88 133)",
  ),
  GoldenProfileDebut: t(
    "rgba(156, 66, 17, 0.18)",
    "rgba(213, 172, 81, 0.62)",
    "rgba(61, 47, 20, 0.6)",
    "rgba(0, 0, 0, 0)",
    "rgba(243, 200, 9, 0.13)",
    "rgba(95, 72, 33, 0.82)",
    "rgba(155, 122, 54, 0.9)",
    "rgb(125, 98, 44)",
    "rgb(135, 108, 54)",
    "rgb(175, 148, 94)",
  ),
  WinterProfile2020: t(
    "#7770a988",
    "#34526f88",
    "#34526f88",
    "rgba(25, 20, 65, 0.333)",
    "rgba(3, 7, 12, 0.333)",
    "#07817f",
    "#34526f",
    "#34526f",
    "rgb(54, 104, 151)",
    "#34526f",
  ),
  GoldenWeekProfile2021: t(
    "#389bb0aa",
    "#2c5e83aa",
    "#134061aa",
    "#389bb066",
    "#2c5e8333",
    "#389bb0",
    "#2c5e83",
    "#2c5e83",
    "#1b6daa",
    "#2c5e83",
  ),
  Summer2021: t(
    "#344f68",
    "#ee3b57b8",
    "#000000cc",
    "#c1ad4c52",
    "#2e6ea2a3",
    "#b03849a1",
    "#2e6986",
    "#309186",
    "#3aa89c",
    "#2c5e83",
  ),
  MutedBlue: t(
    "#737d96",
    "rgb(115 124 147)",
    "#2127338c",
    "rgb(253 51 51 / 0%)",
    "rgb(20 26 49 / 13%)",
    "rgb(30 44 66 / 54%)",
    "rgb(69 79 108 / 75%)",
    "rgb(44 55 74)",
    "rgb(63 81 111)",
    "rgb(86 91 108)",
  ),
  Gold: t(
    "rgb(197 164 79 / 73%)",
    "rgb(128 94 36)",
    "rgb(116 93 44 / 64%)",
    "rgb(0 0 0 / 35%)",
    "rgb(0 0 0 / 35%)",
    "rgb(185 145 76 / 76%)",
    "rgb(120 95 31 / 69%)",
    "rgb(145 116 66)",
    "rgb(169 132 68)",
    "rgb(108, 90, 86)",
  ),
  BurntOrange: t(
    "rgb(136 66 8 / 66%)",
    "rgb(251 250 251 / 48%)",
    "rgb(47 24 6 / 65%)",
    "rgb(19 8 2)",
    "rgb(8 2 5 / 0%)",
    "rgb(48 12 5 / 88%)",
    "rgb(168 99 5 / 67%)",
    "rgb(50 15 7)",
    "rgb(89 31 17)",
    "rgb(86 30 17)",
  ),
  FlatGrey: t(
    "#3b3e4100",
    "rgb(59 62 65 / 0%)",
    "rgb(59 62 65)",
    "rgb(59 62 65 / 0%)",
    "rgb(59 62 65 / 0%)",
    "rgb(105 110 113)",
    "rgb(105 110 113)",
    "rgb(105 110 113)",
    "rgb(118 122 124)",
    "rgb(105 110 113)",
  ),
  Purple: t(
    "#3c2c4c",
    "#52298094",
    "#20024380",
    "#0f021f",
    "#150329",
    "#4c2f69",
    "#29113f",
    "#40245c",
    "#5f3c80",
    "#603689",
  ),
  GreenSlime: t(
    "rgb(254 249 156 / 30%)",
    "rgb(98 145 152 / 34%)",
    "rgb(35 58 26 / 58%)",
    "rgb(0 0 0)",
    "rgb(0 0 0)",
    "rgb(27 38 18)",
    "rgb(113 141 46)",
    "rgb(33 45 20)",
    "rgb(80 101 35)",
    "rgb(86 109 37)",
  ),
  Ghost: t(
    "rgb(82 64 83 / 52%)",
    "rgb(3 3 4 / 46%)",
    "rgb(93 123 137 / 32%)",
    "rgb(72 31 46)",
    "rgb(0 0 0)",
    "rgb(69 32 46)",
    "rgb(93 123 136)",
    "rgb(93 122 135)",
    "rgb(112 151 169)",
    "rgb(126 126 126 / 27%)",
  ),
  ColorNightmare: t(
    "rgb(58 183 180 / 51%)",
    "rgb(243 106 9 / 25%)",
    "rgb(0 0 0 / 50%)",
    "rgb(0 0 0)",
    "rgb(9 243 217 / 33%)",
    "rgb(57 144 152 / 61%)",
    "rgb(198 96 50)",
    "rgb(45 114 123)",
    "rgb(196 96 50)",
    "rgb(196 96 50)",
  ),
  Murugiah: t(
    "rgb(84 75 158)",
    "rgb(84 75 158)",
    "rgb(84 75 158)",
    "rgb(84 75 158)",
    "rgb(84 75 158)",
    "rgb(11 160 232)",
    "rgb(11 160 232)",
    "rgb(225 69 40)",
    "rgb(145 181 69)",
    "rgb(225 69 40)",
  ),
  Winter2021: t(
    "rgb(87 136 137 / 14%)",
    "rgb(157 204 199 / 35%)",
    "rgb(22 77 81 / 88%)",
    "rgb(95 165 155 / 15%)",
    "rgb(9 243 217 / 33%)",
    "rgb(184 99 69)",
    "rgb(207 132 36)",
    "rgb(184 99 69)",
    "rgb(206 131 36)",
    "rgb(196 96 50)",
  ),
  Lunar2022: t(
    "rgb(232 63 12 / 78%)",
    "rgb(239 65 12)",
    "rgb(58 44 122 / 83%)",
    "rgb(135 25 2 / 65%)",
    "rgb(211 72 31 / 60%)",
    "rgb(86 62 173)",
    "rgb(234 101 69)",
    "rgb(86 62 173)",
    "rgb(146 78 131)",
    "rgb(173 85 113)",
  ),
  SteamDeck: t(
    "transparent",
    "transparent",
    "transparent",
    "transparent",
    "transparent",
    "rgb(149 1 169 / 19%)",
    "rgb(87 89 123 / 0%)",
    "rgb(29 10 25 / 10%)",
    "rgb(175 52 149 / 21%)",
    "rgb(29 10 25 / 0%)",
  ),
  Steam3000: t(
    "rgba(0, 0, 0, 0)",
    "rgba(0, 0, 0, 0)",
    "rgba(0, 0, 0, 0)",
    "rgba(0, 0, 0, 0)",
    "rgba(0, 0, 0, 0)",
    "rgb(231 196 52)",
    "rgb(239 0 255)",
    "rgba(0, 0, 0, 0)",
    "rgb(46, 46, 46)",
    "rgba(0, 0, 0, 0)",
  ),
};

export const DEFAULT_THEME_ID = "Default";

/** Theme colours for a theme id, falling back to Steam's default theme. */
export function themeColors(themeId: string | undefined | null): ThemeColors {
  return (themeId && THEMES[themeId]) || THEMES[DEFAULT_THEME_ID];
}

/** CSS custom properties for a theme, named as in Steam's CSS. */
export function themeCssVars(themeId: string | undefined | null): Record<string, string> {
  const c = themeColors(themeId);
  return {
    "--gradient-right": c.gradientRight,
    "--gradient-left": c.gradientLeft,
    "--gradient-background": c.gradientBackground,
    "--gradient-background-right": c.gradientBackgroundRight,
    "--gradient-background-left": c.gradientBackgroundLeft,
    "--color-showcase-header": c.colorShowcaseHeader,
    "--gradient-showcase-header-left": c.gradientShowcaseHeaderLeft,
    "--btn-background": c.btnBackground,
    "--btn-background-hover": c.btnBackgroundHover,
    "--btn-outline": c.btnOutline,
    ...achievementVars(themeId),
  };
}

/**
 * Steam draws the Favorite Game showcase's achievement bar and trophy
 * differently on the default theme: `body:not(.DefaultTheme)` rules in
 * profilev2.css dim the bar colours, add a shine and fade the trophy to 75%.
 * These variables carry the default theme's values; MoreShowcases.module.css
 * falls back to the other themes' values. (That a profile with no theme gets
 * Steam's `DefaultTheme` body class is inferred, not seen on a real page.)
 */
function achievementVars(themeId: string | undefined | null): Record<string, string> {
  // Only a profile with no theme: GameProfile reuses the default colours but
  // its body class is GameProfileTheme, so it gets the other themes' look.
  if (themeId && themeId !== DEFAULT_THEME_ID) return {};
  return {
    "--achievement-segment-base": "#1a9fffd4",
    "--achievement-segment-dlc": "#ab59b9ba",
    "--achievement-segment-shine": "none",
    "--achievement-ribbon-opacity": "1",
  };
}
