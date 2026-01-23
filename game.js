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
        description: 'Beginner: Equilateral Triangle',
        threshold: 40,
        maxVertices: 5,
        maxNodes: 1,
        objective: 'Build an equilateral triangle (all sides equal)',
        hint: 'Make all 3 sides roughly equal length. Margin of error: ±15%',
        targetSides: [3],
        targetConvex: true,
        targetType: 'equilateral',
        tolerance: 0.15
      },
      {
        level: 2,
        plaintext: 'WAVE',
        description: 'Basic: Square',
        threshold: 42,
        maxVertices: 6,
        maxNodes: 1,
        objective: 'Build a square (4 equal sides, 90° angles)',
        hint: 'All 4 sides equal, all angles 90°. Margin of error: ±10%',
        targetSides: [4],
        targetConvex: true,
        targetType: 'square',
        tolerance: 0.10
      },
      {
        level: 3,
        plaintext: 'CRYPTO',
        description: 'Standard: 30-60-90 Triangle',
        threshold: 43,
        maxVertices: 7,
        maxNodes: 1,
        objective: 'Build a 30-60-90 triangle (angles: 30°, 60°, 90°)',
        hint: 'Right triangle with one 30° and one 60° angle. Margin of error: ±5°',
        targetSides: [3],
        targetConvex: true,
        targetType: '30-60-90',
        tolerance: 0.087
      },
      {
        level: 4,
        plaintext: 'MESSAGE',
        description: 'Challenge: Regular Hexagon',
        threshold: 44,
        maxVertices: 8,
        maxNodes: 1,
        objective: 'Build a regular hexagon (6 equal sides, 120° angles)',
        hint: 'All 6 sides equal, all angles 120°. Margin of error: ±12%',
        targetSides: [6],
        targetConvex: true,
        targetType: 'regular',
        tolerance: 0.12
      },
      {
        level: 5,
        plaintext: 'ENCODED',
        description: 'Advanced: Parallel Lines',
        threshold: 45,
        maxVertices: 9,
        maxNodes: 1,
        objective: 'Build a pair of parallel lines (never meet, same angle)',
        hint: ' Two lines that stay same distance apart. Margin of error: 8',
        targetSides: null,
        targetConvex: false,
        targetType: 'parallel-lines',
        tolerance: 0.14
      },
      {
        level: 6,
        plaintext: 'CIPHER',
        description: 'Expert: Perpendicular Lines',
        threshold: 46,
        maxVertices: 10,
        maxNodes: 1,
        objective: 'Build a pair of perpendicular lines (intersect at 90)',
        hint: ' Two lines meeting at right angle. Margin of error: 5',
        targetSides: null,
        targetConvex: false,
        targetType: 'perpendicular-lines',
        tolerance: 0.087
      },
      {
        level: 7,
        plaintext: 'TRANSMIT',
        description: 'Master: 15-75-90 Triangle',
        threshold: 47,
        maxVertices: 11,
        maxNodes: 2,
        objective: 'Build a 15-75-90 triangle (angles: 15, 75, 90)',
        hint: ' Right triangle with one 15 and one 75 angle. Margin of error: 5',
        targetSides: [3],
        targetConvex: true,
        targetType: '15-75-90',
        tolerance: 0.087
      },
      {
        level: 8,
        plaintext: 'SECURITY',
        description: 'Legend: Regular Pentagon',
        threshold: 48,
        maxVertices: 12,
        maxNodes: 2,
        objective: 'Build a regular pentagon (5 equal sides, 108 angles)',
        hint: ' All 5 sides equal, all angles ~108. Margin of error: 10%',
        targetSides: [5],
        targetConvex: true,
        targetType: 'regular',
        tolerance: 0.10
      },
      {
        level: 9,
        plaintext: 'CLASSIFIED',
        description: 'Classified: 65 Angle',
        threshold: 49,
        maxVertices: 11,
        maxNodes: 2,
        objective: 'Build an angle measuring 65 degrees',
        hint: ' Create two rays from a point. Margin of error: 4',
        targetSides: null,
        targetConvex: false,
        targetType: 'angle',
        targetAngle: 65,
        tolerance: 0.062
      },
      {
        level: 10,
        plaintext: 'ENCRYPTED',
        description: 'Ultimate: 15 Angle',
        threshold: 50,
        maxVertices: 10,
        maxNodes: 2,
        objective: 'Build an angle measuring 15 degrees',
        hint: ' Create two rays from a point. Margin of error: 2',
        targetSides: null,
        targetConvex: false,
        targetType: 'angle',
        targetAngle: 15,
        tolerance: 0.035
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

    // Handle polygon-based objectives
    if (levelData.targetSides) {
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
    }
    // Handle equilateral triangle
    else if (levelData.targetType === 'equilateral') {
      const triangles = this.pipeline.nodes.filter(n => n.type === 'polygon' && n.numSides === 3);
      if (triangles.length === 0) {
        reasons.push('Build a triangle');
        met = false;
      } else {
        let foundEquilateral = false;
        for (const tri of triangles) {
          if (tri.isEquilateral && tri.isEquilateral(levelData.tolerance)) {
            foundEquilateral = true;
            break;
          }
        }
        if (!foundEquilateral) {
          reasons.push('Triangle sides must be more equal (15% margin)');
          met = false;
        }
      }
    }
    // Handle square
    else if (levelData.targetType === 'square') {
      const quads = this.pipeline.nodes.filter(n => n.type === 'polygon' && n.numSides === 4);
      if (quads.length === 0) {
        reasons.push('Build a quadrilateral');
        met = false;
      } else {
        let foundSquare = false;
        for (const quad of quads) {
          if (quad.isSquare && quad.isSquare(levelData.tolerance)) {
            foundSquare = true;
            break;
          }
        }
        if (!foundSquare) {
          reasons.push('All sides must be equal and angles ~90 (10% margin)');
          met = false;
        }
      }
    }
    // Handle 30-60-90 triangle
    else if (levelData.targetType === '30-60-90') {
      const triangles = this.pipeline.nodes.filter(n => n.type === 'polygon' && n.numSides === 3);
      if (triangles.length === 0) {
        reasons.push('Build a triangle');
        met = false;
      } else {
        let found = false;
        for (const tri of triangles) {
          if (this.checkTriangleAngles(tri, [30, 60, 90], levelData.tolerance)) {
            found = true;
            break;
          }
        }
        if (!found) {
          reasons.push('Triangle must have 30, 60, and 90 angles (5 margin)');
          met = false;
        }
      }
    }
    // Handle 15-75-90 triangle
    else if (levelData.targetType === '15-75-90') {
      const triangles = this.pipeline.nodes.filter(n => n.type === 'polygon' && n.numSides === 3);
      if (triangles.length === 0) {
        reasons.push('Build a triangle');
        met = false;
      } else {
        let found = false;
        for (const tri of triangles) {
          if (this.checkTriangleAngles(tri, [15, 75, 90], levelData.tolerance)) {
            found = true;
            break;
          }
        }
        if (!found) {
          reasons.push('Triangle must have 15, 75, and 90 angles (5 margin)');
          met = false;
        }
      }
    }
    // Handle regular polygons
    else if (levelData.targetType === 'regular') {
      const polygons = this.pipeline.nodes.filter(n => n.type === 'polygon' && n.numSides === levelData.targetSides[0]);
      if (polygons.length === 0) {
        reasons.push(`Build a ${levelData.targetSides[0]}-sided polygon`);
        met = false;
      } else {
        let foundRegular = false;
        for (const poly of polygons) {
          if (poly.isRegular && poly.isRegular(levelData.tolerance)) {
            foundRegular = true;
            break;
          }
        }
        if (!foundRegular) {
          reasons.push(`All sides must be equal and angles consistent (${(levelData.tolerance * 100).toFixed(0)}% margin)`);
          met = false;
        }
      }
    }
    // Handle parallel lines
    else if (levelData.targetType === 'parallel-lines') {
      const lines = this.pipeline.nodes.filter(n => n.type === 'line');
      if (lines.length < 2) {
        reasons.push('Build at least 2 lines');
        met = false;
      } else {
        let foundParallel = false;
        for (let i = 0; i < lines.length; i++) {
          for (let j = i + 1; j < lines.length; j++) {
            if (this.areParallel(lines[i], lines[j], levelData.tolerance)) {
              foundParallel = true;
              break;
            }
          }
          if (foundParallel) break;
        }
        if (!foundParallel) {
          reasons.push('Lines must be parallel (8 margin)');
          met = false;
        }
      }
    }
    // Handle perpendicular lines
    else if (levelData.targetType === 'perpendicular-lines') {
      const lines = this.pipeline.nodes.filter(n => n.type === 'line');
      if (lines.length < 2) {
        reasons.push('Build at least 2 lines');
        met = false;
      } else {
        let foundPerpendicular = false;
        for (let i = 0; i < lines.length; i++) {
          for (let j = i + 1; j < lines.length; j++) {
            if (this.arePerpendicular(lines[i], lines[j], levelData.tolerance)) {
              foundPerpendicular = true;
              break;
            }
          }
          if (foundPerpendicular) break;
        }
        if (!foundPerpendicular) {
          reasons.push('Lines must intersect at 90 (5 margin)');
          met = false;
        }
      }
    }
    // Handle angle objectives
    else if (levelData.targetType === 'angle') {
      // Try to find angles from existing angle nodes
      let angles = this.pipeline.nodes.filter(n => n.type === 'angle');
      
      // If no angle nodes, check if we can detect angles from lines
      if (angles.length === 0) {
        const lines = this.pipeline.nodes.filter(n => n.type === 'line');
        
        // Extract angles from all lines
        const lineAngles = lines.map(line => this.getLineAngle(line) * (180 / Math.PI));
        
        // Check if any line angle matches the target (accounting for angle periodicity)
        let foundAngle = false;
        const angleMargin = levelData.targetAngle * levelData.tolerance;
        
        for (const lineAngle of lineAngles) {
          // Normalize angle to 0-360
          let normalizedAngle = lineAngle % 180;
          if (normalizedAngle < 0) normalizedAngle += 180;
          
          // Check if this angle matches target
          if (Math.abs(normalizedAngle - levelData.targetAngle) <= angleMargin ||
              Math.abs(normalizedAngle - levelData.targetAngle + 180) <= angleMargin ||
              Math.abs(normalizedAngle - levelData.targetAngle - 180) <= angleMargin) {
            foundAngle = true;
            break;
          }
        }
        
        if (!foundAngle) {
          reasons.push(`Angle must be ${levelData.targetAngle} (${angleMargin.toFixed(1)} margin)`);
          met = false;
        }
      } else {
        let foundAngle = false;
        const angleMargin = levelData.targetAngle * levelData.tolerance;
        for (const angle of angles) {
          if (Math.abs(angle.measure - levelData.targetAngle) <= angleMargin) {
            foundAngle = true;
            break;
          }
        }
        if (!foundAngle) {
          reasons.push(`Angle must be ${levelData.targetAngle} (${angleMargin.toFixed(1)} margin)`);
          met = false;
        }
      }
    }
    // Handle circle with tangent line
    else if (levelData.targetType === 'circle-tangent') {
      const circles = this.pipeline.nodes.filter(n => n.type === 'circle');
      const lines = this.pipeline.nodes.filter(n => n.type === 'line');
      
      if (circles.length === 0) {
        reasons.push('Build a circle');
        met = false;
      } else if (lines.length === 0) {
        reasons.push('Build a line tangent to the circle');
        met = false;
      } else {
        let foundTangent = false;
        for (const circle of circles) {
          for (const line of lines) {
            if (this.isLineTangentToCircle(line, circle, levelData.tolerance)) {
              foundTangent = true;
              break;
            }
          }
          if (foundTangent) break;
        }
        if (!foundTangent) {
          reasons.push('Line must be tangent to the circle (touching at 1 point)');
          met = false;
        }
      }
    }

    return { met, reasons };
  }

  /**
   * Check if two lines are parallel
   */
  areParallel(line1, line2, tolerance) {
    // Compare line slopes/angles
    // tolerance in radians (converted from degrees)
    const angle1 = this.getLineAngle(line1);
    const angle2 = this.getLineAngle(line2);
    const angleDiff = Math.abs(angle1 - angle2);
    const normalizedDiff = Math.min(angleDiff, Math.PI - angleDiff);
    return normalizedDiff <= tolerance * Math.PI;
  }

  /**
   * Check if two lines are perpendicular
   */
  arePerpendicular(line1, line2, tolerance) {
    const angle1 = this.getLineAngle(line1);
    const angle2 = this.getLineAngle(line2);
    const angleDiff = Math.abs(angle1 - angle2);
    const normalizedDiff = Math.min(angleDiff, Math.PI - angleDiff);
    const perpendicularAngle = Math.PI / 2;
    return Math.abs(normalizedDiff - perpendicularAngle) <= tolerance * Math.PI;
  }

  /**
   * Get line angle in radians
   */
  getLineAngle(line) {
    // Handle LineNode (has point1 and point2)
    if (line.point1 && line.point2) {
      return Math.atan2(line.point2.y - line.point1.y, line.point2.x - line.point1.x);
    }
    // Handle legacy format (has vertices)
    if (line.vertices && line.vertices.length >= 2) {
      const p1 = line.vertices[0];
      const p2 = line.vertices[line.vertices.length - 1];
      return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }
    return 0;
  }

  /**
   * Check if a line is tangent to a circle
   */
  isLineTangentToCircle(line, circle, tolerance) {
    // Calculate distance from circle center to line
    if (!line.vertices || line.vertices.length < 2 || !circle.center || circle.radius === undefined) {
      return false;
    }
    
    const p1 = line.vertices[0];
    const p2 = line.vertices[line.vertices.length - 1];
    const dist = this.pointToLineDistance(circle.center, p1, p2);
    
    // Line is tangent if distance approximately equals circle radius
    const radiusMargin = circle.radius * tolerance;
    return Math.abs(dist - circle.radius) <= radiusMargin;
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  pointToLineDistance(point, lineP1, lineP2) {
    const numerator = Math.abs((lineP2.y - lineP1.y) * point.x - (lineP2.x - lineP1.x) * point.y + lineP2.x * lineP1.y - lineP2.y * lineP1.x);
    const denominator = Math.sqrt(Math.pow(lineP2.y - lineP1.y, 2) + Math.pow(lineP2.x - lineP1.x, 2));
    return numerator / denominator;
  }

  /**
   * Check if a triangle has the specified angles
   * @param {PolygonNode} tri - Triangle node
   * @param {Array<number>} targetAngles - Target angles in degrees [a, b, c]
   * @param {number} tolerance - Tolerance as decimal (0.05 = 5%)
   * @returns {boolean} True if triangle angles match targets
   */
  checkTriangleAngles(tri, targetAngles, tolerance) {
    if (!tri.vertices || tri.vertices.length !== 3) return false;
    
    // Calculate the three angles of the triangle
    const v1 = tri.vertices[0];
    const v2 = tri.vertices[1];
    const v3 = tri.vertices[2];
    
    // Helper to calculate angle at a vertex
    const calcAngle = (center, p1, p2) => {
      const vec1 = { x: p1.x - center.x, y: p1.y - center.y };
      const vec2 = { x: p2.x - center.x, y: p2.y - center.y };
      const dot = vec1.x * vec2.x + vec1.y * vec2.y;
      const det = vec1.x * vec2.y - vec1.y * vec2.x;
      return Math.abs(Math.atan2(det, dot) * 180 / Math.PI);
    };
    
    // Calculate all three interior angles
    const angle1 = calcAngle(v1, v2, v3);
    const angle2 = calcAngle(v2, v1, v3);
    const angle3 = calcAngle(v3, v1, v2);
    
    const triangleAngles = [angle1, angle2, angle3].sort((a, b) => a - b);
    const sortedTargets = targetAngles.slice().sort((a, b) => a - b);
    
    // Check if angles match targets within tolerance
    const angleTolerance = 5; // Allow 5 degrees
    for (let i = 0; i < 3; i++) {
      if (Math.abs(triangleAngles[i] - sortedTargets[i]) > angleTolerance) {
        return false;
      }
    }
    return true;
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
    this.lastResults = null;
    this.gameState = 'building';
    
    // Clear polygon builder for new level
    this.clearPolygon();

    console.log(`Loaded Level ${levelNum}: "${this.plaintext}"`);
    
    // Show visual level change indicator
    this.displayLevelChangeNotification(levelNum);
    
    this.updateUI();
  }

  /**
   * Display a clear notification when level changes
   */
  displayLevelChangeNotification(levelNum) {
    const levelData = this.levels[levelNum - 1];
    const header = document.querySelector('.game-header');
    
    if (!header) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'level-change-notification';
    notification.innerHTML = `
      <div class="level-change-content">
        <h2>LEVEL ${levelNum}</h2>
        <p class="level-title">${levelData.description}</p>
        <p class="level-objective">${levelData.objective}</p>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after animation completes
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 2500);
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
   * Transmit the signal (evaluate cipher based on objective only)
   */
  transmitSignal() {
    this.gameState = 'transmitting';

    // Check if objective is met
    const objectiveCheck = this.checkObjectiveMet();
    
    // Pass is simply whether objective is met
    const passed = objectiveCheck.met;

    // Store results for UI display
    this.lastResults = {
      objectiveCheck,
      passed,
      feedback: passed ? '✓ Objective met! Level complete!' : '✗ Objective not met. Try again!'
    };

    this.gameState = passed ? 'complete' : 'idle';
    this.updateUI();

    return this.lastResults;
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
   * Add a polygon or line node from the builder
   */
  addPolygonNode() {
    if (!this.polygonBuilder) {
      console.error('Polygon builder not initialized');
      return;
    }

    const isLineMode = this.polygonBuilder.mode === 'line';

    // For line mode, check if we have completed lines or current line
    if (isLineMode) {
      const completedLines = this.polygonBuilder.completedLines || [];
      const hasLines = completedLines.length > 0 || (this.polygonBuilder.linePoints && this.polygonBuilder.linePoints.length === 2);
      
      if (!hasLines) {
        console.error('No lines to add');
        return;
      }
      
      // Add all completed lines
      let addedCount = 0;
      
      for (const line of completedLines) {
        // Recalculate resources each time
        const currentResources = this.getResourceUsage();
        if (currentResources.nodesUsed >= currentResources.nodesMax) {
          if (addedCount > 0) {
            alert(`Added ${addedCount} line(s). Node limit reached!`);
          } else {
            alert(`Node limit reached! (${currentResources.nodesMax} max per level)`);
          }
          break;
        }
        
        const node = new LineNode(line[0], line[1]);
        this.pipeline.addNode(node);
        console.log(`Added line node: ${node.describe()}`);
        addedCount++;
      }
      
      // Clear all lines after adding
      this.polygonBuilder.completedLines = [];
      this.polygonBuilder.linePoints = [];
      this.polygonBuilder.isValid = false;
      this.polygonBuilder.validationError = '0/2 points in current line';
      this.polygonBuilder.draw();
    } else {
      // Polygon mode - check if valid
      if (!this.polygonBuilder.isValid) {
        console.error('Polygon is not valid');
        return;
      }

      const resources = this.getResourceUsage();
      if (resources.nodesUsed >= resources.nodesMax) {
        alert(`Node limit reached! (${resources.nodesMax} max per level)`);
        return;
      }

      const vertices = this.polygonBuilder.getVertices();
      const node = new PolygonNode(vertices);
      this.pipeline.addNode(node);
      console.log(`Added polygon node: ${node.describe()}`);
      
      // For polygons, fully clear
      this.polygonBuilder.clear();
    }

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
      // For line mode: button is enabled if there are completed lines or if we have 2 points
      if (this.polygonBuilder.mode === 'line') {
        const hasCompletedLines = this.polygonBuilder.completedLines && this.polygonBuilder.completedLines.length > 0;
        const hasCurrentLine = this.polygonBuilder.linePoints && this.polygonBuilder.linePoints.length === 2;
        addBtn.disabled = !(hasCompletedLines || hasCurrentLine);
        if (hasCompletedLines) {
          addBtn.textContent = `Add ${this.polygonBuilder.completedLines.length} Line(s)`;
        } else {
          addBtn.textContent = 'Add to Pipeline';
        }
      } else {
        // For polygon mode: button is enabled if polygon is valid
        addBtn.disabled = !this.polygonBuilder.isValid;
        addBtn.textContent = 'Add to Pipeline';
      }
    }

    // Show error message if invalid
    const infoElem = document.getElementById('polygon-analysis');
    if (!this.polygonBuilder.isValid && this.polygonBuilder.validationError) {
      if (infoElem) {
        infoElem.innerHTML = `
          <div class="polygon-error">
            ⚠ ${this.polygonBuilder.validationError}
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
    this.renderLevelInfo();
    this.renderObjective();
    this.renderResources();
    this.renderPlaintext();
    this.renderCiphertext();
    this.renderPipeline();
    this.renderResults();
    this.updateButtonStates();
  }

  /**
   * Render level info display
   */
  renderLevelInfo() {
    const elem = document.getElementById('level-info');
    if (!elem) return;

    const levelData = this.getCurrentLevel();
    elem.innerHTML = `
      <h2>Level ${this.currentLevel}</h2>
      <p>${levelData.description}</p>
      <p class="hint"> ${levelData.hint}</p>
      <p>Minimum score: <strong>${levelData.threshold}/100</strong></p>
    `;
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

    let html = `
      <div class="results-container">
        <h3>Level Evaluation</h3>
    `;

    // Show objective status
    if (r.objectiveCheck) {
      const objectiveStatus = r.objectiveCheck.met ? '✓ Objective Met!' : '✗ Objective Not Met';
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

    // Overall feedback
    const feedbackClass = r.passed ? 'pass' : 'fail';
    const feedbackText = r.passed
      ? 'Cipher secure. Signal transmission successful. Advancing to the next level...'
      : '⚠ Objective not met. Keep adjusting your geometric shapes!';
    html += `
      <div class="feedback ${feedbackClass}">
        ${feedbackText}
      </div>
    </div>`;

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

  // Initialize background music
  const bgmPlayer = document.getElementById('bgm-player');
  if (bgmPlayer) {
    bgmPlayer.play().catch(err => {
      console.log('Background music autoplay prevented by browser:', err);
      // Add a play button handler if autoplay is blocked
      document.addEventListener('click', () => {
        if (bgmPlayer.paused) {
          bgmPlayer.play().catch(e => console.log('BGM play error:', e));
        }
      }, { once: true });
    });
  }

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

  // Mode selector events
  document.getElementById('btn-mode-polygon')?.addEventListener('click', (e) => {
    e.target.classList.add('btn-mode-active');
    document.getElementById('btn-mode-line')?.classList.remove('btn-mode-active');
    game.polygonBuilder.setMode('polygon');
    document.getElementById('mode-instructions').textContent = 
      'Click on the canvas to add vertices. Right-click to remove. Drag vertices to adjust. Assemble a valid polygon to add as a cipher node.';
  });

  document.getElementById('btn-mode-line')?.addEventListener('click', (e) => {
    e.target.classList.add('btn-mode-active');
    document.getElementById('btn-mode-polygon')?.classList.remove('btn-mode-active');
    game.polygonBuilder.setMode('line');
    document.getElementById('mode-instructions').textContent = 
      'Click on the canvas to add 2 points for a line. Right-click to remove points. Add a line to your cipher pipeline.';
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
      <p class="hint"> ${levelInfo.hint}</p>
      <p>Minimum score: <strong>${levelInfo.threshold}/100</strong></p>
    `;
  }

  // Initial render
  game.updateUI();
});
