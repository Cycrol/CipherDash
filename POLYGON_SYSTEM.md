/**
 * GEOMETRIC CIPHER CONSTRUCTION SYSTEM
 * 
 * A puzzle-first mechanic for CipherDash that allows players to build
 * custom cipher nodes using polygon geometry.
 * 
 * FILES ADDED/MODIFIED:
 * - polygon-builder.js (NEW) - Canvas UI and polygon validation
 * - nodes.js (MODIFIED) - Added PolygonNode class and geometry utilities
 * - game.js (MODIFIED) - Integrated polygon builder into game loop
 * - index.html (MODIFIED) - Added polygon builder panel and canvas
 * - styles.css (MODIFIED) - Styled polygon builder UI
 */

// ============================================================================
// GEOMETRY ANALYSIS SYSTEM
// ============================================================================

/**
 * The system analyzes the following polygon properties:
 * 
 * 1. NUMBER OF SIDES (Vertices)
 *    - Range: 3-12 sides
 *    - Constraint: Minimum area of 100px²
 *    - Cipher Impact: n-gon shifts by (n mod 26) positions
 *    - Example: Pentagon (5 sides) → shift by 5
 * 
 * 2. CONVEXITY
 *    - Convex (all interior angles < 180°)
 *    - Concave (at least one reflex angle)
 *    - Cipher Impact: 
 *      * Convex → applies secondary MULTIPLY transform
 *      * Concave → shift only (no secondary diffusion)
 *    - Strategy: Players prefer convex shapes for stronger encryption
 * 
 * 3. SIDE LENGTH VARIANCE
 *    - Measures irregularity (std deviation of side lengths)
 *    - Range: 0 (perfect regular polygon) to high (very irregular)
 *    - Cipher Impact: Higher variance affects MULTIPLY key derivation
 *    - Strategy: Regular polygons provide predictable strength
 *    - Learning: Symmetry ≠ strength in cryptography
 * 
 * 4. AREA
 *    - Minimum: 100px² (prevents tiny, negligible polygons)
 *    - No maximum
 *    - Constraint: Ensures visible, meaningful shapes
 */

// ============================================================================
// CIPHER MAPPING
// ============================================================================

/**
 * A PolygonNode applies two-stage transformation:
 * 
 * STAGE 1: SHIFT CIPHER
 *   - Key = number_of_sides mod 26
 *   - Example: 5-gon → shift by 5
 *   - Example: 27-gon → shift by 1
 * 
 * STAGE 2: MULTIPLY CIPHER (CONVEX ONLY)
 *   - Applied only if polygon is CONVEX
 *   - Key derived from variance (0-12 valid multipliers)
 *   - Valid keys (coprime to 26): {1,3,5,7,9,11,15,17,19,21,23,25}
 *   - More irregular → different multiply key
 * 
 * EXAMPLE FLOW:
 *   Input:     "HELLO"
 *   Polygon:   5-sided convex pentagon, variance=0.5
 *   
 *   Stage 1 (Shift by 5):
 *     H(7) → M(12), E(4) → J(9), L(11) → Q(16), L(11) → Q(16), O(14) → T(19)
 *     Result: "MJQQT"
 *   
 *   Stage 2 (Multiply by derived key, e.g., 7):
 *     M(12) → 7*12=84%26=6→G, etc.
 *     Result: "GKPPR"
 */

// ============================================================================
// SECURITY ANALYSIS
// ============================================================================

/**
 * The PolygonAnalyzer provides feedback on security implications:
 * 
 * SCORING FACTORS:
 * 
 * ✓ CONVEX SHAPES (+Diffusion)
 *   - Adds secondary transformation
 *   - More uniform distribution
 *   - Higher theoretical key space
 * 
 * ⚠ CONCAVE SHAPES (Limited Diffusion)
 *   - Single transformation only
 *   - May be weaker than convex
 *   - Still valid for basic encryption
 * 
 * ✓ REGULAR POLYGONS (Variance < 1)
 *   - Predictable, symmetric strength
 *   - Good for learning
 *   - Reliable diffusion
 * 
 * ⚠ IRREGULAR POLYGONS (Variance > 5)
 *   - Unpredictable but may have weaknesses
 *   - Harder to analyze (good for security)
 *   - May reduce entropy if sides are very different
 * 
 * NUMBER OF SIDES:
 *   - 3-5 sides: Low key space (limited shift values)
 *   - 6-12 sides: Better key space
 *   - Odd vs Even: No special impact (mod 26 is same)
 */

// ============================================================================
// PLAYER MECHANIC (UX)
// ============================================================================

/**
 * POLYGON CONSTRUCTION FLOW:
 * 
 * 1. CLICK on canvas to add vertices
 *    - Each click adds a control point
 *    - Max 12 vertices per polygon
 *    - Vertices snap to grid (30px) visually
 * 
 * 2. DRAG vertices to adjust shape
 *    - Click and drag to move control point
 *    - Live validation as you drag
 *    - Yellow highlight on active vertex
 * 
 * 3. RIGHT-CLICK to remove vertex
 *    - Remove specific vertex (right-click on it)
 *    - Or remove last vertex (right-click empty area)
 * 
 * 4. VALIDATION
 *    - Minimum 3 vertices required
 *    - Minimum 100px² area
 *    - Vertices must be > 15px apart
 *    - Live feedback: green=valid, red=invalid
 * 
 * 5. ANALYSIS DISPLAY
 *    - Shows: Sides, Convexity, Variance, Area
 *    - Security notes on strength factors
 *    - Explains cipher behavior
 * 
 * 6. "ADD TO PIPELINE" BUTTON
 *    - Enabled when polygon is VALID
 *    - Disabled with explanation if invalid
 *    - Creates PolygonNode and adds to pipeline
 *    - Clears canvas for next polygon
 */

// ============================================================================
// IMPLEMENTATION DETAILS
// ============================================================================

/**
 * KEY FUNCTIONS (polygon-builder.js):
 * 
 * class PolygonBuilder
 *   - Manages canvas state
 *   - Handles vertex dragging
 *   - Validates geometry
 *   - Renders visual feedback
 * 
 * class PolygonAnalyzer
 *   - Displays polygon metrics
 *   - Provides security analysis text
 *   - Updates in real-time
 * 
 * GEOMETRY UTILITIES (nodes.js):
 *   distance(p1, p2) - Euclidean distance
 *   polygonArea(vertices) - Shoelace formula
 *   isConvex(vertices) - Cross product method
 *   getSideLengths(vertices) - Array of edge lengths
 *   calculateSideVariance(vertices) - Std deviation
 *   validatePolygon(vertices) - Full validation
 * 
 * class PolygonNode extends CipherNode
 *   - Applies two-stage cipher
 *   - Derives keys from geometry
 *   - describe() returns polygon properties
 *   - analyzeGeometry() for debugging
 */

// ============================================================================
// GAME INTEGRATION (game.js)
// ============================================================================

/**
 * ADDED METHODS:
 * 
 * game.addPolygonNode()
 *   - Takes validated polygon from builder
 *   - Creates PolygonNode instance
 *   - Adds to pipeline
 *   - Clears canvas for next polygon
 * 
 * game.clearPolygon()
 *   - Resets polygon builder
 *   - Clears vertices and validation state
 * 
 * game.updatePolygonUI()
 *   - Updates analysis display
 *   - Enables/disables "Add" button
 *   - Shows error messages
 * 
 * INITIALIZATION:
 *   - PolygonBuilder instantiated on DOMContentLoaded
 *   - PolygonAnalyzer instantiated on DOMContentLoaded
 *   - Update loop polls canvas every 100ms
 *   - Events wired to button clicks
 */

// ============================================================================
// PEDAGOGICAL VALUE
// ============================================================================

/**
 * This system teaches cryptographic concepts through geometry:
 * 
 * 1. COMPOSABILITY
 *    - Polygons can be chained (multiple nodes)
 *    - Players learn order matters
 *    - Visual feedback on cumulative strength
 * 
 * 2. KEY SPACE
 *    - Sides determine one dimension of key space
 *    - Convexity determines secondary transform
 *    - Variance affects secondary key selection
 * 
 * 3. DIFFUSION
 *    - Convex = good diffusion
 *    - Concave = weak diffusion
 *    - Visual -> security mapping
 * 
 * 4. REGULARITY ≠ STRENGTH
 *    - Regular polygons are predictable (visual symmetry)
 *    - Irregular polygons may be stronger
 *    - Challenge intuition about patterns
 * 
 * 5. VALIDATION
 *    - Constraints (minimum area, max vertices)
 *    - Real-time feedback
 *    - Players learn what "valid" means
 */

// ============================================================================
// FUTURE ENHANCEMENTS
// ============================================================================

/**
 * POTENTIAL EXTENSIONS:
 * 
 * 1. POLYGON PRESETS
 *    - Button to quickly create common shapes
 *    - Triangle, Square, Pentagon, Hexagon, etc.
 *    - Educational: show properties instantly
 * 
 * 2. ROTATION/SCALING
 *    - Transform polygon without changing properties
 *    - Visual exploration of equivalent shapes
 * 
 * 3. POLYGON COMBINATIONS
 *    - Overlay two polygons
 *    - Union/intersection creates new node
 *    - Advanced mechanic for expert mode
 * 
 * 4. ATTACK VULNERABILITY VISUALIZATION
 *    - Show which attacks target polygon-based ciphers
 *    - Highlight weaker geometries
 * 
 * 5. CUSTOM CIPHER MAPPING
 *    - Allow players to define own geometry→key rules
 *    - Deeper learning about cipher design
 * 
 * 6. PROCEDURAL GENERATION
 *    - "Random Polygon" challenge
 *    - Analyze and optimize given shapes
 * 
 * 7. PERFORMANCE METRICS
 *    - Show encryption speed by polygon complexity
 *    - Time vs security tradeoff
 */

// ============================================================================
// TESTING SCENARIOS
// ============================================================================

/**
 * TRY THESE POLYGONS:
 * 
 * 1. EQUILATERAL TRIANGLE (3 sides)
 *    - Convex: YES
 *    - Variance: ~0 (regular)
 *    - Shift by: 3
 *    - Multiply key: 5 (typical)
 *    - Expected: Good signal diffusion
 * 
 * 2. IRREGULAR 5-GON
 *    - Convex: YES
 *    - Variance: High (drag sides differently)
 *    - Shift by: 5
 *    - Multiply key: Varies with variance
 *    - Expected: Unpredictable strength
 * 
 * 3. CONCAVE POLYGON (Bowtie shape)
 *    - Convex: NO
 *    - Shift by: (sides mod 26)
 *    - Multiply: DISABLED (concave)
 *    - Expected: Single-layer transformation only
 * 
 * 4. ULTRA-IRREGULAR SHAPE
 *    - Long thin sides mixed with short sides
 *    - Tests variance calculation
 *    - Shows unpredictability benefit
 */
