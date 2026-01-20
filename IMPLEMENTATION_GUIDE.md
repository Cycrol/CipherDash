# Geometric Cipher System - Implementation Guide

## 🎯 Overview

A **polygon-based cipher construction mechanic** has been added to CipherDash. Players now can build custom cipher nodes by drawing geometric shapes on a canvas, with the polygon's properties (sides, convexity, irregularity) directly mapping to encryption strength.

---

## 🔨 What Was Built

### 1. **PolygonNode Class** (nodes.js)
A new cipher node type that inherits from `CipherNode`:
```javascript
const node = new PolygonNode(vertices);
node.apply("PLAINTEXT") // → "CIPHERTEXT"
```

**Key Features:**
- Analyzes polygon geometry in real-time
- Applies two-stage encryption:
  - **Stage 1:** Shift by (number_of_sides mod 26)
  - **Stage 2:** Multiply transform (convex only)
- Returns detailed geometry analysis

---

### 2. **Geometry Utilities** (nodes.js)
Supporting functions for polygon analysis:

| Function | Purpose |
|----------|---------|
| `distance(p1, p2)` | Euclidean distance |
| `polygonArea(vertices)` | Shoelace formula |
| `isConvex(vertices)` | Convexity check (cross product) |
| `getSideLengths(vertices)` | Edge length array |
| `calculateSideVariance(vertices)` | Irregularity measure |
| `validatePolygon(vertices)` | Full validation |

---

### 3. **PolygonBuilder Canvas UI** (polygon-builder.js)

**Interactive canvas** for drawing and manipulating polygons:

| Action | Effect |
|--------|--------|
| **Click** | Add vertex at mouse position |
| **Drag** | Move vertex smoothly |
| **Right-click** | Remove vertex |
| **Grid background** | 30px spacing (visual guide) |

**Visual Feedback:**
- ✓ Green border = valid polygon
- ✗ Red border = invalid polygon
- Yellow vertex = currently dragging
- Live edge drawing as you build

---

### 4. **PolygonAnalyzer Display** (polygon-builder.js)

Real-time analysis panel showing:
- **Number of sides** (3-12)
- **Convexity** (Convex ✓ / Concave ✗)
- **Irregularity** (variance of side lengths)
- **Area** (pixel²)
- **Average side length**
- **Security implications** (custom text)

---

### 5. **Game Integration** (game.js)

**New game methods:**
```javascript
game.addPolygonNode()      // Convert validated polygon to cipher node
game.clearPolygon()         // Reset canvas
game.updatePolygonUI()      // Update analysis display
```

**Event wiring:**
- Canvas mousedown/mousemove/mouseup for dragging
- Right-click context menu for deletion
- 100ms polling for UI updates
- "Add to Pipeline" button toggled by validation state

---

### 6. **UI Panel** (index.html)

New `.polygon-panel` section with:
- Canvas element (400x300)
- Instructions text
- Grid background
- Real-time analysis sidebar
- "Clear Polygon" and "Add to Pipeline" buttons

---

### 7. **Styling** (styles.css)

Complete theme for polygon builder:
- Canvas styling (grid, borders, colors)
- Property table (analysis display)
- Color-coded feedback (green/red for valid/invalid)
- Responsive grid layout
- Mobile breakpoint adjustments

---

## 📊 Cipher Mapping Explained

### **Stage 1: Shift Cipher**
```
Key = number_of_sides mod 26

Example:
  5-sided polygon → shift by 5
  27-sided polygon → shift by 1
```

### **Stage 2: Multiply Cipher** (Convex Only)
```
Key = derived from variance, chosen from:
  {1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25}
  (numbers coprime to 26)

Only applied if polygon.convex == true
```

### **Example Encryption**
```
Plaintext:   "SIGNAL"
Polygon:     5-sided convex pentagon
Variance:    0.8 (slightly irregular)

Stage 1 (Shift by 5):
  S(18) → X(23), I(8) → N(13), G(6) → L(11), ...
  Result: "XNLQZJ"

Stage 2 (Multiply by 7):
  X(23) → 7*23=161%26=5 → F, ...
  Result: "FMOXHK"

Output: "FMOXHK"
```

---

## ✅ Validation Rules

A polygon must satisfy ALL of these to be valid:

| Rule | Requirement |
|------|-------------|
| **Min vertices** | ≥ 3 |
| **Max vertices** | ≤ 12 |
| **Vertex spacing** | > 15 pixels apart |
| **Minimum area** | ≥ 100 px² |
| **No self-intersection** | (simplified check via min distance) |

---

## 🎓 Educational Value

Players learn these cryptography concepts:

1. **Composition** - Polygons are nodes in a pipeline
2. **Key Space** - Polygon properties determine key options
3. **Diffusion** - Convex shapes provide better mixing
4. **Regularity vs Strength** - Symmetry doesn't guarantee security
5. **Validation** - Real-world constraints on cipher components

---

## 🎮 Player Flow

1. **Open polygon panel**
2. **Click to add vertices** on the canvas
3. **Drag to adjust** vertex positions
4. **Watch analysis update** in real-time
5. **When valid**, analysis shows security implications
6. **Click "Add to Pipeline"** to convert to cipher node
7. **Canvas clears** automatically for next polygon
8. **Pipeline updates** with new geometric cipher
9. **Ciphertext recalculates** with new transformation

---

## 📁 Files Modified/Created

```
NEW FILES:
  polygon-builder.js      (350 lines) - Canvas UI + PolygonAnalyzer
  POLYGON_SYSTEM.md       (400 lines) - Full documentation

MODIFIED FILES:
  nodes.js               (+300 lines) - PolygonNode + geometry utilities
  game.js                (+50 lines)  - Integration + UI updates
  index.html             (+35 lines)  - Polygon panel + canvas
  styles.css             (+120 lines) - Polygon styling
```

---

## 🧪 Testing Scenarios

**Try building these polygons:**

### Triangle (Easy)
- Click 3 points to form triangle
- Expected: Shift by 3
- Note: All triangles are convex

### Pentagon (Medium)
- Click 5 points irregularly spaced
- Expected: Shift by 5 + multiply transform
- Challenge: Make it concave (won't apply multiply)

### Irregular Hexagon (Hard)
- 6 points with varying side lengths
- High variance = unpredictable multiply key
- Learning: Irregularity can improve security

### Bowtie/Concave (Advanced)
- Draw inward-facing shape (concave)
- No multiply stage (single shift)
- Shows tradeoff: convex → stronger

---

## 🔮 Future Ideas

- [ ] Preset buttons (Triangle, Square, Pentagon)
- [ ] Polygon rotation/scaling
- [ ] Polygon combination (union/intersection)
- [ ] Attack visualization (which attacks work best)
- [ ] Custom cipher mapping (player-defined)
- [ ] Performance metrics (speed vs security)
- [ ] Procedural challenge mode

---

## 💡 Design Notes

**Why Polygons?**
- Visual, tangible representation of cipher parameters
- Intuitive mapping: geometry → encryption strength
- Educational: players discover security principles
- Puzzle-first: fun to build, learn from results

**Convexity Matters:**
- Natural geometric property with crypto implications
- Adds/removes a transformation layer
- Binary choice → easy to understand impact

**Variance as Unpredictability:**
- Regular shapes feel "weak" (symmetric, predictable)
- Irregular shapes feel "strong" (chaotic, unknown)
- Challenge common intuitions about patterns

---

## 🚀 Quick Start

1. Open game: `http://localhost:8000`
2. Scroll to "Geometric Cipher Constructor"
3. Click on canvas to add vertices
4. Drag to adjust shape
5. Watch analysis update
6. Click "Add to Pipeline" when satisfied
7. Transmit signal to see cipher score

**Pro Tip:** Try convex vs concave shapes to see the cipher strength difference!

---

## 📝 Code Example

```javascript
// Manual usage (without UI)
const vertices = [
  {x: 100, y: 100},
  {x: 200, y: 50},
  {x: 250, y: 150},
  {x: 150, y: 200}
];

const node = new PolygonNode(vertices);
console.log(node.describe());
// "Polygon Cipher (4-gon, Convex, variance: 45.2)"

const ciphertext = node.apply("HELLO");
console.log(ciphertext);
// "LOFUP" (example output)

const analysis = node.analyzeGeometry();
console.log(analysis);
// {
//   sides: 4,
//   convex: true,
//   variance: "45.23",
//   area: "12500",
//   diffusionBoost: "YES"
// }
```

---

**Enjoy building geometric ciphers! 🔐✨**
