/**
 * game.js - CipherDash Game Logic
 * Core game state, level management, and event handling
 */

class CipherDashGame {
  constructor() {
    // Game state
    this.currentLevel = 1;
    this.plaintext = '';
    this.pipeline = new CipherPipeline();
    this.ciphertext = '';
    this.lastScore = null;
    this.gameState = 'idle'; // 'idle', 'building', 'transmitting', 'complete'

    // Polygon builder
    this.polygonBuilder = null;
    this.polygonAnalyzer = null;

    // Difficulty levels with polygon objectives and resource limits
    this.levels = [
      {
        level: 1,
        plaintext: 'SIGNAL',
        description: 'Beginner: Simple Signal Encryption',
        threshold: 40,
        maxVertices: 5,
        maxNodes: 1,
        objective: 'Build a convex triangle (3 sides)',
        hint: '💡 A triangle has 3 vertices and all angles < 180°',
        targetSides: [3],
        targetConvex: true
      },
      {
        level: 2,
        plaintext: 'WAVE',
        description: 'Basic: Four-Letter Wave',
        threshold: 42,
        maxVertices: 6,
        maxNodes: 1,
        objective: 'Build a convex quadrilateral (4 sides)',
        hint: '💡 A square or rectangle works perfectly',
        targetSides: [4],
        targetConvex: true
      },
      {
        level: 3,
        plaintext: 'CRYPTO',
        description: 'Standard: Cryptic Message',
        threshold: 43,
        maxVertices: 7,
        maxNodes: 1,
        objective: 'Build a convex pentagon (5 sides)',
        hint: '💡 5-sided shapes are common in nature',
        targetSides: [5],
        targetConvex: true
      },
      {
        level: 4,
        plaintext: 'MESSAGE',
        description: 'Challenge: Secret Message',
        threshold: 44,
        maxVertices: 8,
        maxNodes: 1,
        objective: 'Build a convex hexagon (6 sides)',
        hint: '💡 Honeycombs use hexagons for strength',
        targetSides: [6],
        targetConvex: true
      },
      {
        level: 5,
        plaintext: 'ENCODED',
        description: 'Advanced: Encoded Data',
        threshold: 45,
        maxVertices: 9,
        maxNodes: 1,
        objective: 'Build a heptagon (7 sides, convex)',
        hint: '💡 More sides = stronger cipher. Must be convex.',
        targetSides: [7],
        targetConvex: true
      },
      {
        level: 6,
        plaintext: 'CIPHER',
        description: 'Expert: Cipher Protocol',
        threshold: 46,
        maxVertices: 10,
        maxNodes: 1,
        objective: 'Build an octagon (8 sides, convex)',
        hint: '💡 Stop signs are octagons - strong and stable',
        targetSides: [8],
        targetConvex: true
      },
      {
        level: 7,
        plaintext: 'TRANSMIT',
        description: 'Master: Transmission',
        threshold: 47,
        maxVertices: 11,
        maxNodes: 2,
        objective: 'Build two convex polygons: first a quadrilateral, then a pentagon',
        hint: '💡 Compose multiple ciphers for extra strength. First 4 sides, then 5 sides.',
        targetSides: [4, 5],
        targetConvex: true
      },
      {
        level: 8,
        plaintext: 'SECURITY',
        description: 'Legend: Maximum Security',
        threshold: 48,
        maxVertices: 12,
        maxNodes: 2,
        objective: 'Build two convex polygons: first a pentagon, then a hexagon',
        hint: '💡 Layer your defenses. First 5 sides, then 6 sides.',
        targetSides: [5, 6],
        targetConvex: true
      },
      {
        level: 9,
        plaintext: 'CLASSIFIED',
        description: 'Classified: Top Secret',
        threshold: 49,
        maxVertices: 11,
        maxNodes: 2,
        objective: 'Build two convex polygons: a hexagon and a heptagon',
        hint: '💡 You have limited vertices. Use them wisely. First 6 sides, then 7 sides.',
        targetSides: [6, 7],
        targetConvex: true
      },
      {
        level: 10,
        plaintext: 'ENCRYPTED',
        description: 'Ultimate: Final Encryption',
        threshold: 50,
        maxVertices: 10,
        maxNodes: 2,
        objective: 'Build two convex polygons: a heptagon and an octagon',
        hint: '💡 Expert level: Limited vertices (10 total) for 7+8=15 needed. Compress your shapes.',
        targetSides: [7, 8],
        targetConvex: true
      }
    ];


    this.loadLevel(1);
  }

  /**
   * Get current level data
   */
  getCurrentLevel() {
    return this.levels[this.currentLevel - 1];
  }

  /**
   * Check if objective is met
   * @returns {object} - {met: boolean, reasons: string[]}
   */
  checkObjectiveMet() {
    const levelData = this.getCurrentLevel();
    const reasons = [];
    let met = true;

    // Check if all target polygon sides are in pipeline
    const nodesSides = this.pipeline.nodes
      .filter(node => node.type === 'polygon')
      .map(node => node.numSides);

    for (const targetSide of levelData.targetSides) {
      if (!nodesSides.includes(targetSide)) {
        reasons.push(`Missing ${targetSide}-sided polygon`);
        met = false;
      }
    }

    // Check if all nodes are convex (if required)
    if (levelData.targetConvex) {
      for (const node of this.pipeline.nodes) {
        if (node.type === 'polygon' && !node.convex) {
          reasons.push('All polygons must be convex');
          met = false;
          break;
        }
      }
    }

    // Check node count doesn't exceed max
    const polygonNodeCount = this.pipeline.nodes.filter(n => n.type === 'polygon').length;
    if (polygonNodeCount > levelData.maxNodes) {
      reasons.push(`Too many polygon nodes (max ${levelData.maxNodes})`);
      met = false;
    }

    return { met, reasons };
  }

  /**
   * Get resource usage
   */
  getResourceUsage() {
    const levelData = this.getCurrentLevel();
    
    // Count vertices used in pipeline nodes
    let pipelineVerticesUsed = 0;
    for (const node of this.pipeline.nodes) {
      if (node.type === 'polygon' && node.vertices) {
        pipelineVerticesUsed += node.vertices.length;
      }
    }
    
    // Add vertices currently being drawn in the builder
    const builderVertices = this.polygonBuilder
      ? this.polygonBuilder.getVertices().length
      : 0;
    
    const verticesUsed = pipelineVerticesUsed + builderVertices;
    const nodesUsed = this.pipeline.nodes.filter(n => n.type === 'polygon').length;

    return {
      verticesUsed,
      verticesMax: levelData.maxVertices,
      nodesUsed,
      nodesMax: levelData.maxNodes,
      verticesAvailable: Math.max(0, levelData.maxVertices - verticesUsed),
      nodesAvailable: Math.max(0, levelData.maxNodes - nodesUsed)
    };
  }

  /**
   * Load a specific level
   * @param {number} levelNum - Level number (1-10)
   */
  loadLevel(levelNum) {
    const levelData = this.levels[levelNum - 1];
    if (!levelData) {
      console.error(`Level ${levelNum} not found`);
      return;
    }

    this.currentLevel = levelNum;
    this.plaintext = levelData.plaintext;
    this.pipeline.clear();
    this.ciphertext = '';
    this.lastScore = null;
    this.gameState = 'building';

    console.log(`Loaded Level ${levelNum}: "${this.plaintext}"`);
    this.updateUI();
  }

  /**
   * Add a node to the cipher pipeline
   * @param {string} nodeType - 'shift', 'reverse', or 'multiply'
   * @param {number} key - Optional key value
   */
  addNode(nodeType, key = null) {
    let node;

    switch (nodeType) {
      case 'shift':
        node = new ShiftNode(key || 3);
        break;
      case 'reverse':
        node = new ReverseNode();
        break;
      case 'multiply':
        node = new MultiplyNode(key || 5);
        break;
      default:
        console.error(`Unknown node type: ${nodeType}`);
        return;
    }

    this.pipeline.addNode(node);
    console.log(`Added ${node.name} node`);
    this.updateCiphertext();
    this.updateUI();
  }

  /**
   * Remove the last node from the pipeline
   */
  removeLastNode() {
    if (this.pipeline.length() > 0) {
      this.pipeline.removeNode(this.pipeline.length() - 1);
      console.log('Removed last node from pipeline');
      this.updateCiphertext();
      this.updateUI();
    }
  }

  /**
   * Remove a specific node by index
   */
  removeNodeByIndex(index) {
    if (index >= 0 && index < this.pipeline.length()) {
      this.pipeline.removeNode(index);
      this.updateCiphertext();
      this.updateUI();
    }
  }

  /**
   * Update ciphertext by encrypting plaintext through pipeline
   */
  updateCiphertext() {
    this.ciphertext = this.pipeline.encrypt(this.plaintext);
  }

  /**
   * Transmit the signal (evaluate and test cipher)
   */
  transmitSignal() {
    this.gameState = 'transmitting';

    // Get cipher score
    const scoreBreakdown = evaluateCipher(
      this.plaintext,
      this.ciphertext,
      this.pipeline
    );
    this.lastScore = scoreBreakdown.final;

    // Run attacks
    const attackResults = runAttacks(
      this.plaintext,
      this.ciphertext,
      this.pipeline
    );

    // Trigger attack animation if attacks succeed
    if (attackResults.showAnimation) {
      this.triggerAttackAnimation();
    }

    // Apply attack penalties to score
    const threatenedScore = Math.max(0, this.lastScore - attackResults.totalPenalty);

    // Check if passed (and objective met)
    const levelData = this.levels[this.currentLevel - 1];
    const objectiveCheck = this.checkObjectiveMet();
    const passed = checkPass(threatenedScore, levelData.threshold) && objectiveCheck.met;

    // Store results for UI display
    this.lastResults = {
      scoreBreakdown,
      attackResults,
      threatenedScore,
      passed,
      objectiveCheck,
      feedback: generateFeedback(scoreBreakdown, this.plaintext, this.ciphertext),
      patterns: detectPatterns(this.ciphertext),
      threshold: levelData.threshold
    };

    this.gameState = passed ? 'complete' : 'idle';
    this.updateUI();

    return this.lastResults;
  }

  /**
   * Trigger attack animation (red background + binary rain)
   */
  triggerAttackAnimation() {
    const container = document.querySelector('.container');
    if (!container) return;

    // Add animation class
    container.classList.add('attack-animation');

    // Remove animation class after it completes
    setTimeout(() => {
      container.classList.remove('attack-animation');
    }, 2000); // 2 second animation
  }

  /**
   * Reset to building mode (keep level)
   */
  resetCipher() {
    this.pipeline.clear();
    this.ciphertext = '';
    this.lastScore = null;
    this.lastResults = null;
    this.gameState = 'building';
    this.updateUI();
  }

  /**
   * Advance to next level
   */
  nextLevel() {
    if (this.currentLevel < this.levels.length) {
      this.loadLevel(this.currentLevel + 1);
    } else {
      console.log('Game complete! All levels passed.');
      // TODO: Show congratulations screen, restart options
    }
  }

  /**
   * Add a polygon node from the builder
   */
  addPolygonNode() {
    if (!this.polygonBuilder || !this.polygonBuilder.isValid) {
      console.error('Polygon is not valid');
      return;
    }

    // Check node limit for current level
    const resources = this.getResourceUsage();
    if (resources.nodesUsed >= resources.nodesMax) {
      alert(`Node limit reached! (${resources.nodesMax} max per level)`);
      return;
    }

    const vertices = this.polygonBuilder.getVertices();
    const node = new PolygonNode(vertices);
    this.pipeline.addNode(node);

    console.log(`Added polygon node: ${node.describe()}`);

    // Clear polygon and reset builder
    this.polygonBuilder.clear();
    this.updatePolygonUI();
    this.updateCiphertext();
    this.updateUI();
  }

  /**
   * Clear polygon builder
   */
  clearPolygon() {
    if (this.polygonBuilder) {
      this.polygonBuilder.clear();
      this.updatePolygonUI();
    }
  }

  /**
   * Update polygon UI elements
   */
  updatePolygonUI() {
    if (!this.polygonBuilder) return;

    this.polygonAnalyzer.display(this.polygonBuilder);

    const addBtn = document.getElementById('btn-polygon-add');
    if (addBtn) {
      addBtn.disabled = !this.polygonBuilder.isValid;
    }

    // Show error message if invalid
    const infoElem = document.getElementById('polygon-analysis');
    if (!this.polygonBuilder.isValid && this.polygonBuilder.validationError) {
      if (infoElem) {
        infoElem.innerHTML = `
          <div class="polygon-error">
            ⚠️ ${this.polygonBuilder.validationError}
          </div>
        `;
      }
    }
  }

  /**
   * Update the UI display
   * This is called whenever game state changes
   */
  updateUI() {
    this.renderObjective();
    this.renderResources();
    this.renderPlaintext();
    this.renderCiphertext();
    this.renderPipeline();
    this.renderResults();
    this.updateButtonStates();
  }

  /**
   * Render objective display
   */
  renderObjective() {
    const elem = document.getElementById('objective-display');
    if (!elem) return;

    const levelData = this.getCurrentLevel();
    elem.innerHTML = `
      <div class="objective-content">
        <h4>${levelData.objective}</h4>
        <p class="objective-hint">${levelData.hint}</p>
      </div>
    `;
  }

  /**
   * Render resource counter
   */
  renderResources() {
    const elem = document.getElementById('resources-display');
    if (!elem) return;

    const resources = this.getResourceUsage();
    const verticesStyle = resources.verticesUsed >= resources.verticesMax ? 'warning' : 'ok';
    const nodesStyle = resources.nodesUsed >= resources.nodesMax ? 'warning' : 'ok';

    elem.innerHTML = `
      <div class="resources-bar">
        <div class="resource-item">
          <span class="resource-label">Vertices:</span>
          <span class="resource-value ${verticesStyle}">${resources.verticesUsed}/${resources.verticesMax}</span>
        </div>
        <div class="resource-item">
          <span class="resource-label">Nodes:</span>
          <span class="resource-value ${nodesStyle}">${resources.nodesUsed}/${resources.nodesMax}</span>
        </div>
      </div>
    `;
  }

  /**
   * Render plaintext display
   */
  renderPlaintext() {
    const elem = document.getElementById('plaintext-display');
    if (elem) {
      elem.textContent = this.plaintext;
    }
  }

  /**
   * Render ciphertext display
   */
  renderCiphertext() {
    const elem = document.getElementById('ciphertext-display');
    if (elem) {
      elem.textContent = this.ciphertext || '(build a cipher)';
    }
  }

  /**
   * Render pipeline visualization
   */
  renderPipeline() {
    const elem = document.getElementById('pipeline-display');
    if (!elem) return;

    if (this.pipeline.isEmpty()) {
      elem.innerHTML = '<div class="pipeline-empty">No nodes</div>';
      return;
    }

    const descriptions = this.pipeline.describe();
    elem.innerHTML = descriptions
      .map((desc, idx) => `
        <div class="pipeline-node-item">
          <div class="pipeline-node">${desc}</div>
          <button class="btn btn-remove-node" data-index="${idx}" title="Remove this node">✕</button>
        </div>
      `)
      .join('');

    // Attach event listeners to remove buttons
    elem.querySelectorAll('.btn-remove-node').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removeNodeByIndex(index);
      });
    });
  }

  /**
   * Render evaluation results
   */
  renderResults() {
    const elem = document.getElementById('results-display');
    if (!elem || !this.lastResults) {
      if (elem) elem.innerHTML = '';
      return;
    }

    const r = this.lastResults;
    const breakdown = r.scoreBreakdown;

    let html = `
      <div class="results-container">
        <h3>Analysis Report</h3>
        
        <div class="score-display">
          <div class="score-value">${r.threatenedScore}</div>
          <div class="score-label">/ 100</div>
        </div>

        <div class="score-breakdown">
          <div>Base: +${breakdown.base}</div>
          <div>Entropy: +${breakdown.entropy.toFixed(1)}</div>
          <div>Diffusion: +${breakdown.diffusion.toFixed(1)}</div>
          <div>Key Space: +${breakdown.keySpace.toFixed(1)}</div>
          <div>Penalties: ${breakdown.penalties.toFixed(1)}</div>
          <div>Attack Impact: -${r.scoreBreakdown.final - r.threatenedScore}</div>
        </div>

        <div class="threshold-check">
          Score: ${r.threshold} required | Status: ${r.threatenedScore >= r.threshold ? '✓ Score OK' : '✗ Score Low'}
        </div>
    `;

    // Show objective status
    if (r.objectiveCheck) {
      const objectiveStatus = r.objectiveCheck.met ? '✓ Objective Met' : '✗ Objective Not Met';
      const objectiveClass = r.objectiveCheck.met ? 'pass' : 'fail';
      html += `
        <div class="objective-status ${objectiveClass}">
          <strong>${objectiveStatus}</strong>
      `;
      if (!r.objectiveCheck.met && r.objectiveCheck.reasons.length > 0) {
        html += `<ul>`;
        for (const reason of r.objectiveCheck.reasons) {
          html += `<li>${reason}</li>`;
        }
        html += `</ul>`;
      }
      html += `</div>`;
    }

    // Overall pass/fail
    const feedback = r.passed
      ? '🎉 LEVEL PASSED! Objective met and score sufficient!'
      : '⚠️ Level not passed. Check objective and score requirements.';
    html += `
      <div class="feedback ${r.passed ? 'pass' : 'fail'}">
        ${feedback}
      </div>
    `;

    if (r.patterns.length > 0) {
      html += `<div class="warnings">
        <strong>Pattern Warnings:</strong>
        <ul>${r.patterns.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>`;
    }

    html += `<div class="attacks">
      <strong>Attacks:</strong>
      <ul>
        ${r.attackResults.attacks.map(a => `<li>${a.name}: ${a.description}</li>`).join('')}
      </ul>
    </div></div>`;

    elem.innerHTML = html;
  }

  /**
   * Update button availability based on game state
   */
  updateButtonStates() {
    const removeBtn = document.getElementById('btn-remove');
    const transmitBtn = document.getElementById('btn-transmit');
    const nextBtn = document.getElementById('btn-next');

    if (removeBtn) {
      removeBtn.disabled = this.pipeline.isEmpty();
    }

    if (transmitBtn) {
      transmitBtn.disabled = this.pipeline.isEmpty();
    }

    if (nextBtn) {
      nextBtn.style.display =
        this.gameState === 'complete' && this.currentLevel < this.levels.length
          ? 'block'
          : 'none';
    }
  }

  /**
   * Get level information
   */
  getLevelInfo() {
    return this.levels[this.currentLevel - 1];
  }
}

// Initialize game when DOM is loaded
let game = null;

document.addEventListener('DOMContentLoaded', () => {
  game = new CipherDashGame();

  // Initialize polygon builder with game reference for level constraints
  game.polygonBuilder = new PolygonBuilder('polygon-canvas', { gameRef: game });
  game.polygonAnalyzer = new PolygonAnalyzer('polygon-analysis');

  // Wire up UI buttons
  document.getElementById('btn-shift')?.addEventListener('click', () => {
    const key = parseInt(document.getElementById('shift-key')?.value || 3);
    game.addNode('shift', key);
  });

  document.getElementById('btn-reverse')?.addEventListener('click', () => {
    game.addNode('reverse');
  });

  document.getElementById('btn-multiply')?.addEventListener('click', () => {
    const key = parseInt(document.getElementById('multiply-key')?.value || 5);
    game.addNode('multiply', key);
  });

  // Polygon builder events
  document.getElementById('btn-polygon-clear')?.addEventListener('click', () => {
    game.clearPolygon();
  });

  document.getElementById('btn-polygon-add')?.addEventListener('click', () => {
    game.addPolygonNode();
  });

  // Update polygon analysis on any change
  const updatePolygonUI = () => {
    game.updatePolygonUI();
  };

  // Poll for polygon builder changes (since canvas doesn't have direct events)
  setInterval(updatePolygonUI, 100);

  document.getElementById('btn-remove')?.addEventListener('click', () => {
    game.removeLastNode();
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    game.resetCipher();
  });

  document.getElementById('btn-transmit')?.addEventListener('click', () => {
    game.transmitSignal();
  });

  document.getElementById('btn-next')?.addEventListener('click', () => {
    game.nextLevel();
  });

  // Render level info
  const levelInfo = game.getLevelInfo();
  const levelElem = document.getElementById('level-info');
  if (levelElem) {
    levelElem.innerHTML = `
      <h2>Level ${game.currentLevel}</h2>
      <p>${levelInfo.description}</p>
      <p class="hint">💡 ${levelInfo.hint}</p>
      <p>Minimum score: <strong>${levelInfo.threshold}/100</strong></p>
    `;
  }

  // Initial render
  game.updateUI();
});
