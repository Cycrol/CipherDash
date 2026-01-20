/**
 * attack.js - Attack Simulations
 * Simulates cryptanalysis attacks that reduce cipher score
 */

/**
 * Frequency Analysis Attack
 * Detects if letter frequencies match typical English
 * Returns a penalty score (0-30 points) based on how obvious the patterns are
 * @param {string} ciphertext - The encrypted signal
 * @returns {object} - Attack result with penalty and description
 */
function frequencyAnalysisAttack(ciphertext) {
  const frequencies = {};
  const letters = ciphertext.match(/[A-Z]/g) || [];

  // Count character frequencies
  for (const char of letters) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  if (letters.length === 0) {
    return { penalty: 0, description: 'No letters to analyze.' };
  }

  // Calculate frequency distribution
  const freqValues = Object.values(frequencies).map(f => f / letters.length);
  freqValues.sort((a, b) => b - a);

  // Check if top letter is too dominant (like 'E' in English)
  const topFreq = freqValues[0];
  const avgFreq = 1 / 26; // Average frequency if perfectly uniform

  // If top letter appears > 20% of the time, it's suspicious
  const domination = Math.max(0, topFreq - 0.15);
  const penalty = Math.min(30, domination * 100);

  return {
    penalty: Math.round(penalty),
    description: `Top letter frequency: ${(topFreq * 100).toFixed(1)}% - Pattern detected!`
  };
}

/**
 * Brute Force Time Estimate Attack
 * Estimates how long it would take to brute force the cipher
 * If estimated time is too short, applies a penalty
 * @param {CipherPipeline} pipeline - The cipher pipeline
 * @returns {object} - Attack result with penalty and description
 */
function bruteForceAttack(pipeline) {
  // Estimate key space
  let totalCombinations = 1;
  let description = 'Key space: ';
  const components = [];

  for (const node of pipeline.nodes) {
    let keySpace = 1;
    let nodeName = '';

    switch (node.type) {
      case 'shift':
        keySpace = 26;
        nodeName = 'Shift (26 keys)';
        break;
      case 'multiply':
        keySpace = 12; // Valid coprime multipliers
        nodeName = 'Multiply (12 keys)';
        break;
      case 'reverse':
        keySpace = 2; // Reversed or not
        nodeName = 'Reverse (2 states)';
        break;
      default:
        keySpace = 2;
    }

    totalCombinations *= keySpace;
    components.push(nodeName);
  }

  // Assume modern computer can test 1,000,000 combinations/second
  const testRate = 1_000_000;
  const secondsNeeded = totalCombinations / testRate;
  const minutesNeeded = secondsNeeded / 60;
  const hoursNeeded = minutesNeeded / 60;

  let timeStr = '';
  let penalty = 0;

  if (secondsNeeded < 1) {
    timeStr = `${(secondsNeeded * 1000).toFixed(0)}ms`;
    penalty = 40; // Very weak
  } else if (secondsNeeded < 60) {
    timeStr = `${secondsNeeded.toFixed(1)}s`;
    penalty = 30;
  } else if (minutesNeeded < 60) {
    timeStr = `${minutesNeeded.toFixed(1)}m`;
    penalty = 15;
  } else if (hoursNeeded < 24) {
    timeStr = `${hoursNeeded.toFixed(1)}h`;
    penalty = 5;
  } else {
    timeStr = `${(hoursNeeded / 24).toFixed(1)} days`;
    penalty = 0; // Strong enough
  }

  return {
    penalty,
    combinations: totalCombinations,
    timeNeeded: timeStr,
    components,
    description: `Brute force would take ~${timeStr}`
  };
}

/**
 * Run all attacks against a cipher
 * @param {string} plaintext - Original signal
 * @param {string} ciphertext - Encrypted signal
 * @param {CipherPipeline} pipeline - The cipher pipeline
 * @returns {object} - Combined attack results
 */
function runAttacks(plaintext, ciphertext, pipeline) {
  const attacks = [];
  let totalPenalty = 0;

  // Run frequency analysis
  const freqAttack = frequencyAnalysisAttack(ciphertext);
  attacks.push({
    name: 'Frequency Analysis',
    ...freqAttack
  });
  totalPenalty += freqAttack.penalty;

  // Run brute force estimate
  const bfAttack = bruteForceAttack(pipeline);
  attacks.push({
    name: 'Brute Force Estimation',
    penalty: bfAttack.penalty,
    description: bfAttack.description
  });
  totalPenalty += bfAttack.penalty;

  return {
    attacks,
    totalPenalty: Math.min(50, totalPenalty), // Cap the total penalty
    summary: `${attacks.length} attacks simulated. Total threat level: ${(totalPenalty / 50 * 100).toFixed(0)}%`,
    showAnimation: totalPenalty > 0 // Trigger animation if any attacks succeed
  };
}

/**
 * BONUS: Simple pattern detection
 * Checks for obvious patterns that weaken the cipher
 * @param {string} ciphertext - The encrypted signal
 * @returns {string[]} - Array of pattern warnings
 */
function detectPatterns(ciphertext) {
  const warnings = [];

  // Check for repeating digrams (two-letter sequences)
  const digrams = {};
  for (let i = 0; i < ciphertext.length - 1; i++) {
    const digram = ciphertext.slice(i, i + 2);
    digrams[digram] = (digrams[digram] || 0) + 1;
  }

  // If any digram repeats more than once, flag it
  const repeatedDigrams = Object.values(digrams).filter(count => count > 1);
  if (repeatedDigrams.length > 0) {
    warnings.push('Repeating letter pairs detected (digram weakness)');
  }

  // Check for alphabetic sequences (ABC, XYZ, etc.)
  for (let i = 0; i < ciphertext.length - 2; i++) {
    const a = ciphertext.charCodeAt(i);
    const b = ciphertext.charCodeAt(i + 1);
    const c = ciphertext.charCodeAt(i + 2);

    if (b === a + 1 && c === b + 1) {
      warnings.push('Alphabetic sequence detected (structural weakness)');
      break;
    }
  }

  return warnings;
}
