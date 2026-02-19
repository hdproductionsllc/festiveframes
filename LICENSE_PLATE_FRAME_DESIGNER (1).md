# Festive Frames — Designer App — Claude Code Prompt

## Brand

**Festive Frames** — customizable, collectible license plate frame decorations for every occasion. The tagline energy is: *"Frame every moment."* Every export, share image, and physical frame includes a **QR code linking to festiveframes.com** (see QR Code Integration section below).

### Core Value Propositions (Weave These Into All Copy)

1. **It's FUN** — Designing your frame is play, not work. The drag-and-drop designer is addictive. Swapping tiles for a new season is a ritual people look forward to. This isn't a car accessory — it's self-expression on wheels
2. **It's CUSTOMIZABLE** — Infinite combinations. Your frame is yours. Nobody else has the same design. Mix sets, write your own text, change it whenever you want. No other license plate frame on the market does this
3. **It's BUILT TO LAST** — All-weather, all-season, highway-rated. Rain, snow, 110°F heat, car washes, road salt — tiles stay locked, colors stay vivid, frame stays solid. This isn't flimsy plastic. It's automotive-grade
4. **It's COLLECTIBLE** — New sets drop for every holiday, championship, and life moment. Collect the sets, swap the tiles, keep your frame fresh year-round. The frame is the platform — the tiles are the content

## Growth Model — The Viral Loop

The entire product is a self-marketing engine. Every Festive Frames product on the road is a billboard that drives new customers. The viral loop is:

```
1. Person sees a cool frame in a parking lot / at a red light / on social media
   ↓
2. Scans QR code on the frame (or taps a share link)
   ↓
3. Lands on festiveframes.com/d/{designId} — the DESIGNER opens with that exact
   design pre-loaded in preview/read-only mode. They see the full frame, can spin
   through the tiles, read the bottom bar. It's interactive, not a static image.
   ↓
4. Banner: "Like this? Make it yours →" tapping drops them into full edit mode
   with the same set pre-selected. Zero friction. No login required to design.
   ↓
5. User plays with the designer, creates their own version (or orders that exact one)
   ↓
6. Purchases frame + tile sets → their car becomes the next billboard
   ↓
→ REPEAT
```

**This loop must be frictionless.** The scan-to-designing path needs to be < 2 taps. The landing IS the designer. Not a marketing page, not a gallery, not a "learn more" page. The product sells itself when people can immediately touch it. Login only gates saving and purchasing — never browsing or designing.

### Share / Landing Page Spec (`festiveframes.com/d/{designId}`)

This URL serves the **designer in preview mode**, not a separate page. When loaded:

- **The frame renders full-width** with the original design pre-populated — beautiful, dark background, all tiles in place, bottom bar text visible, QR code shown
- **Floating CTA bar** at bottom: "✨ Make Your Own" (opens full designer) | "🛒 Order This Exact Design" (shortcut to checkout)
- **Set info drawer** (swipe up or tap): Shows which tile set(s) this design uses, price, and a tile preview grid
- **No login wall.** Anonymous users can enter the designer, place tiles, customize text. Login prompts appear only when they try to save or purchase
- **Open Graph meta tags**: Auto-generated preview image of the frame design so it looks great when pasted into iMessage, Instagram stories, Facebook, X. Use `@vercel/og` or Satori for dynamic OG image generation
- **Server-side rendered** for fast load and SEO. The frame preview must appear in < 1 second on mobile networks — this is someone standing in a parking lot on cellular data

### Social / Viral Features in the Designer

- **"Share My Design"** button — generates a share card image (frame on dark background with festiveframes.com branding) optimized for Instagram stories (9:16), feed posts (1:1), and X (16:9)
- **Referral program**: Share a unique link → friend gets $5 off first order → you get $5 credit. Tracked via referral codes embedded in QR URLs
- **Email capture**: Prompt at two key moments: (1) after spending 30+ seconds in the designer: "Want to save your design? Drop your email." (2) After completing a design but before purchasing: "Get notified when new sets drop." This builds the list for set drop announcements and retargeting

### The Content Play

**The physical product IS the content.** The satisfying "snap" of clicking tiles onto a rail, the ASMR of sliding pieces into place, the before/after reveal of a bare frame becoming fully decorated — this is TikTok/Reels/Shorts gold. Plan for this:

- Film every frame you assemble. The production process is inherently satisfying to watch
- Ship frames with a card that says "Show us your frame! Tag @festiveframes for a chance to be featured"
- Repost every customer video and photo — this is free UGC content
- Create template videos: "Watch this 4th of July frame come to life in 30 seconds"
- The designer app itself is screenrecord-friendly — people will share their design process

## Product Overview

Build a full-stack web application for designing customizable 3D-printed license plate frames. The frame is a standard **13.5" × 6.5"** license plate frame with a snap-on rail system around the border. Users decorate the frame by dragging and dropping **1.25" × 1.25" decorative tile pieces** onto rail slots, and customize a **bottom text bar** (similar to dealership text strips). Tiles are sold as themed "sets" — the first set is **4th of July**, but the system must be architected for unlimited future sets (sports teams, holidays, universities, custom branding, etc.).

### Event-Driven Product Strategy

This product is inherently **event-driven and time-sensitive**. The business model is built around moments people want to celebrate on their vehicle. The app and set system must support rapid deployment of new sets to capitalize on cultural moments. Key event categories:

- **Holidays**: 4th of July, Christmas, Halloween, Valentine's Day, St. Patrick's Day, Cinco de Mayo
- **Sports championships**: Super Bowl winners, NCAA March Madness, World Series, Stanley Cup — these need to ship FAST after the event. The set system must support rapid turnaround from design to live in the store
- **Life events**: Just Married, Baby on Board, Class of 2026, Retirement, Birthday
- **Fandom/identity**: Sports teams (year-round), military branch pride, university alumni, hobby communities
- **Corporate/promo**: Dealerships, businesses, event sponsors can order custom-branded sets

The architecture must treat sets as **deployable content** — not features. Adding a "Chiefs Super Bowl LIX Champions" set 48 hours after the game should require zero code changes, just a JSON config + artwork assets uploaded to the CMS.

---

## Physical Product Context

Understanding the physical product is critical to getting the UI right AND to how we message it in the app:

- **Frame**: 3D-printed rail system that wraps the border of a standard US license plate (12" × 6" visible area)
- **Tiles**: 1.25" × 1.25" square pieces that **snap onto the rail** via a LEGO-style clip system that straddles the rail track
- **Tiles can slide** along the rail — they are not fixed to specific positions. Users can space them however they want or pack them tight
- **Tile decoration**: Each tile has a die-cut sticker applied to its face. Stickers are printed and cut separately, then adhered to the 3D-printed tile base
- **Bottom bar**: A long horizontal rail section below the plate where letter/character tiles snap on to spell custom text (like dealership name strips, but user-customizable)
- **Everything is modular**: Same rail, same tile base — only the sticker on top changes between sets
- **Wings (future)**: Optional horizontal extensions that bolt onto the left and right sides of the frame, extending beyond the plate width. Wings provide additional rail surface for larger designs and more tiles. The current frame architecture must NOT block this — see "Wings System" section below

### Durability & Build Quality

This is a key differentiator and must be communicated throughout the app (product pages, FAQ, checkout reassurance). The physical product is built to last outdoors on a moving vehicle in all conditions:

- **All-weather rated**: Frame and tiles are engineered for rain, snow, ice, extreme heat, UV exposure, road salt, car washes — no cracking, warping, fading, or brittleness over time
- **Snap-on retention**: The LEGO-style rail clip system provides a secure mechanical lock. Tiles do NOT pop off at highway speeds, over bumps, through car washes, or in temperature swings. The rail geometry is designed so that tiles require intentional force to remove but slide freely along the rail when you want to rearrange
- **UV-resistant stickers**: Die-cut sticker artwork uses automotive-grade UV-laminated vinyl so colors stay vibrant through seasons of sun exposure. No fading, peeling, or curling
- **Material quality**: 3D-printed in high-impact, weather-resistant filament (ASA or PETG, not cheap PLA that degrades outdoors). This is automotive-grade durability, not hobby-grade
- **Easy to clean**: Tiles and frame can be wiped down or pressure-washed without damage. Stickers are sealed and waterproof
- **Designed to swap, not to break**: The whole point is that you change your tiles seasonally. The rail system is built for hundreds of snap-on/snap-off cycles without wear

### How Durability Appears in the App

The designer and product pages should reinforce quality at key decision moments:

- **Product page / FAQ**: "Built to handle anything the road throws at it" section with weather icons (sun, rain, snow, car wash)
- **Checkout reassurance**: Badge or trust signal: "🛡️ All-Weather Rated · Highway Tested · UV Protected"
- **In the designer** (subtle): Small quality badge near the frame preview: "Automotive-grade materials"
- **Packaging insert**: Physical card in the box with care/durability info: "Your Festive Frame is built for the outdoors. Rain, snow, highway speeds — no problem."

---

## Application Architecture

### Tech Stack

- **Frontend**: React (Vite) + TypeScript
- **Styling**: Tailwind CSS
- **State management**: Zustand
- **Drag & drop**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Backend**: Node.js + Express (or Next.js API routes — Next.js preferred for SSR share pages)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Clerk or NextAuth
- **Payments**: Stripe (for purchasing tile sets, frames, and dealer subscriptions)
- **Storage**: Cloudflare R2 or AWS S3 (tile artwork assets, export images, production PDFs)
- **Export**: html-to-image or canvas-based screenshot for sharing/preview
- **QR generation**: `qrcode` npm package (SVG output)
- **PDF generation**: `@react-pdf/renderer` or Puppeteer (for production print sheets and assembly guides)
- **Email/Push**: Beehiiv or ConvertKit (email list + drop announcements), Resend (transactional: order confirmation, shipping)
- **Analytics**: PostHog or Mixpanel (event tracking for viral loop metrics)
- **Retargeting**: Facebook Pixel + Google Ads tag (for designer visitors who didn't purchase)
- **OG Image generation**: `@vercel/og` or Satori (dynamic Open Graph images for share pages)

### Project Structure

```
/src
  /components
    /frame          — Frame canvas, rail slots, plate preview, frame config logic
    /tiles          — Tile palette, tile piece component, tile set browser
    /bottom-bar     — Text bar editor, letter tile components, QR code overlay
    /designer       — Main designer layout, toolbar, export controls
    /gallery        — Community gallery feed, design cards, trending section, search
    /qr-code        — QR code generator, branded QR renderer, position controls
    /share          — Share page (public design view), social share cards, OG image gen
    /drops          — Set drop countdown, landing pages, notification opt-in
    /dealer         — Dealer landing page, loyalty reward claim UI
    /wings          — PLACEHOLDER: Wing slot rendering, wing toggle (future)
    /ui             — Shared UI primitives (buttons, modals, etc.)
  /stores           — Zustand stores for design state, tile sets, user data, frame config, gallery
  /hooks            — Custom hooks (useDragTile, useFrameLayout, useSlotGenerator, etc.)
  /lib
    /types          — TypeScript interfaces and types (including Dealer, Gallery, Production)
    /constants      — Frame dimensions, slot calculations, wing dimensions (future)
    /frame-configs  — Frame variant configs (standard, winged-small, winged-large)
    /utils          — Layout math, export helpers, QR generation, production artifact gen
  /api              — API routes for sets, designs, orders, gallery, dealer
  /pages            — Public pages: /d/{id}, /dealer/{slug}, /drops/{slug}, /gallery
  /data
    /sets           — Tile set definitions (JSON configs)
  /admin            — PLACEHOLDER: Dealer dashboard, production queue viewer (future)
```

---

## Core Data Models

### Tile Set

```typescript
interface TileSet {
  id: string;
  slug: string;                    // "fourth-of-july", "christmas", "chiefs-kingdom"
  name: string;                    // "4th of July Collection"
  description: string;
  category: TileSetCategory;       // "holiday" | "sports" | "sports-event" | "university" | "life-event" | "custom" | "evergreen"
  pieces: TilePiece[];
  bottomBarLetters?: BottomBarLetterSet;  // Optional themed letter set
  presets: DesignPreset[];         // Pre-made designs users can one-click apply
  colors: {                        // Set-level color palette for UI theming
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  price: number;                   // Price in cents
  releaseDate: string;
  seasonal?: { start: string; end: string };  // Optional seasonal availability window
  eventDriven?: {                  // For championship/event sets that need rapid deployment
    eventName: string;             // "Super Bowl LIX", "2026 NCAA Tournament"
    relevanceWindow: string;       // ISO duration — how long this set stays prominently featured
    rushPriority: boolean;         // Flag for production to fast-track these orders
  };
  thumbnailUrl: string;
  isActive: boolean;
}
```

### Tile Piece

```typescript
interface TilePiece {
  id: string;
  setId: string;
  name: string;                    // "Red Star", "Blue Firework"
  slug: string;
  artworkUrl: string;              // High-res sticker artwork (what gets printed)
  thumbnailUrl: string;            // Small preview for palette
  previewUrl: string;              // Medium preview for drag ghost
  backgroundColor: string;         // Tile base color (if visible around sticker edges)
  tags: string[];                  // For search/filter: ["star", "patriotic", "red"]
  sortOrder: number;
}
```

### Bottom Bar Configuration

```typescript
interface BottomBarConfig {
  text: string;                    // "MAY THE FOURTH BE WITH YOU"
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  letterSpacing: number;
  alignment: "left" | "center" | "right";
  style: "raised" | "flat" | "engraved";  // Maps to 3D print style
}
```

### Frame Design (User's Saved Design)

```typescript
interface FrameDesign {
  id: string;
  userId: string;
  name: string;
  frameConfig: FrameConfig;        // Which frame variant (standard, with wings, etc.)
  slots: Record<string, PlacedTile>;  // slotId -> tile placement
  bottomBar: BottomBarConfig;
  qrCode: QRCodeConfig;            // QR code placement settings
  frameColor: string;              // Base frame color (3D print filament)
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;               // Share to community gallery
  setIds: string[];                // Which sets are used (for purchase validation)
}

interface FrameConfig {
  variant: "standard" | "winged";  // Standard 13.5x6.5 or with wing extensions
  wings?: {                        // Only present if variant === "winged"
    left: WingConfig | null;
    right: WingConfig | null;
  };
}

// FUTURE: Wing dimensions/slots TBD — this interface is a placeholder.
// Implement as empty/optional for now. The key constraint is that FrameDesign
// and the slot system must not assume a fixed set of slot IDs.
interface WingConfig {
  size: "small" | "medium" | "large";  // Maps to physical wing lengths
  slots: string[];                      // Additional slot IDs contributed by this wing
}

interface PlacedTile {
  pieceId: string;
  setId: string;
  rotation: number;                // 0, 90, 180, 270 — future feature
  zone: "frame" | "wing-left" | "wing-right";  // Which physical zone this tile lives on
}
```

### Frame Slot Layout

```typescript
interface FrameSlot {
  id: string;                      // "top-0", "left-2", "right-1", "wing-left-3"
  zone: "frame" | "wing-left" | "wing-right";  // Physical zone
  position: "top" | "bottom" | "left" | "right" | "wing-top" | "wing-bottom" | "wing-outer";
  index: number;                   // Position along that rail
  x: number;                       // Pixel x offset for rendering
  y: number;                       // Pixel y offset for rendering
}
```

### QR Code Configuration

```typescript
interface QRCodeConfig {
  enabled: boolean;                // Always true for physical product; toggleable in app preview
  url: string;                     // Default: "https://festiveframes.com"
  position: "bottom-bar-right" | "bottom-bar-left" | "frame-corner";  // Where QR appears
  size: "small" | "medium";       // Physical print size on the frame
  style: "standard" | "branded";  // Branded includes Festive Frames logo in center
}
```

---

## Frame Layout Calculations

These constants define the physical-to-pixel mapping. The UI must feel proportionally accurate to the real product.

```typescript
const FRAME_CONSTANTS = {
  // Physical dimensions (inches)
  FRAME_WIDTH: 13.5,
  FRAME_HEIGHT: 6.5,
  TILE_SIZE: 1.25,
  PLATE_WIDTH: 12.0,
  PLATE_HEIGHT: 6.0,

  // Slot counts (calculated from dimensions)
  TOP_SLOTS: 10,        // ~12.5" of rail / 1.25" per tile
  BOTTOM_SLOTS: 10,     // Same as top (but bottom is the text bar, see below)
  LEFT_SLOTS: 3,        // ~3.75" of vertical rail / 1.25" per tile  
  RIGHT_SLOTS: 3,

  // The bottom bar is DIFFERENT — it's a continuous text strip, not individual tile slots
  // Bottom bar uses letter tiles that are narrower than decorative tiles
  BOTTOM_BAR_HEIGHT: 1.25,  // Same rail height, but for text
};
```

**Important**: The bottom rail is the **text bar**. It does NOT use the same decorative tile slots. It has its own letter/character tile system. The top and sides use decorative tiles. The bottom uses text tiles.

---

## Designer UI — Detailed Specification

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Festive Frames Logo / Set selector / Save / Export │
├────────────────────────┬────────────────────────────────┤
│                        │                                │
│    TILE PALETTE        │      FRAME CANVAS              │
│                        │                                │
│  [Set picker tabs]     │  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┐ │
│                        │  │  │  │  │  │  │  │  │  │  │ │ ← top rail slots
│  ┌────┐ ┌────┐ ┌────┐  │  ├──┤              ├──┤      │
│  │ ⭐ │ │ 🇺🇸 │ │ 🎆 │  │  │  │              │  │      │
│  └────┘ └────┘ └────┘  │  │  │  LICENSE      │  │      │
│  ┌────┐ ┌────┐ ┌────┐  │  │  │  PLATE        │  │      │
│  │ 🦅 │ │ 🗽 │ │ 🔔 │  │  │  │  AREA         │  │      │
│  └────┘ └────┘ └────┘  │  │  │              │  │      │
│                        │  ├──┤              ├──┤      │
│  ───────────────────   │  ├──┴──────────────┴──┤      │
│  QUICK ACTIONS         │  │ MAY THE FOURTH BE  │      │ ← bottom text bar
│  [Fill All] [Random]   │  │    WITH YOU        │      │
│  [Mirror] [Clear]      │  └────────────────────┘      │
│                        │                                │
│  ───────────────────   │  BOTTOM BAR CONTROLS:          │
│  BOTTOM BAR TEXT       │  [Font] [Size] [Color] [Align] │
│  [________________]    │                                │
│                        │                                │
├────────────────────────┴────────────────────────────────┤
│  FOOTER: Presets gallery / Community designs / Order CTA │
└─────────────────────────────────────────────────────────┘
```

### Tile Palette (Left Panel)

- Grid of available tiles from the currently selected set
- Each tile is a draggable square showing the sticker artwork
- **Set tabs** at top to switch between owned/available sets
- **Search/filter** by tag within a set
- **Eraser tool** — click to select, then click slots to clear them
- **Eyedropper tool** — click a placed tile to select that piece for painting
- Tiles should have a subtle "LEGO nub" visual indicator to reinforce the snap-on concept
- Tiles the user doesn't own should appear grayed/locked with a purchase CTA

### Frame Canvas (Main Area)

- Centered, proportionally accurate representation of the frame
- **Rail slots**: Visible as dashed-border drop zones when empty, showing the rail groove
- **License plate area**: Rendered as a realistic plate placeholder (gray rectangle with "YOUR PLATE" text and bolt markers)
- **Placed tiles**: Show full sticker artwork, snapped into slot with subtle shadow
- **Drop zones glow** on hover when dragging a tile
- **Click-to-place mode**: Select a tile from palette, then click slots to paint (faster than drag for filling)
- **Right-click or long-press a placed tile** to remove it
- Should support both drag-and-drop AND click-to-paint workflows

### Bottom Text Bar

- Separate editing area below the frame canvas
- Text input field with live preview on the frame
- Controls for: font family, font size, letter color, background color, letter spacing, alignment
- Font selection should include dealership-style fonts: block sans-serifs, condensed gothics, stencil faces
- Character limit based on physical rail length
- Preview should update in real-time as user types
- The text bar visually sits below the license plate on the frame, spanning the full width
- **QR code indicator** rendered in the bottom-right corner of the text bar (small, branded, toggleable in preview but always present on physical product)

### Toolbar / Quick Actions

- **Fill All**: Apply selected tile to every empty slot
- **Random Fill**: Randomly populate all slots from current set
- **Mirror**: Copy left side to right side (or top-left half to all)
- **Alternate**: Fill with alternating pattern of 2 selected tiles
- **Clear All**: Remove all placed tiles
- **Undo/Redo**: Standard undo stack for all actions

### Presets

Each tile set ships with 3–5 pre-designed layouts users can one-click apply:

```typescript
interface DesignPreset {
  id: string;
  name: string;               // "Stars & Stripes", "Fireworks Display"
  description: string;
  thumbnailUrl: string;
  slots: Record<string, string>;  // slotId -> pieceId
  bottomBar: BottomBarConfig;
}
```

---

## 4th of July — First Tile Set Definition

This is the launch set. Define it as a JSON config that the system loads — this pattern is how ALL future sets will work.

```json
{
  "id": "set_july4_v1",
  "slug": "fourth-of-july",
  "name": "4th of July Collection",
  "description": "Celebrate Independence Day with stars, stripes, fireworks, and American icons.",
  "category": "holiday",
  "colors": {
    "primary": "#B22234",
    "secondary": "#002868",
    "accent": "#FFD700",
    "background": "#0a0a1a"
  },
  "pieces": [
    { "id": "j4_star_red", "name": "Red Star", "tags": ["star", "red", "patriotic"] },
    { "id": "j4_star_blue", "name": "Blue Star", "tags": ["star", "blue", "patriotic"] },
    { "id": "j4_star_white", "name": "White Star", "tags": ["star", "white", "clean"] },
    { "id": "j4_star_gold", "name": "Gold Star", "tags": ["star", "gold", "premium"] },
    { "id": "j4_flag", "name": "American Flag", "tags": ["flag", "america", "patriotic"] },
    { "id": "j4_firework_red", "name": "Red Firework", "tags": ["firework", "red", "celebration"] },
    { "id": "j4_firework_blue", "name": "Blue Firework", "tags": ["firework", "blue", "celebration"] },
    { "id": "j4_firework_gold", "name": "Gold Firework", "tags": ["firework", "gold", "celebration"] },
    { "id": "j4_stripe_red", "name": "Red Stripe", "tags": ["stripe", "red", "pattern"] },
    { "id": "j4_stripe_white", "name": "White Stripe", "tags": ["stripe", "white", "pattern"] },
    { "id": "j4_liberty", "name": "Statue of Liberty", "tags": ["liberty", "icon", "america"] },
    { "id": "j4_eagle", "name": "Bald Eagle", "tags": ["eagle", "icon", "america"] },
    { "id": "j4_sparkler", "name": "Sparkler", "tags": ["sparkler", "celebration", "night"] },
    { "id": "j4_heart_usa", "name": "USA Heart", "tags": ["heart", "love", "america"] },
    { "id": "j4_liberty_bell", "name": "Liberty Bell", "tags": ["bell", "liberty", "icon"] },
    { "id": "j4_usa_shield", "name": "USA Shield", "tags": ["shield", "emblem", "patriotic"] }
  ],
  "presets": [
    {
      "id": "preset_stars_stripes",
      "name": "Stars & Stripes",
      "description": "Alternating red stars and white stripes — classic and clean.",
      "bottomBar": { "text": "GOD BLESS AMERICA", "fontFamily": "Oswald" }
    },
    {
      "id": "preset_fireworks",
      "name": "Fireworks Display",
      "description": "A burst of color all around the frame.",
      "bottomBar": { "text": "HAPPY 4TH OF JULY", "fontFamily": "Bebas Neue" }
    },
    {
      "id": "preset_may_fourth",
      "name": "May the Fourth",
      "description": "For the patriot with a sense of humor.",
      "bottomBar": { "text": "MAY THE FOURTH BE WITH YOU", "fontFamily": "Anton" }
    }
  ],
  "price": 1499,
  "seasonal": { "start": "06-01", "end": "07-31" }
}
```

---

## Future Set Extensibility

The system MUST support adding new sets with zero code changes. A new set is just:

1. A JSON config file following the `TileSet` schema
2. Artwork assets uploaded to storage (sticker PNGs for each piece)
3. An optional themed letter set for the bottom bar
4. A database row marking it active

**Planned future sets** (architecture must support all of these patterns):

| Set | Category | Notes |
|-----|----------|-------|
| Christmas | Holiday | Snowflakes, ornaments, candy canes, Santa |
| Halloween | Holiday | Pumpkins, ghosts, bats, spiders |
| Valentine's Day | Holiday | Hearts, roses, cupid, love letters |
| NFL Teams | Sports | Per-team sets (32 teams = 32 sets) |
| NFL Champions | Sports/Event | Rapid-deploy after Super Bowl — team logo, trophy, confetti, "CHAMPIONS" |
| NCAA Champions | Sports/Event | March Madness winner, College Football Playoff winner |
| College Teams | University | Per-school sets — alumni pride year-round |
| Just Married | Life Event | Rings, hearts, doves, "JUST MARRIED" bottom bar |
| Baby on Board | Life Event | Storks, baby bottles, "It's a Boy/Girl" |
| Class of 20XX | Life Event | Graduation caps, diplomas — templated for any year |
| Birthday | Life Event | Balloons, cake, candles, age number tiles |
| Custom Branding | Business | Upload your own logo/artwork tiles — dealerships, sponsors, company cars |
| Floral | Evergreen | Roses, sunflowers, daisies — year-round |
| Luxury | Evergreen | Carbon fiber texture, chrome, gold, diamond patterns |
| Pride | Evergreen | Rainbow flags, pride symbols |
| Military | Evergreen | Branch emblems, camo patterns, dog tags, "VETERAN" |
| Pet Lover | Evergreen | Paw prints, bones, breed silhouettes |
| Road Trip | Evergreen | State outlines, route signs, compass, mountains |

**Rapid-response sets** (sports championships, election results, cultural moments) are the highest-margin opportunity. The CMS and set deployment pipeline should support going from artwork to live set in **under 24 hours**.

**Custom/Upload set** is a stretch goal where users upload their own artwork. The tile base is the same — they just provide the sticker image.

---

## Wings System (Future Feature — Architect For Now, Build Later)

### Concept

"Wings" are optional **horizontal extension panels** that attach to the left and/or right sides of the standard frame, extending beyond the license plate width. They provide additional rail surface area for larger, more elaborate designs.

```
                    STANDARD FRAME (13.5")
        ┌──────┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──────┐
        │      │  │  │  │  │  │  │  │  │  │  │      │
   ┌────┤      │  │              │  │      ├────┐
   │    │      │  │  LICENSE     │  │      │    │
   │WING│      │  │  PLATE      │  │      │WING│
   │LEFT│      │  │  AREA       │  │      │RGHT│
   │    │      │  │              │  │      │    │
   └────┤      │  │              │  │      ├────┘
        │      ├──┴──────────────┴──┤      │
        │      │  BOTTOM TEXT BAR   │      │
        └──────┴────────────────────┴──────┘
```

### Wing Specifications (Preliminary)

- Wings attach via the same rail system — they extend the existing left/right rails outward
- Wing sizes: **Small** (2 tile slots extra), **Medium** (4 slots), **Large** (6 slots)
- Wings can hold **larger format tiles** (2.5" × 2.5" or even custom shapes) — this is a future tile format, not part of MVP
- Wings are sold as a separate physical accessory — the frame itself has mounting points for them

### What to Build Now

**DO NOT build the wing UI or wing slot system yet.** But ensure the following architectural decisions don't block it:

1. **Slot IDs must be namespaced by zone**: Use `frame:top-0`, `frame:left-2`, `wing-left:outer-3` etc. — or at minimum, don't hardcode slot lists. Generate them dynamically from a frame config.
2. **FrameDesign stores a `frameConfig`** that declares which variant is active. Standard frame generates standard slots. Winged frame generates standard + wing slots. The slot generation is config-driven.
3. **Canvas rendering must be width-flexible**: The frame canvas component should accept a width that can grow when wings are present. Don't hardcode the 13.5" aspect ratio as the only possibility.
4. **PlacedTile includes a `zone` field** so we know which physical piece a tile belongs to (matters for production/assembly).
5. **The tile palette doesn't change** — same tiles work on wings as on the main frame. Wings just add more slots.

### What's Explicitly Deferred

- Wing UI toggle in the designer
- Wing slot rendering and drop zones
- Larger-format tile support (2.5" tiles)
- Wing product pages and pricing
- Wing-specific presets

---

## QR Code Integration

Every Festive Frames product includes a **QR code** that links to **festiveframes.com**. This is both a branding play and a discoverability mechanism — when someone sees a frame in a parking lot and scans the code, they land on the Festive Frames site.

### Physical Product

- The QR code is **printed/engraved on the physical frame** itself, typically on the bottom-right corner of the bottom text bar
- It is small, tasteful, and part of the Festive Frames brand identity — not an afterthought sticker
- The QR URL can optionally be **personalized**: `festiveframes.com/d/{designId}` — scanning shows the exact design on that car, creating a "scan to see their setup" social moment

### In the Designer App

- The frame preview should show a **small QR code indicator** in the bottom-right of the bottom bar (or configurable position)
- Users can toggle QR visibility in the preview (it's always present on the physical product, but some users may not want it dominant in their digital mockup)
- QR code renders in the PNG export with the Festive Frames URL
- QR style options: standard black/white, or branded (Festive Frames logo watermark in center of QR)

### Implementation

- Use a lightweight QR generation library (`qrcode` npm package or similar)
- QR data: `https://festiveframes.com` for generic, or `https://festiveframes.com/d/{designId}` for personalized
- Render as SVG or Canvas element within the frame preview component
- Include in all exports (PNG, PDF, share images)

---

## Interaction Behaviors — Detailed

### Drag and Drop

- Dragging a tile from the palette creates a **drag ghost** showing the tile at placement size
- Hovering over a valid slot highlights it with a glow/border effect
- Dropping onto an occupied slot **replaces** the existing tile
- Dropping outside any slot cancels the action
- On mobile: long-press to pick up, drag to place, release to drop

### Click-to-Paint Mode

- Clicking a tile in the palette **selects** it (highlighted border)
- While a tile is selected, clicking any slot places that tile
- Clicking the same palette tile again deselects it
- This is the faster workflow for filling many slots

### Eraser

- Dedicated eraser tool in the toolbar
- When active, clicking any placed tile removes it
- Visual indicator (cursor change, red tint) shows eraser is active

### Undo/Redo

- Maintain a stack of design states
- Every tile placement, removal, fill, clear, and text change is undoable
- Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z
- Stack depth: 50 actions

---

## Cross-Set Mixing Rules

**Users CAN mix tiles from multiple sets on a single frame.** This is a deliberate business decision — it drives multi-set purchases. A frame might have 4th of July stars on top, Eagles tiles on the sides, and a custom bottom bar text.

### Implementation Rules

- The tile palette shows tiles from ALL owned sets, organized by set tabs
- A design tracks which `setIds` are used (for purchase validation and production)
- When a user drags a tile from a set they don't own, show a **purchase prompt** inline: "This tile is from the [Set Name] collection. Unlock it for $X" with a one-tap buy button
- Presets are set-specific (they only use tiles from one set), but user designs are unrestricted
- The production pipeline must handle mixed-set orders: the sticker print sheet may pull artwork from multiple set asset folders

### Free / Starter Tiles

Every user gets a small **free "Essentials" set** that ships with the frame purchase: solid colors (red, blue, white, black, gold, silver), simple shapes (star, heart, circle), and a basic letter set for the bottom bar. This ensures no one gets a frame with zero tiles and creates the "first taste is free" upgrade path.

```typescript
interface UserTileAccess {
  ownedSetIds: string[];           // Purchased sets
  freeSetId: string;               // "essentials" — always available
  dealershipSetIds: string[];      // Sets granted via dealership loyalty program
  giftedSetIds: string[];          // Sets received as gifts or promo codes
}
```

---

## Dealership & B2B Program

This is a major revenue channel. Dealerships currently put cheap plastic frames with their name on every car they sell. Festive Frames replaces that with something customers actually WANT to keep on their car — and it becomes a loyalty platform.

### Dealer Value Proposition

- Dealership gets a **co-branded Festive Frame** on every vehicle sold — their name/logo on the bottom bar, their branded tile set on the frame
- Customers actually keep it (unlike the first thing most people do: throw away the dealer's plastic frame)
- The QR code links to the **dealer's Festive Frames landing page**, driving traffic back to the dealership
- Dealers can use tile sets as a **loyalty/rewards program** — come in for service, earn a new seasonal tile set for your frame

### Dealer Program Architecture

```typescript
interface DealerAccount {
  id: string;
  dealershipName: string;          // "Napleton's Mid Rivers Chrysler"
  slug: string;                    // URL-safe name
  logo: string;                    // Logo artwork URL
  brandColors: {
    primary: string;
    secondary: string;
  };
  customBottomBarText: string;     // Default text for their frames: "NAPLETON'S MID RIVERS"
  customTileSet?: TileSet;         // Dealer-branded tile set (their logo, mascot, etc.)
  qrUrl: string;                   // QR links to: festiveframes.com/dealer/{slug}
  loyaltyProgram?: DealerLoyaltyConfig;
  tier: "basic" | "premium" | "enterprise";  // Pricing tiers
}

interface DealerLoyaltyConfig {
  enabled: boolean;
  rewardTriggers: RewardTrigger[];
  rewardSets: string[];            // Set IDs unlocked via loyalty program
}

interface RewardTrigger {
  action: "vehicle_purchase" | "service_visit" | "referral" | "review" | "anniversary";
  reward: {
    type: "tile_set" | "free_frame" | "upgrade" | "custom_tile";
    setId?: string;                // Which set they unlock
    description: string;           // "Free Holiday Set with your next oil change!"
  };
}
```

### Dealer Dashboard (Separate from Consumer App)

Dealers get a simple admin panel:

- **Branding config**: Upload logo, set brand colors, set default bottom bar text
- **Loyalty management**: Define reward triggers, see which customers have earned rewards, push new seasonal rewards
- **Frame tracker**: See how many co-branded frames are active (proxy for brand impressions)
- **QR analytics**: How many scans their dealer QR code gets (people in parking lots scanning frames with the dealer's name)
- **Bulk ordering**: Order frames pre-configured with their branding for lot inventory
- **Customer list**: Customers who purchased via their dealer page, opted into loyalty program

### Dealer QR Flow

When someone scans a dealer-branded frame:

```
1. Scan QR on a frame that says "NAPLETON'S MID RIVERS" on the bottom bar
   ↓
2. Lands on festiveframes.com/dealer/napletons-mid-rivers
   ↓
3. Page shows: Dealer-branded landing with their logo, current promotions
   ↓
4. "Get yours from Napleton's" CTA → designer pre-loaded with dealer branding
   ↓
5. "Already a Napleton's customer? Claim your reward tiles" → loyalty check
```

### Dealer Set Distribution

- Dealer-branded tile sets are **private** — only available to that dealer's customers
- When a customer buys a car, the dealer grants them the base dealer set + any promotional seasonal sets
- Customers can still buy public sets (4th of July, Christmas, etc.) on top of their dealer set
- This creates a hybrid model: dealer provides the frame + base set, consumer buys additional seasonal sets

### What to Build Now vs. Later

**Now (architect for):**
- `DealerAccount` model in the database
- `dealershipSetIds` in user tile access
- QR code URL supporting `/dealer/{slug}` routes
- Bottom bar text supporting a "locked" dealer mode (dealer sets the text, customer can't change it — or can override with their own frame purchase)

**Later (don't build yet):**
- Full dealer dashboard UI
- Loyalty program trigger system
- Bulk ordering interface
- Dealer analytics dashboard

---

## Community Gallery (Phase 2 — Do Not Build at Launch)

The gallery becomes valuable once there are hundreds of public designs. At launch, a gallery with 12 designs looks dead. Instead, launch with **8–10 curated preset designs** that showcase what's possible and let the QR → designer viral loop build the user base.

When ready to build:

- **Feed of public designs** — card grid, each card shows frame preview + design name + heart count
- **Filtering**: By set, by category, by trending, by newest
- **"Fork This Design"** — copies the design into your designer (prompts to buy missing sets)
- **Trending algorithm**: hearts × recency × forks. Boost designs that use newly dropped sets
- **"Spotted in the Wild"** (Phase 3): Users upload photos of Festive Frames on actual cars. Tag the original designer. Creates UGC social proof

### What to Build at Launch Instead

- A "Featured Designs" carousel on the homepage showing the 8–10 curated presets
- Every preset is one-click "Use this design" → opens designer with it pre-loaded
- These presets do the work of a gallery until there's enough user content to fill one

---

## Gifting

Festive Frames are inherently giftable. Someone designs a frame for their dad for Father's Day, their friend who just had a baby, their buddy whose team won. The gifting flow is a significant revenue channel.

### Gift Flow

```
1. User designs a frame (or picks a preset)
   ↓
2. Clicks "Send as Gift" instead of "Order for Myself"
   ↓
3. Enters recipient's name + shipping address (or email for a digital gift card)
   ↓
4. Optional: Add a gift message (printed on a card included in the box)
   ↓
5. Checkout. Frame ships directly to recipient
   ↓
6. Recipient gets the frame + a card: "This was designed for you by [Sender].
   Customize it or design your own at festiveframes.com"
   ↓
→ Recipient enters the viral loop
```

### Gift Cards (Digital)

- "Give a Festive Frame" digital gift card: recipient gets a code worth $X toward a frame + set
- Gift card landing page lets recipient enter the designer with their credit pre-loaded
- Gift cards are great for people who want to give the gift but let the recipient choose their own design

### What to Build Now

Just add a "Ship to a different address" option on checkout and a gift message field. The full gifting UI (dedicated gift flow, digital gift cards, recipient notifications) is Phase 2.

---

## Subscription Model (Phase 2)

A **seasonal tile set subscription** solves the "how do I get people to come back" problem and creates predictable recurring revenue.

### Concept

- Subscribe once → automatically receive a new tile set before each major holiday
- Tiers: **Quarterly** (4 sets/year: July 4th, Halloween, Christmas, Valentine's) or **Monthly** (12 sets/year covering minor holidays and evergreen themes)
- Subscribers get sets at a discount vs. individual purchase + early access before public drop
- Physical tiles ship automatically; digital set unlocks in the designer immediately

### What to Build Now

Nothing — just make sure the set delivery system can handle "auto-unlock set for user on date X" as a future feature. The Stripe subscription billing can be added when the product-market fit is proven.

---

## Additional Market Opportunities

Beyond the core consumer and dealership channels, these markets represent significant expansion potential. The architecture should not block any of these — they all use the same frame + rail + tile system with different set themes and distribution channels.

### Group Sales (High Priority — Build Early)

The single biggest revenue multiplier. One organizer = 10–50 orders.

- **Youth sports teams**: Soccer moms, baseball dads. Team colors, team name on bottom bar. One team parent organizes, entire team orders. This is a word-of-mouth wildfire channel
- **Wedding parties**: Matching "Just Married" frames for bride and groom, or themed frames for the whole wedding party. Wedding planners become a referral channel
- **Car clubs / car meets**: Car enthusiasts already spend money decorating vehicles. Sponsor a local Cars & Coffee, hand out sample frames. Club-branded sets
- **Corporate fleets**: Company branding on work vehicles. Same model as dealership but for plumbers, electricians, delivery services — anyone with a vehicle fleet

**What to build**: A "Group Order" flow where one person designs the frame, then generates a shareable order link where others can purchase the same design (or customize their own variant). Quantity discounts: buy 5+ get 15% off, 10+ get 25% off. Even a simple Stripe coupon code works for MVP.

### Service Industry Professionals

Same model as dealerships but for individual professionals who use their car as a billboard:

- **Real estate agents**: Name, phone number, brokerage on the bottom bar. Branded tile set. Give one to every buyer at closing — rolling billboard
- **Insurance agents, mortgage brokers, financial advisors**: Same pattern
- **Mobile service providers**: Dog groomers, tutors, house cleaners, photographers — anyone who drives to clients

**Distribution**: Partner with local business networking groups (BNI, Chamber of Commerce). One demo at a meeting could yield 20 orders.

### Ride-Share Drivers

- **Uber/Lyft drivers**: Every passenger sees the back of the car. Personalized frames improve rider experience and ratings. Drivers already buy accessories for their cars
- **Potential Uber/Lyft partnership**: Co-branded frames as a driver reward program

### Alternative Vehicle Types (Future — Different Physical Dimensions)

The rail + tile system works on any flat surface near a plate. Expansion opportunities:

- **Motorcycle plates**: Smaller frame, fewer slots, but same system. Motorcycle riders are heavy customizers
- **Golf carts**: HUGE market in retirement communities, beach towns, resort areas. Different plate dimensions but identical snap-on concept
- **Boats**: Registration number frames. Boaters are another spend-happy customization market
- **Trailers / RVs**: Large frames, more surface area, big design potential

**Architecture note**: The frame config system already supports variable dimensions. Adding a "motorcycle" or "golf cart" frame variant is a new config, not a new codebase.

### Cause Marketing & Charity

- Partner with charities: "Pink Ribbon" breast cancer awareness set, "Yellow Ribbon" military support set
- Portion of proceeds donated. Creates feel-good purchasing and organic social sharing
- Charities promote it to their networks — free distribution channel

### Licensing Considerations

**Important legal note on sports teams**: NFL, NCAA, MLB, NHL, NBA logos and team names are all trademarked. You cannot sell a "Kansas City Chiefs" tile set without a licensing agreement.

**The workaround** (how every unlicensed merch vendor operates): Sell colors and abstract symbols without team names or logos. A red and gold tile set with arrowhead shapes isn't "Kansas City Chiefs" — it's "Red & Gold Kingdom." Fans understand. This is legally defensible as long as you never use the team name, logo, or official marks.

**Long-term**: Actual licensing deals with sports leagues would be transformative but require significant volume to justify. Start with the wink-wink color approach. Once you have traction, approach league licensing departments with sales data.

### State Legality

License plate frame modifications are legal in all 50 states with one universal rule: **the frame cannot obscure the plate number, state name, or registration stickers.** The Festive Frames design inherently complies — tiles go on the BORDER of the frame, outside the plate viewing area. 

Build a simple "Is this legal?" FAQ page that states this clearly. Some states have specific dimension restrictions on how far a frame can extend — relevant for the wings feature. Research this before wings ship.

---

## Set Drops & Notifications

Start simple. The drop system at launch is an **email list**. The fancy countdown pages and push notifications come later when there's an audience that cares.

### Launch (Phase 1): Email List

- **Email capture at every touchpoint**: QR scan landing, after 30 seconds in the designer, after designing but before purchasing, homepage footer, post-purchase confirmation
- Use **Beehiiv, ConvertKit, or Resend** for the email list — not a custom-built system
- When a new set drops, send an email blast: "🎆 New set just dropped: [Set Name]. Design yours →" with a direct link to the designer with the new set pre-selected
- Segment the list: purchasers vs. browsers, which sets they own, which categories they've shown interest in

### Phase 2: Drop Culture

Once you have 1,000+ email subscribers, build the full drop experience:

- **Upcoming drops** section on homepage with countdown timer
- **"Notify me"** button on teased sets (feeds the email list)
- **Limited-time pricing**: First 48 hours after drop, 20% off. Creates urgency
- **Set drop landing page**: `festiveframes.com/drops/{set-slug}` — hero image, countdown, tile preview grid, preset designs, "Get notified" CTA
- **SMS opt-in**: For the most engaged users who want instant drop alerts

### Seasonal Auto-Promotion

- Sets with `seasonal` config automatically get homepage placement as their window approaches
- 4th of July set gets homepage takeover starting June 15
- Christmas set starts appearing November 1
- The designer UI theme shifts to match the current seasonal set

### Implementation (for the data model — build the UI later)

```typescript
interface DropConfig {
  countdownEnabled: boolean;
  dropDate: string;                // ISO datetime — when set becomes purchasable
  previewDate: string;             // When set becomes visible (teaser) but not yet buyable
  earlyAccessPrice?: number;       // Discount price for first N hours
  earlyAccessDuration?: string;    // ISO duration: "PT48H" = 48 hours
  notifySubscribers: boolean;      // Send email blast on drop
  landingPageEnabled: boolean;     // Generate /drops/{slug} page
}
```

---

## Production Pipeline

Be honest about scale: at launch, you're assembling frames by hand. The system's job is to generate clean production artifacts so assembly is fast and error-free. Don't build a production management system — build a good PDF export.

### What the System Generates Per Order

When an order is confirmed, the app generates a single **Production PDF** containing:

1. **Design rendering** — full-color visual of the completed frame exactly as the customer designed it
2. **Tile map** — numbered diagram showing which tile goes in which slot position. Each tile labeled with its piece ID and set name
3. **Sticker inventory** — list of all unique stickers needed with quantities. Grouped by set. This is your pick list
4. **Sticker print layout** — all sticker artworks arranged on a print sheet with die-cut lines, registration marks, and bleed. Ready to send to a sticker printer or print on a die-cut machine
5. **Bottom bar spec** — exact text, font name, font size, colors, alignment. What gets printed/engraved on the text bar
6. **QR code** — the exact QR image at print-ready resolution, with the URL (`festiveframes.com/d/{designId}` or `festiveframes.com/dealer/{slug}`)
7. **Shipping label info** — customer name + address

### MVP Production Workflow

```
1. Order comes in → system auto-generates Production PDF
   ↓
2. You open the PDF, print the sticker sheet on your die-cut printer
   ↓
3. Cut stickers, grab the right tile bases (pick list tells you how many of each color)
   ↓
4. Apply stickers to tiles following the tile map
   ↓
5. Snap tiles onto frame rail to verify the design matches the rendering
   ↓
6. Print/engrave bottom bar text, attach QR code
   ↓
7. Package + ship. Update order status manually (or via a simple admin toggle)
```

### What to Automate (When Volume Justifies It)

- **Sticker printer queue**: Auto-send print layouts to a networked printer/cutter
- **Order status tracking**: Webhook-based status updates pushed to customer email
- **Batch production**: Group orders that share the same sticker designs onto combined print sheets (saves material)
- **Assembly guide video**: Auto-generated step-by-step GIF/video showing tile placement order

### Data Model (Keep It Simple)

```typescript
interface ProductionOrder {
  id: string;
  orderId: string;
  designSnapshot: FrameDesign;     // Immutable copy — design changes after purchase don't affect order
  productionPdfUrl: string;        // The generated PDF with everything needed to build this frame
  status: "pending" | "in_progress" | "shipped";
  trackingNumber?: string;
  shippingAddress: ShippingAddress;
  notes?: string;                  // Manual notes from assembler
  createdAt: string;
  shippedAt?: string;
}
```

### Production Insight for Customers

The number of **unique tile types** in a design affects production time. Designs with 3 unique tiles are faster than designs with 12. Consider surfacing this in the designer as a subtle indicator: "⚡ Quick Ship — this design uses only 4 unique tiles" vs. showing a slightly longer estimate for complex designs. This also nudges customers toward simpler (cheaper to produce) designs without restricting creativity.

---

## Export & Sharing

### Design Export

- **PNG screenshot** of the frame design (for social sharing) — includes Festive Frames watermark and QR code
- **JSON export** of the design config (for re-importing)
- **Print-ready PDF** showing the frame with tile placement guide and QR code position (for production reference)
- **Share link** — public URL at `festiveframes.com/d/{designId}` showing a read-only view of the design with "Design yours" CTA
- **Social share cards** — auto-generated Open Graph image so the design looks great when shared on Facebook/Instagram/X

### Order Flow

When user clicks "Order This Design":
1. Validate all used tile sets are owned (purchased, dealer-granted, or free)
2. Show order summary: frame + sets needed + any add-ons (wings, extra tiles)
3. Show production estimate: "Your design uses X unique tiles — estimated delivery: Y days"
4. Capture the design config as an **immutable production snapshot** (design changes after purchase don't affect the order)
5. Route to Stripe checkout
6. After purchase: design saved, production artifacts generated (see Production Pipeline), order status tracking begins
7. Customer receives email with order confirmation + link to track status
8. Status updates pushed as production progresses: Printing → Cutting → Assembling → Shipped

---

## Responsive Design

- **Desktop** (>1024px): Side-by-side layout — palette left, frame right
- **Tablet** (768–1024px): Palette collapses to bottom drawer, frame fills width
- **Mobile** (<768px): Full-screen frame with floating palette button, bottom sheet for tile selection and text editing

The frame canvas should scale proportionally to fit available width while maintaining the 13.5:6.5 aspect ratio.

---

## Performance Requirements

- Frame canvas re-renders must be <16ms (60fps during drag)
- Tile artwork lazy-loaded with blur-up placeholder
- Design auto-saved to localStorage every 5 seconds
- Design synced to server on explicit save
- Total bundle size target: <500KB gzipped

---

## Design System Notes

- **Festive Frames branding**: Logo in header, "Festive Frames" wordmark on exports, QR code on frame preview. The brand identity should feel celebratory, bold, and accessible — not luxury, not cheap. Think party store meets car culture.
- The app UI should theme itself to match the active tile set's color palette
- Dark mode by default (the frame looks best against dark backgrounds)
- The frame area should feel like a workbench — subtle texture, good contrast
- Tile pieces should have micro-shadows and a slight 3D feel (they're physical objects)
- Rail slots should show a visible groove/track to reinforce the snap-on concept
- Animations: tiles should "snap" into place with a subtle spring animation
- Sound effects (optional, toggleable): soft click when placing tiles

---

## API Endpoints

```
# TILE SETS
GET    /api/sets                    — List all available tile sets (filterable by category, seasonal)
GET    /api/sets/:slug              — Get set details + all pieces
GET    /api/sets/:slug/presets      — Get presets for a set
GET    /api/sets/drops              — Upcoming and recent set drops with countdown info

# DESIGNS
POST   /api/designs                 — Save a new design
PUT    /api/designs/:id             — Update a design
GET    /api/designs/:id             — Load a design (also serves as public share page data)
GET    /api/designs                 — List user's saved designs
POST   /api/designs/:id/export      — Generate export (PNG/PDF) with QR code and branding
POST   /api/designs/:id/fork        — Fork a public design into your account
GET    /api/designs/:id/qr          — Generate QR code image for a design

# GALLERY
GET    /api/gallery                 — Public design feed (paginated, filterable, sortable)
GET    /api/gallery/trending        — Trending designs (algorithmically ranked)
POST   /api/gallery/:designId/heart — Heart a design (toggle)
GET    /api/gallery/search          — Search public designs by name, text, set, tags

# ORDERS & PRODUCTION
POST   /api/orders                  — Create order from design
GET    /api/orders/:id              — Order status + tracking
GET    /api/orders/:id/production   — Production artifacts (print sheet, pick list, assembly guide)

# USER
GET    /api/user/sets               — List user's purchased/unlocked sets (owned + dealer + gifted)
GET    /api/user/profile            — User profile + badges + stats
PUT    /api/user/profile            — Update username, avatar
GET    /api/user/notifications      — Notification preferences
PUT    /api/user/notifications      — Update drop notification preferences

# DEALER (B2B)
GET    /api/dealer/:slug            — Dealer public landing page data
GET    /api/dealer/:slug/sets       — Dealer's branded tile sets
POST   /api/dealer/loyalty/claim    — Customer claims a loyalty reward
GET    /api/dealer/admin/stats      — Dealer dashboard: QR scans, frame count, customer list
POST   /api/dealer/admin/reward     — Grant reward to a customer

# PUBLIC PAGES (server-rendered for SEO + Open Graph)
GET    /d/:designId                 — Public share page: design view + "Design yours" CTA
GET    /dealer/:slug                — Dealer landing page
GET    /drops/:setSlug              — Set drop landing page with countdown
GET    /gallery                     — Community gallery browsable page
```

---

## Key Implementation Notes

1. **Slot IDs are namespaced and dynamic**: Use a format like `frame:top-0` through `frame:top-9`, `frame:left-0` through `frame:left-2`, `frame:right-0` through `frame:right-2`. Generate slot lists from a frame config — do NOT hardcode them. The bottom is a separate text system. Wings (future) will add `wing-left:*` and `wing-right:*` slots.

2. **The bottom text bar is NOT the same as tile slots**. It's a text rendering system. Don't try to make it use the same slot/tile system. It takes a string and renders it in a chosen font on the bar. The QR code sits in the bottom-right corner of this bar.

3. **Tile artwork should be square PNGs with transparent backgrounds** so they composite cleanly onto any frame color.

4. **The JSON set config is the source of truth**. The database stores metadata and purchase records, but the actual set definition (pieces, presets, colors) lives in versioned JSON configs that can be deployed independently. This is critical for rapid-response sets (championship winners, trending events).

5. **Design state is a flat Record<string, PlacedTile>** — don't over-engineer this with nested structures. Slot IDs as keys, tile references as values. The `zone` field on PlacedTile tells us which physical piece the tile belongs to.

6. **For the MVP, emoji placeholders are fine for tile artwork**. Real sticker artwork will be designed separately and swapped in via the artwork URLs. Build the system so tiles render from URLs, but fall back to emoji/colored squares during development.

7. **The rail/LEGO snap concept is purely visual in the app** — show rail grooves and tile nubs in the UI to communicate the physical product, but the interaction is standard drag-and-drop.

8. **Mobile-first drag-and-drop is tricky** — use `@dnd-kit` which handles touch well, and supplement with click-to-paint as the primary mobile workflow.

9. **Frame canvas width must be flexible** — today it's 13.5" proportional. When wings ship, it grows wider. Use a config-driven width, not a hardcoded aspect ratio. The canvas component should accept `frameConfig` and calculate dimensions accordingly.

10. **QR code is always present** on exports and physical product. Use `qrcode` package to render SVG. Default URL: `https://festiveframes.com`. Personalized URL when design is saved: `https://festiveframes.com/d/{designId}`.

11. **Brand it Festive Frames everywhere** — logo in header, watermark on exports, QR code on frame preview, and the share link domain is festiveframes.com.

12. **Cross-set mixing is allowed and encouraged.** Users can put tiles from any owned set on the same frame. The palette shows all owned sets in tabs. Unowned tiles appear locked with inline purchase prompts. This drives multi-set purchases.

13. **The free "Essentials" set ships with every frame.** Solid colors + basic shapes. No user should ever have a frame with zero tiles. This is the gateway drug.

14. **The share page at `/d/{designId}` is the most important page in the app.** It's the viral loop landing. Invest heavily in its design, load speed, and conversion. Server-render it for SEO and Open Graph support.

15. **Production artifacts are generated programmatically.** Even if assembly is manual at first, the system should output sticker print sheets (PDF), tile pick lists, and assembly guide diagrams. This is the path to scale.

16. **Dealer program data models should exist from day one** even if the dealer dashboard UI is deferred. Having `DealerAccount` and `dealershipSetIds` in the schema means we can onboard dealers manually while building the self-serve tooling.

---

## Analytics & Tracking

Track everything that drives the viral loop and informs set creation decisions.

### Key Metrics

- **QR scans**: By design, by dealer, by geography, by time. This is the #1 growth metric — it means frames are on cars and people are curious enough to scan
- **Share page → Designer conversion**: What % of share page visitors enter the designer?
- **Designer → Purchase conversion**: What % of designers complete an order?
- **Set popularity**: Purchases, gallery usage, hearts. Informs which categories to invest in next
- **Gallery engagement**: Views, hearts, forks. Which design styles resonate?
- **Time-to-design**: How long from entering designer to completing a design? If too long, UX needs simplification
- **Set drop performance**: Notifications sent → page visits → purchases within first 48 hours
- **Dealer metrics**: QR scans per dealer, loyalty redemptions, customer retention

### Event Tracking (Frontend)

```typescript
type AnalyticsEvent =
  | { event: "qr_scan"; designId: string; dealerId?: string }
  | { event: "share_page_view"; designId: string; source: "qr" | "link" | "social" }
  | { event: "designer_opened"; source: "direct" | "share_page" | "gallery_fork" | "dealer" }
  | { event: "tile_placed"; setId: string; slotId: string }
  | { event: "design_saved"; designId: string; setIds: string[]; tileCount: number }
  | { event: "design_shared"; designId: string; platform: "link" | "instagram" | "facebook" | "x" | "imessage" }
  | { event: "set_purchased"; setId: string; source: "palette_upsell" | "store" | "drop_page" | "dealer" }
  | { event: "order_completed"; orderId: string; totalCents: number; setCount: number }
  | { event: "gallery_heart"; designId: string }
  | { event: "gallery_fork"; designId: string }
  | { event: "drop_notify_subscribe"; setId: string }
  | { event: "dealer_loyalty_claim"; dealerId: string; rewardType: string };
```

---

## Client Acquisition Strategy

### Launch Channel: TikTok / Instagram Reels / YouTube Shorts (Organic)

This is channel #1 and it's free. The product is inherently visual and satisfying to watch being assembled. Content strategy:

- **Assembly videos**: Film every frame build. Close-up of tiles snapping onto the rail, ASMR audio of the click, time-lapse of bare frame → fully decorated. These are 15–30 second videos that perform well in short-form algorithms
- **Before/after reveals**: Bare car → frame installed. Show the transformation
- **Designer screen recordings**: Speed-run designing a frame in the app. Shows how easy and fun it is
- **Seasonal hooks**: "Get ready for the 4th! 🇺🇸" posted 2–3 weeks before the holiday. Algorithm favors timely content
- **Post every customer photo/video**: Repost with permission. UGC is more trusted than brand content
- **Engagement bait**: "Which design would you put on YOUR car? A or B?" with two frame options

Target: Post 3–5 times/week across TikTok + Instagram Reels. The goal isn't going viral once — it's consistent posting until the algorithm picks one up.

### Week 1–4: Friends, Family, and Local (Seeding)

- Get 20–30 frames on real cars in your local area. These are your first QR code billboards
- Gift frames to friends, family, coworkers. Film their reactions for content
- Hit up local car meets (Cars & Coffee, etc.) — bring sample frames, hand out business cards with QR codes
- Post in local Facebook groups, Nextdoor, neighborhood apps

### Month 2–3: Event-Driven Spikes

- **Pre-holiday push**: Facebook/Instagram ads targeting "[holiday] party supplies" and "[holiday] car accessories" 3 weeks before major holidays. Modest budget ($10–20/day), test creative
- **Championship moments**: When a team wins big, immediately post content: "Your team just won — put it on your car" with the relevant color set. Speed matters here — be first, not best

### Month 3–6: Group Sales Outreach

- **Youth sports**: Find 3 youth sports organizations locally. Offer the team organizer a free frame + set if they bring 10+ orders. One team parent as an evangelist can sell the entire team
- **Wedding planners**: Reach out to 10 local wedding planners. Offer a sample "Just Married" frame. If they recommend it to one couple per month who each orders 2 frames, that's recurring revenue
- **Car clubs**: Find local car clubs on Facebook/Instagram. Sponsor a meetup — provide frames as prizes or door prizes

### Month 6+: Dealership B2B Outreach

- **Start with ONE dealership** you have a personal connection to. Offer a pilot program: 50 co-branded frames for their next 50 sales, at cost. Track how many customers keep the frame on (vs. the 90% who throw away plastic frames)
- **Build the case study**: After 3 months, measure: How many QR scans? How many customers visited the dealer page? How many booked service appointments?
- **Pitch dealer groups**: Take the case study to regional dealer groups (not individual stores — go to the group level). AutoNation, Hendrick, Lithia, Penske. One group deal = hundreds or thousands of frames/month
- **Car dealer trade shows**: NADA Show (National Automobile Dealers Association) is the big one. Table presence with demo frames

### Ongoing: Email + Retargeting

- Email list is your owned channel — not dependent on social media algorithms
- Segment aggressively: past purchasers get "new set dropped" emails, browsers get "finish your design" nudges, QR scanners get "welcome to Festive Frames" onboarding
- Retargeting ads (Facebook/Instagram pixel, Google Ads) for people who visited the designer but didn't purchase. These are warm leads — they already played with the product

---

### Phase 1: MVP (Launch with 4th of July)
Ship these. Nothing else. Every feature not on this list is a distraction.

1. **Designer core**: Frame canvas, tile palette, drag-and-drop + click-to-paint, bottom text bar, QR code on frame
2. **4th of July set**: Full set config + 8–10 curated preset designs. Emoji placeholders for dev, real artwork swap for launch
3. **Free Essentials set**: Solid color tiles + basic shapes. Ships with every frame purchase
4. **QR → Designer viral loop**: `festiveframes.com/d/{designId}` loads the designer in preview mode with that design. "Make Your Own" drops into edit mode. Server-rendered for speed + OG tags for social sharing
5. **PNG export**: With Festive Frames branding and QR code. Share card optimized for social platforms
6. **Email capture**: Inline prompts in the designer (after 30s, before save) + homepage. Use Beehiiv/ConvertKit — not custom
7. **Basic purchase flow**: Stripe checkout → Production PDF auto-generated → you assemble by hand
8. **Mobile-responsive designer**: Click-to-paint as primary mobile workflow. Must work flawlessly on iPhone Safari — that's where QR scans land
9. **"Ship to different address" + gift message**: Minimal gifting support

### Phase 2: Growth (After Launch, With Traction)
These amplify the viral loop once you have real customers and real frames on cars.

10. **Set #2 drop** (Christmas or back-to-school, depending on timing) — proves the set deployment pipeline works
11. **Cross-set mixing UX**: Multi-set palette tabs with inline purchase prompts for locked tiles
12. **Social share cards**: Auto-generated OG images in multiple aspect ratios (story, square, landscape)
13. **Email drop announcements**: Segmented blasts when new sets go live
14. **Referral program**: Share link → $5 off for both parties
15. **Group order flow**: One person designs, generates a shareable purchase link. Quantity discounts
16. **Community gallery**: Public design feed, hearts, fork-a-design. Only launch when you have 100+ designs
17. **Digital gift cards**: "Give a Festive Frame" with credit code

### Phase 3: B2B (Dealer + Professional Launch)
Once consumer traction proves the concept, bring in recurring B2B revenue.

18. **Dealer data model + manual onboarding**: Branded bottom bar text, dealer QR URL, dealer-exclusive tile set
19. **Dealer landing pages** (`/dealer/{slug}`): Co-branded with loyalty CTA
20. **Loyalty reward system**: Service visit → unlock seasonal set
21. **Real estate agent / service professional program**: Same model as dealer, individual scale
22. **Dealer dashboard**: QR analytics, customer list, bulk ordering
23. **Youth sports team group sales**: Dedicated flow with team customization

### Phase 4: Scale & Expand
24. **Subscription model**: Quarterly seasonal tile set auto-ship
25. **Drop culture**: Countdown timers, landing pages, limited-time pricing, SMS notifications
26. **Production pipeline automation**: Batch printing, order status webhooks, automated tracking
27. **Wings**: Physical product engineering + designer UI extension
28. **Alternative vehicle sizes**: Motorcycle, golf cart, boat frame configs
29. **Custom upload set**: User-provided sticker artwork on standard tile bases
30. **Spotted in the Wild**: UGC photo uploads + social proof gallery
31. **Sports licensing deals**: Approach leagues with sales data to negotiate official licensing

### What NOT to Build

- A native app. The mobile web designer is sufficient. Revisit only if push notifications become critical and email/SMS aren't enough
- A dealer dashboard before you have 3+ dealers. Onboard the first few manually
- A full CMS/admin panel. Use the database directly + a simple internal tool (Retool, Appsmith) until volume demands it
- Anything involving AI-generated designs. The human creativity in the designer IS the product
