# Themes

Kimmino's interface is built on CSS custom properties, so a theme is nothing more than a set of colour tokens with a name. Twenty palettes ship in the box; you can import, create and export your own.

## Built-in themes

| Theme | Base | Character |
| :--- | :--- | :--- |
| Kimmino Dark | dark | Default: deep navy surfaces, periwinkle→mint accent |
| Kimmino Light | light | Same accent on paper-white surfaces |
| OLED Black | dark | True black for OLED panels, minimal borders |
| Midnight Mint | dark | Teal-tinted dark with a mint accent |
| Paper | light | Warm off-white, brown accent, low contrast |
| Nord | dark | Arctic blues, muted contrast |
| Gruvbox | dark | Warm retro browns and amber |
| Rose Pine | dark | Dusty purple and rose |
| Solar | light | Solarised, blue accent |
| …plus eleven more in **Settings → Themes** | | |

## File format

Extension: `.kimmino-theme` (plain JSON, sent with `application/json`).

```json
{
  "format": "kimmino-theme",
  "version": 1,
  "name": "Midnight Mint",
  "author": "you",
  "base": "dark",
  "colors": {
    "bg": "#06110f",
    "surface": "#0b1a17",
    "surfaceAlt": "#112420",
    "text": "#eaf6f2",
    "textDim": "#9db5ad",
    "border": "#1d332d",
    "accent": "#33d6a6",
    "accentText": "#04120e"
  }
}
```

Rules:

- `format` must be `kimmino-theme`, `version` must be `1`.
- `base` is `dark` or `light`; it determines the fallback for any colour you omit and how OS-level surfaces (menus, scrollbars) are rendered.
- `colors` accepts any subset. Missing tokens fall back to the base theme, so a three-line file is valid.
- Unknown keys are ignored (forward compatibility), unknown tokens produce a warning in the theme editor, not a failure.
- Colours must be `#rgb`, `#rrggbb` or `#rrggbbaa`.

## Importing

1. **Settings → Themes → Import theme**, or drag the file onto the Themes page.
2. The theme appears in the gallery with an **Apply** button and is stored in the profile (`themes.json`), so it survives restarts and is included in backup and sync.

Themes are not executable and cannot contain CSS, fonts or scripts — only colour values. That is deliberate: importing a stranger's theme should never be able to run code.

## Creating one

**Settings → Themes → Theme studio** gives you live editing of the eight core tokens against a miniature of the browser, with contrast warnings when text falls below WCAG AA on its surface. **Export** writes a `.kimmino-theme` file you can share.

If you prefer editing JSON, drop your file in and iterate: the Themes page previews every card with real component shapes, not flat swatches.

## Wallpapers and start page

Themes and wallpapers are independent. Twelve wallpapers ship with Kimmino (four photographic, eight animated gradients), and you can add your own JPG/PNG/WebP from **Settings → Start page → Wallpaper → Choose file**. Images are cropped to the window ratio, downscaled to 2560 px on the long edge, and stored per profile in `wallpapers/`. Blur and dim sliders are per profile too.

## Where themes live

```
<profile>/
├── themes.json          imported + custom themes
└── wallpapers/custom.*  your own wallpaper
```

Deleting a theme removes it from disk; the currently applied theme falls back to Kimmino Dark.
