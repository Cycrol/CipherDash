/**
 * evaluator.js - Cipher Strength Evaluation
 * Scores ciphers based on entropy, diffusion, key space, and resistance to attacks
 */

/**
 * Calculate Shannon entropy of a string
 * Higher entropy = more randomness = stronger cipher
 * @param {string} text - The text to analyze
 * @returns {number} - Entropy value (0-8 for typical text)
 */
function calculateEntropy(text) {
  const frequencies = {};
  for (const char of text) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  const len = text.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Calculate diffusion: percentage of characters that changed
 * Higher diffusion = changes propagate through the signal = stronger cipher
 * @param {string} plaintext - Original signal
 * @param {string} ciphertext - Encrypted signal
 * @returns {number} - Percentage (0-100) of changed characters
 */
function calculateDiffusion(plaintext, ciphertext) {
  if (plaintext.length !== ciphertext.length) {
    return 50; // Penalize length changes
  }

  let changes = 0;
  for (let i = 0; i < plaintext.length; i++) {
    if (plaintext[i] !== ciphertext[i]) {
      changes++;
    }
  }

  return (changes / plaintext.length) * 100;
}

/**
 * Analyze character frequency distribution
 * Returns how skewed the distribution is (lower = better)
 * @param {string} text - The text to analyze
 * @returns {number} - Frequency skew score (0-100, lower is better)
 */
function analyzeFrequencySkew(text) {
  const frequencies = {};
  for (const char of text) {
    if (/[A-Z]/.test(char)) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }
  }

  const freqArray = Object.values(frequencies);
  if (freqArray.length === 0) return 100;

  const avgFreq = freqArray.reduce((a, b) => a + b, 0) / freqArray.length;
  let variance = 0;
  for (const freq of freqArray) {
    variance += Math.pow(freq - avgFreq, 2);
  }
  variance /= freqArray.length;

  // Normalize to 0-100 scale
  const stdDev = Math.sqrt(variance);
  return Math.min(100, (stdDev / avgFreq) * 100);
}

/**
 * Check if ciphertext is a simple reversal of plaintext
 * @param {string} plaintext - Original signal
 * @param {string} ciphertext - Encrypted signal
 * @returns {boolean} - True if ciphertext is reversed plaintext
 */
function isSimpleReversal(plaintext, ciphertext) {
  const reversed = plaintext.split('').reverse().join('');
  return reversed === ciphertext;
}

/**
 * Check if ciphertext is identical to plaintext
 * @param {string} plaintext - Original signal
 * @param {string} ciphertext - Encrypted signal
 * @returns {boolean} - True if no transformation occurred
 */
function isIdentical(plaintext, ciphertext) {
  return plaintext === ciphertext;
}

/**
 * Estimate key space size based on pipeline configuration
 * Polygon nodes have variable key space based on shape properties
 * @param {CipherPipeline} pipeline - The cipher pipeline
 * @returns {number} - Approximate key space (log2)
 */
function estimateKeySpace(pipeline) {
  let bits = 0;

  for (const node of pipeline.nodes) {
    switch (node.type) {
      case 'shift':
        bits += Math.log2(26); // 26 possible shifts
        break;
      case 'multiply':
        bits += Math.log2(12); // 12 valid coprime multipliers
        break;
      case 'reverse':
        bits += 1; // Either reversed or not (binary choice)
        break;
      case 'polygon':
        // Polygon key space depends on shape properties
        if (node.numSides) {
          // More sides = larger key space
          bits += Math.log2(Math.max(3, node.numSides * 2));
        }
        // Irregular shapes add entropy
        if (node.sideVariance && node.sideVariance > 1) {
          bits += Math.log2(1 + node.sideVariance * 2);
        }
        // Convex polygons apply secondary transform
        if (node.convex) {
          bits += 3; // Secondary multiply transform adds 3 bits
        }
        break;
      default:
        bits += 1;
    }
  }

  return bits;
}

/**
 * Main evaluation function
 * Scores a cipher based on multiple criteria
 * @param {string} plaintext - Original signal (8-12 characters)
 * @param {string} ciphertext - Encrypted signal
 * @param {CipherPipeline} pipeline - The cipher pipeline used
 * @returns {object} - Score breakdown with total score and component scores
 */
function evaluateCipher(plaintext, ciphertext, pipeline) {
  let score = 75; // Base score increased for higher starting point
  const breakdown = {
    base: 75,
    entropy: 0,
    diffusion: 0,
    keySpace: 0,
    penalties: 0,
    final: 0
  };

  // 1. ENTROPY BOOST (0-35 points, significantly increased)
  // Higher entropy = less predictable patterns
  const ciphertextEntropy = calculateEntropy(ciphertext);
  const plaintextEntropy = calculateEntropy(plaintext);
  const entropyDelta = Math.max(0, ciphertextEntropy - plaintextEntropy);
  const entropyBoost = Math.min(35, entropyDelta * 12);
  breakdown.entropy = entropyBoost;
  score += entropyBoost;

  // 2. DIFFUSION (0-25 points, significantly increased)
  // How many characters changed = how well changes propagate
  const diffusion = calculateDiffusion(plaintext, ciphertext);
  const diffusionScore = Math.min(25, diffusion * 0.25);
  breakdown.diffusion = diffusionScore;
  score += diffusionScore;

  // 3. KEY SPACE (0-15 points, significantly increased)
  // Larger key space = harder to brute force
  const keySpaceBits = estimateKeySpace(pipeline);
  const keySpaceScore = Math.min(15, keySpaceBits);
  breakdown.keySpace = keySpaceScore;
  score += keySpaceScore;

  // 4. PENALTIES for weaknesses (reduced severity)

  // Penalty: Identical output (identity transformation)
  if (isIdentical(plaintext, ciphertext)) {
    breakdown.penalties -= 15; // Reduced from 25
    score -= 15;
  }

  // Penalty: Simple reversal only
  if (isSimpleReversal(plaintext, ciphertext)) {
    breakdown.penalties -= 10; // Reduced from 15
    score -= 10;
  }

  // Penalty: Very low diffusion (< 30% of characters changed)
  if (diffusion < 30) {
    breakdown.penalties -= 5; // Reduced from 10
    score -= 5;
  }

  // Penalty: Frequency skew indicates weak cipher
  const freqSkew = analyzeFrequencySkew(ciphertext);
  if (freqSkew < 20) {
    // Too uniform = suspicious
    breakdown.penalties -= 3; // Reduced from 5
    score -= 3;
  }

  // Penalty: No pipeline (no transformation at all)
  if (pipeline.isEmpty()) {
    breakdown.penalties -= 25; // Reduced from 40
    score -= 25;
  }

  // Final score clamped to 0-100
  breakdown.final = Math.max(0, Math.min(100, score));

  return breakdown;
}

/**
 * Check if cipher passes the level threshold
 * @param {number} score - The cipher score (0-100)
 * @param {number} threshold - Minimum score to pass (default 60)
 * @returns {boolean} - True if score >= threshold
 */
function checkPass(score, threshold = 60) {
  return score >= threshold;
}

/**
 * Generate feedback message based on score breakdown
 * @param {object} breakdown - Score breakdown from evaluateCipher()
 * @param {string} plaintext - Original signal
 * @param {string} ciphertext - Encrypted signal
 * @returns {string} - Human-readable feedback
 */
function generateFeedback(breakdown, plaintext, ciphertext) {
  const score = breakdown.final;
  let feedback = '';

  if (score >= 80) {
    feedback = '🔐 Excellent cipher! Very strong encryption.';
  } else if (score >= 60) {
    feedback = '⚡ Good signal encryption. Ready to transmit!';
  } else if (score >= 40) {
    feedback = '⚠️ Weak cipher. Vulnerable to frequency analysis.';
  } else {
    feedback = '❌ Critical weakness. Signal will be intercepted.';
  }

  // Add specific insights
  if (breakdown.entropy > 15) {
    feedback += ' | High entropy detected.';
  }
  if (breakdown.diffusion > 10) {
    feedback += ' | Good diffusion.';
  }
  if (breakdown.keySpace > 5) {
    feedback += ' | Large key space.';
  }

  return feedback;
}

/**
 * Calculate dynamic security threshold based on pipeline polygon properties
 * Wackier/more irregular shapes have higher thresholds (they're stronger)
 * @param {CipherPipeline} pipeline - The cipher pipeline
 * @returns {number} - Adjusted threshold value (0-100)
 */
function calculateDynamicThreshold(pipeline) {
  let baseThreshold = 15; // Very low base threshold
  
  for (const node of pipeline.nodes) {
    if (node.type === 'polygon') {
      // Start with a baseline for this polygon
      let polygonThreshold = 5;
      
      // More sides = stronger cipher = slightly higher threshold
      if (node.numSides >= 3 && node.numSides <= 8) {
        polygonThreshold += node.numSides * 0.8;
      } else if (node.numSides > 8) {
        polygonThreshold += 10;
      }
      
      // Irregular shapes (high variance) = stronger diffusion = higher threshold
      if (node.sideVariance > 3) {
        polygonThreshold += 8; // "Wacky" shape bonus
      } else if (node.sideVariance > 1.5) {
        polygonThreshold += 4; // Moderate irregularity
      }
      
      // Convex polygons get a small bonus (they apply secondary transform)
      if (node.convex) {
        polygonThreshold += 2;
      }
      
      baseThreshold += polygonThreshold;
    }
  }
  
  // Clamp to reasonable range
  return Math.max(10, Math.min(35, baseThreshold));
}

