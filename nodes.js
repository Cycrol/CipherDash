/**
 * nodes.js - Cipher Node Implementations
 * Base class and specific cipher transformation nodes for signal encryption
 */

/**
 * Base CipherNode class
 * All cipher transformations inherit from this
 */
class CipherNode {
  constructor(type, name) {
    this.type = type;
    this.name = name;
    this.key = 0; // Default key value
  }

  /**
   * Apply transformation to input string
   * @param {string} input - The signal to transform
   * @param {number} key - Transformation parameter
   * @returns {string} - Transformed signal
   */
  apply(input, key = this.key) {
    throw new Error('apply() method must be implemented by subclass');
  }

  /**
   * Set the key for this node
   * @param {number} key - The key value
   */
  setKey(key) {
    this.key = key;
  }

  /**
   * Get a description of this node's current configuration
   * @returns {string} - Human-readable description
   */
  describe() {
    return `${this.name} (key: ${this.key})`;
  }
}

/**
 * ShiftNode - Caesar cipher using modular arithmetic
 * Shifts each character by the key amount, wrapping around the alphabet
 */
class ShiftNode extends CipherNode {
  constructor(key = 3) {
    super('shift', 'Shift');
    this.key = key;
  }

  apply(input, key = this.key) {
    return input
      .toUpperCase()
      .split('')
      .map(char => {
        if (!/[A-Z]/.test(char)) return char; // Non-alphabetic pass-through
        const code = char.charCodeAt(0) - 65; // A=0, B=1, ..., Z=25
        const shifted = (code + key) % 26;
        return String.fromCharCode(shifted + 65);
      })
      .join('');
  }

  describe() {
    return `${this.name} by ${this.key}`;
  }
}

/**
 * ReverseNode - Reverses the entire signal
 * Simple but effective: "HELLO" -> "OLLEH"
 */
class ReverseNode extends CipherNode {
  constructor() {
    super('reverse', 'Reverse');
    this.key = 0; // No key needed
  }

  apply(input, key = 0) {
    return input.split('').reverse().join('');
  }

  describe() {
    return this.name;
  }
}

/**
 * MultiplyNode - Affine cipher multiplication
 * Each character code is multiplied by key (must be coprime to 26)
 * x -> (key * x) mod 26
 */
class MultiplyNode extends CipherNode {
  constructor(key = 5) {
    super('multiply', 'Multiply');
    this.key = key;
    this.validateKey(key);
  }

  /**
   * Check if key is coprime to 26
   * Only 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25 are valid
   */
  validateKey(key) {
    const validKeys = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    if (!validKeys.includes(key % 26)) {
      console.warn(
        `Key ${key} is not coprime to 26. Using ${validKeys[key % validKeys.length]} instead.`
      );
      this.key = validKeys[key % validKeys.length];
    }
  }

  setKey(key) {
    this.validateKey(key);
  }

  apply(input, key = this.key) {
    return input
      .toUpperCase()
      .split('')
      .map(char => {
        if (!/[A-Z]/.test(char)) return char;
        const code = char.charCodeAt(0) - 65;
        const multiplied = (key * code) % 26;
        return String.fromCharCode(multiplied + 65);
      })
      .join('');
  }

  describe() {
    return `${this.name} by ${this.key}`;
  }
}

/**
 * CipherPipeline - Chains multiple nodes together
 * Applies transformations sequentially
 */
class CipherPipeline {
  constructor() {
    this.nodes = [];
  }

  /**
   * Add a node to the pipeline
   * @param {CipherNode} node - The node to add
   */
  addNode(node) {
    this.nodes.push(node);
  }

  /**
   * Remove a node by index
   * @param {number} index - Index of node to remove
   */
  removeNode(index) {
    this.nodes.splice(index, 1);
  }

  /**
   * Apply all nodes in sequence
   * @param {string} input - The plaintext signal
   * @returns {string} - The ciphertext after all transformations
   */
  encrypt(input) {
    let result = input;
    for (const node of this.nodes) {
      result = node.apply(result);
    }
    return result;
  }

  /**
   * Get descriptions of all nodes
   * @returns {string[]} - Array of node descriptions
   */
  describe() {
    return this.nodes.map((node, index) => `${index + 1}. ${node.describe()}`);
  }

  /**
   * Check if pipeline has any nodes
   * @returns {boolean}
   */
  isEmpty() {
    return this.nodes.length === 0;
  }

  /**
   * Get number of nodes
   * @returns {number}
   */
  length() {
    return this.nodes.length;
  }

  /**
   * Clear all nodes
   */
  clear() {
    this.nodes = [];
  }
}

/**
 * GEOMETRY UTILITIES - For polygon-based cipher construction
 */

/**
 * Calculate distance between two points
 * @param {Object} p1 - {x, y}
 * @param {Object} p2 - {x, y}
 * @returns {number} - Euclidean distance
 */
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate the area of a polygon using the Shoelace formula
 * @param {Array} vertices - Array of {x, y} points in order
 * @returns {number} - Polygon area
 */
function polygonArea(vertices) {
  if (vertices.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Check if polygon is convex
 * Uses cross product method: all turns should be same sign
 * @param {Array} vertices - Array of {x, y} points
 * @returns {boolean} - True if convex
 */
function isConvex(vertices) {
  if (vertices.length < 3) return false;

  let sign = null;
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    const p3 = vertices[(i + 2) % vertices.length];

    // Cross product
    const cross =
      (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);

    if (cross !== 0) {
      if (sign === null) {
        sign = cross > 0;
      } else if ((cross > 0) !== sign) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Calculate side lengths of a polygon
 * @param {Array} vertices - Array of {x, y} points
 * @returns {Array} - Array of side lengths
 */
function getSideLengths(vertices) {
  const lengths = [];
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    lengths.push(distance(p1, p2));
  }
  return lengths;
}

/**
 * Calculate variance of side lengths (irregularity measure)
 * 0 = perfectly regular, higher = more irregular
 * @param {Array} vertices - Array of {x, y} points
 * @returns {number} - Variance of side lengths
 */
function calculateSideVariance(vertices) {
  const lengths = getSideLengths(vertices);
  if (lengths.length === 0) return 0;

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  return Math.sqrt(variance); // Standard deviation
}

/**
 * Validate a polygon
 * Requirements: 3+ vertices, non-self-intersecting (simplified check)
 * @param {Array} vertices - Array of {x, y} points
 * @returns {Object} - {valid: boolean, error: string, sides: number}
 */
function validatePolygon(vertices) {
  if (!vertices || vertices.length < 3) {
    return { valid: false, error: 'Need at least 3 vertices', sides: 0 };
  }

  if (vertices.length > 12) {
    return { valid: false, error: 'Too many vertices (max 12)', sides: 0 };
  }

  // Check minimum distance between vertices (avoid duplicates)
  const minDist = 15;
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (distance(vertices[i], vertices[j]) < minDist) {
        return { valid: false, error: 'Vertices too close together', sides: 0 };
      }
    }
  }

  // Check polygon area (avoid very small polygons)
  const area = polygonArea(vertices);
  if (area < 100) {
    return { valid: false, error: 'Polygon too small', sides: 0 };
  }

  return { valid: true, error: '', sides: vertices.length };
}

/**
 * PolygonNode - Geometric cipher based on polygon properties
 * Uses polygon characteristics to determine transformation
 */
class PolygonNode extends CipherNode {
  constructor(vertices = []) {
    super('polygon', 'Polygon Cipher');
    this.vertices = vertices;
    this.sideLengths = getSideLengths(vertices);
    this.numSides = vertices.length;
    this.convex = isConvex(vertices);
    this.sideVariance = calculateSideVariance(vertices);
    this.area = polygonArea(vertices);

    // Derive key from polygon properties
    this.key = this.numSides % 26 || 3; // Number of sides as shift base
  }

  /**
   * Cipher: Use side count to determine shift, variance to add diffusion
   */
  apply(input, key = null) {
    // Use polygon properties to determine transformation
    const shiftAmount = this.numSides % 26 || 3;

    // Convex polygons get a secondary transformation
    let result = input;

    // Primary: shift by number of sides
    result = result
      .toUpperCase()
      .split('')
      .map(char => {
        if (!/[A-Z]/.test(char)) return char;
        const code = char.charCodeAt(0) - 65;
        const shifted = (code + shiftAmount) % 26;
        return String.fromCharCode(shifted + 65);
      })
      .join('');

    // Secondary: if convex, apply a multiply by a derived key
    if (this.convex) {
      const multiplyKey = (Math.floor(this.sideVariance * 5) % 12) || 3;
      const validKeys = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
      const key = validKeys[Math.floor(this.sideVariance * 2) % validKeys.length];

      result = result
        .split('')
        .map(char => {
          if (!/[A-Z]/.test(char)) return char;
          const code = char.charCodeAt(0) - 65;
          const multiplied = (key * code) % 26;
          return String.fromCharCode(multiplied + 65);
        })
        .join('');
    }

    return result;
  }

  describe() {
    const sides = this.numSides;
    const shape = this.convex ? 'Convex' : 'Concave';
    const variance = this.sideVariance.toFixed(1);
    return `${this.name} (${sides}-gon, ${shape}, variance: ${variance})`;
  }

  /**
   * Get a security analysis string
   */
  analyzeGeometry() {
    const analysis = {
      sides: this.numSides,
      convex: this.convex,
      variance: this.sideVariance.toFixed(2),
      area: this.area.toFixed(0),
      diffusionBoost: this.convex ? 'YES' : 'Limited'
    };
    return analysis;
  }
}
