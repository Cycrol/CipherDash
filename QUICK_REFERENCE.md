# 🔐 CipherDash Geometric Cipher - Quick Reference Card

## 🎮 CONTROLS

| Action | Method | Effect |
|--------|--------|--------|
| **Add Vertex** | Click canvas | New control point |
| **Move Vertex** | Drag vertex | Adjust position |
| **Delete Vertex** | Right-click vertex | Remove specific point |
| **Clear Canvas** | Right-click empty | Remove last vertex |
| **Clear All** | Clear button | Reset everything |
| **Add Cipher** | Add button | Create PolygonNode |

---

## ✅ VALIDATION RULES

Must satisfy ALL of these:

```
✓ Minimum 3 vertices
✓ Maximum 12 vertices
✓ Each vertex > 15px from others
✓ Total area ≥ 100px²
✗ No self-intersecting edges
```

**Status:** Green border = valid, Red border = invalid

---

## 📊 ANALYSIS SHOWN

When polygon is valid, you see:

```
Sides:        N (3-12)
Shape:        Convex ✓ or Concave ✗
Irregularity: 0.0-10+ (variance)
Area:         ~pixels²
Avg Side:     ~pixels

Security Impact:
✓ Convex → adds multiply transform
⚠ Concave → shift only
• N-gon shifts by (N mod 26)
```

---

## 🔐 ENCRYPTION FORMULA

### Stage 1: Shift
```
key = number_of_sides mod 26
For each letter:
  new_position = (old_position + key) mod 26
```

### Stage 2: Multiply (Convex Only)
```
key = derived from variance
      chosen from {1,3,5,7,9,11,15,17,19,21,23,25}
For each letter:
  new_position = (key * old_position) mod 26
```

---

## 📈 STRENGTH FACTORS

| Factor | Good | Bad |
|--------|------|-----|
| **Sides** | 6-12 | 3-4 |
| **Shape** | Convex | Concave |
| **Variance** | 0.5-3.0 | 0 or >8 |
| **Area** | >500 | 100-200 |

---

## 🎯 EXAMPLE SHAPES

### Regular Pentagon
```
★ ✓ 5 sides
★ ✓ Convex
★ ✓ Variance ~0
→ Strong cipher
```

### Irregular Hexagon
```
★ ✓ 6 sides
★ ✓ Convex
★ ⚠ Variance >3
→ Unpredictable
```

### Concave Bowtie
```
★ ✓ 4 sides
★ ✗ Concave
★ ⚠ No multiply
→ Weak cipher
```

---

## 💡 STRATEGY TIPS

1. **Want strong cipher?** Make it convex (enables 2 stages)
2. **Want unpredictable?** Make sides very different lengths
3. **Want regular?** Try equilateral triangle or square
4. **Want complex?** Use 8-12 sided polygon
5. **Want multiple nodes?** Create several polygons and chain them

---

## 🧪 QUICK TESTS

### Can I make 2 vertices?
No → Minimum 3 required

### Can I make 15 vertices?
No → Maximum 12 vertices

### Can I make vertices 5px apart?
No → Minimum 15px spacing

### Can I make tiny polygon?
No → Minimum 100px² area

### What if I make concave shape?
Works but no multiply stage (weaker)

### Can I mix convex + concave?
No → Either fully convex or fully concave

---

## 📐 GEOMETRY GLOSSARY

| Term | Meaning | Impact |
|------|---------|--------|
| **Convex** | All angles < 180° | Enables extra transform |
| **Concave** | Some angles > 180° | Single transform only |
| **Variance** | Spread of side lengths | Affects key derivation |
| **n-gon** | Polygon with n sides | Determines shift amount |
| **Area** | Interior square pixels | Must be ≥ 100px² |

---

## 🎓 LEARNING PROGRESSION

### Level 1: Basic Shapes
- Make triangle
- Make square
- Make pentagon
- Learn: sides matter

### Level 2: Convexity
- Make convex hexagon
- Make concave hexagon
- Compare ciphers
- Learn: shape type matters

### Level 3: Irregularity
- Make regular pentagon
- Make irregular pentagon
- Compare analysis
- Learn: variance matters

### Level 4: Composition
- Make 2-3 polygon nodes
- Chain with shift/multiply nodes
- Test against attacks
- Learn: order matters

---

## 🔍 DEBUGGING

**Polygon won't validate?**
- Is it 3-12 vertices? ✓
- Are vertices > 15px apart? ✓
- Is area ≥ 100px²? ✓
- Check red error message

**Ciphertext looks weak?**
- Is polygon convex? (red = no 2nd stage)
- Is variance too high? (>8 = unpredictable)
- Try more sides? (more = stronger key space)

**Canvas not responding?**
- Click within canvas area ✓
- Try dragging from vertex ✓
- Right-click to delete ✓
- Clear button at bottom ✓

---

## 🚀 GAME FLOW

```
1. Load game page
2. Scroll to "Geometric Cipher Constructor"
3. Click on canvas → add vertices
4. Drag vertices → adjust shape
5. Watch analysis panel → shows properties
6. When valid (green) → click "Add to Pipeline"
7. Canvas clears → ready for next polygon
8. Pipeline shows all nodes
9. Click "Transmit Signal" → evaluate
10. Score breakdown shows cipher strength
```

---

## 💻 DEVELOPER REFERENCE

```javascript
// Create node from vertices
const vertices = [{x, y}, {x, y}, ...];
const node = new PolygonNode(vertices);

// Get description
node.describe()
// "Polygon Cipher (5-gon, Convex, variance: 2.5)"

// Get analysis
node.analyzeGeometry()
// {sides: 5, convex: true, variance: "2.50", ...}

// Apply cipher
node.apply("PLAINTEXT")
// Returns encrypted text

// Check if convex
isConvex(vertices)  // true/false

// Get area
polygonArea(vertices)  // numeric value

// Validate
validatePolygon(vertices)
// {valid: true/false, error: "", sides: N}
```

---

## 🎨 UI COLORS

| Color | Meaning |
|-------|---------|
| **Green** (#00ff88) | Valid, good |
| **Red** (#ff0055) | Invalid, bad |
| **Cyan** (#00d4ff) | Info, edges |
| **Yellow** | Active vertex |
| **Black** | Canvas background |

---

## ⚡ TIPS & TRICKS

1. **Make perfectly regular shape** → ctrl+click? (no, use grid)
2. **How to make exact triangle** → estimate equal sides
3. **Best convex shape** → smooth, no sharp turns inward
4. **Most irregular shape** → long sides + short sides mixed
5. **Fastest to draw** → 3 vertices (triangle)
6. **Most complex shape** → 12 vertices (maximum)

---

## 🎯 CIPHER STRENGTH RANKING

```
S Tier:  Regular hexagon (convex, variance ~0)
A Tier:  Regular pentagon (convex, variance ~0)
B Tier:  Irregular convex shapes (convex, variance 2-4)
C Tier:  Regular concave shapes (concave, variance low)
D Tier:  Irregular concave (concave, variance high)
F Tier:  Tiny shapes (area <200, hard to manage)
```

---

## 🔗 RELATED CONCEPTS

- **Caesar Cipher** ← Shift stage uses this
- **Affine Cipher** ← Multiply stage uses this
- **Composition** ← Multiple nodes together
- **Diffusion** ← Convex provides more
- **Key Space** ← Variance + sides determine
- **Convex Hull** ← Related geometric concept

---

**Master the polygons, strengthen the cipher! 🔐**
