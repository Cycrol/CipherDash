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
  let score = 60; // Base score (increased for easier difficulty)
  const breakdown = {
    base: 60,
    entropy: 0,
    diffusion: 0,
    keySpace: 0,
    penalties: 0,
    final: 0
  };

  // 1. ENTROPY BOOST (0-20 points, reduced from 25)
  // Higher entropy = less predictable patterns
  const ciphertextEntropy = calculateEntropy(ciphertext);
  const plaintextEntropy = calculateEntropy(plaintext);
  const entropyDelta = Math.max(0, ciphertextEntropy - plaintextEntropy);
  const entropyBoost = Math.min(20, entropyDelta * 8);
  breakdown.entropy = entropyBoost;
  score += entropyBoost;

  // 2. DIFFUSION (0-12 points, reduced from 15)
  // How many characters changed = how well changes propagate
  const diffusion = calculateDiffusion(plaintext, ciphertext);
  const diffusionScore = Math.min(12, diffusion * 0.12);
  breakdown.diffusion = diffusionScore;
  score += diffusionScore;

  // 3. KEY SPACE (0-8 points, reduced from 10)
  // Larger key space = harder to brute force
  const keySpaceBits = estimateKeySpace(pipeline);
  const keySpaceScore = Math.min(8, keySpaceBits);
  breakdown.keySpace = keySpaceScore;
  score += keySpaceScore;

  // 4. PENALTIES for weaknesses (reduced severity)

  // Penalty: Identical output (identity transformation)
  if (isIdentical(plaintext, ciphertext)) {
    breakdown.penalties -= 25; // Reduced from 30
    score -= 25;
  }

  // Penalty: Simple reversal only
  if (isSimpleReversal(plaintext, ciphertext)) {
    breakdown.penalties -= 15; // Reduced from 20
    score -= 15;
  }

  // Penalty: Very low diffusion (< 30% of characters changed)
  if (diffusion < 30) {
    breakdown.penalties -= 10; // Reduced from 15
    score -= 10;
  }

  // Penalty: Frequency skew indicates weak cipher
  const freqSkew = analyzeFrequencySkew(ciphertext);
  if (freqSkew < 20) {
    // Too uniform = suspicious
    breakdown.penalties -= 5; // Reduced from 10
    score -= 5;
  }

  // Penalty: No pipeline (no transformation at all)
  if (pipeline.isEmpty()) {
    breakdown.penalties -= 40; // Reduced from 50
    score -= 40;
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
