/**
 * polygon-builder.js - Geometric Cipher Construction
 * Canvas-based polygon builder with vertex dragging and validation
 */

class PolygonBuilder {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas ${canvasId} not found`);
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.vertices = [];
    this.draggingVertex = null;
    this.isValid = false;
    this.validationError = '';
    this.gameRef = options.gameRef || null; // Reference to game object for constraints
    this.limitWarning = ''; // Feedback when limits reached

    // Configuration
    this.vertexRadius = options.vertexRadius || 8;
    this.snapDistance = options.snapDistance || 15;
    this.minDragDistance = options.minDragDistance || 15;

    // Colors
    this.colors = {
      background: '#0a0e27',
      gridLine: '#1a2847',
      validVertex: '#00ff88',
      invalidVertex: '#ff0055',
      validEdge: '#00d4ff',
      invalidEdge: '#ffaa00',
      validFill: '#00ff8820',
      invalidFill: '#ff005520'
    };

    this.setupEventListeners();
    this.draw();
  }

  setupEventListeners() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleRightClick(e);
    });
  }

  /**
   * Get mouse position relative to canvas
   */
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    
    // Calculate the scale ratio between displayed size and actual canvas size
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  /**
   * Find closest vertex to mouse position
   */
  getClosestVertex(pos) {
    let closest = null;
    let minDist = this.snapDistance;

    for (let i = 0; i < this.vertices.length; i++) {
      const dist = distance(pos, this.vertices[i]);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }

    return closest;
  }

  /**
   * Handle canvas click - add vertex
   */
  handleClick(e) {
    if (this.draggingVertex !== null) return; // Don't add while dragging

    const pos = this.getMousePos(e);

    // Check if clicking on existing vertex (select for deletion)
    const closestIdx = this.getClosestVertex(pos);
    if (closestIdx !== null) {
      // Clicking existing vertex - do nothing for now
      return;
    }

    // Add new vertex with limit checking
    const maxVertices = this.gameRef ? this.gameRef.getResourceUsage().verticesMax : 12;
    
    if (this.vertices.length >= maxVertices) {
      this.limitWarning = `Max vertices (${maxVertices}) reached!`;
      this.draw();
      setTimeout(() => {
        this.limitWarning = '';
        this.draw();
      }, 2000);
      return;
    }

    this.vertices.push({ x: pos.x, y: pos.y });
    this.validate();
    this.limitWarning = '';
    this.draw();
  }

  /**
   * Handle right click - remove last or closest vertex
   */
  handleRightClick(e) {
    const pos = this.getMousePos(e);
    const closestIdx = this.getClosestVertex(pos);

    if (closestIdx !== null) {
      // Remove closest vertex
      this.vertices.splice(closestIdx, 1);
    } else if (this.vertices.length > 0) {
      // Remove last vertex
      this.vertices.pop();
    }

    this.validate();
    this.draw();
  }

  /**
   * Handle mouse down - start dragging vertex
   */
  handleMouseDown(e) {
    const pos = this.getMousePos(e);
    const closestIdx = this.getClosestVertex(pos);

    if (closestIdx !== null) {
      this.draggingVertex = closestIdx;
    }
  }

  /**
   * Handle mouse move - drag vertex or show snap indicator
   */
  handleMouseMove(e) {
    const pos = this.getMousePos(e);

    if (this.draggingVertex !== null) {
      this.vertices[this.draggingVertex] = { x: pos.x, y: pos.y };
      this.validate();
      this.draw();
    } else {
      // Update cursor
      const closestIdx = this.getClosestVertex(pos);
      this.canvas.style.cursor = closestIdx !== null ? 'grab' : 'crosshair';
    }
  }

  /**
   * Handle mouse up - stop dragging
   */
  handleMouseUp(e) {
    this.draggingVertex = null;
    this.draw();
  }

  /**
   * Validate polygon
   */
  validate() {
    const validation = validatePolygon(this.vertices);
    this.isValid = validation.valid;
    this.validationError = validation.error;
  }

  /**
   * Clear all vertices
   */
  clear() {
    this.vertices = [];
    this.draggingVertex = null;
    this.isValid = false;
    this.validationError = '';
    this.draw();
  }

  /**
   * Get vertices
   */
  getVertices() {
    return [...this.vertices];
  }

  /**
   * Draw the canvas
   */
  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear canvas
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, w, h);

    // Draw grid
    this.drawGrid();

    // Draw polygon if valid
    if (this.vertices.length >= 2) {
      this.drawEdges();
    }

    // Draw fill if valid
    if (this.isValid && this.vertices.length >= 3) {
      this.drawFill();
    }

    // Draw vertices
    this.drawVertices();

    // Draw border
    this.ctx.strokeStyle = this.isValid ? '#00ff88' : '#ff0055';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, w, h);

    // Draw limit warning if active
    if (this.limitWarning) {
      this.ctx.fillStyle = 'rgba(255, 0, 85, 0.9)';
      this.ctx.font = 'bold 14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.limitWarning, w / 2, h / 2);
    }
  }

  /**
   * Draw grid background
   */
  drawGrid() {
    const gridSize = 30;
    this.ctx.strokeStyle = this.colors.gridLine;
    this.ctx.lineWidth = 1;

    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw polygon edges
   */
  drawEdges() {
    this.ctx.strokeStyle = this.isValid ? this.colors.validEdge : this.colors.invalidEdge;
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.moveTo(this.vertices[0].x, this.vertices[0].y);

    for (let i = 1; i < this.vertices.length; i++) {
      this.ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }

    // Close polygon if 3+ vertices
    if (this.vertices.length >= 3) {
      this.ctx.lineTo(this.vertices[0].x, this.vertices[0].y);
    }

    this.ctx.stroke();
  }

  /**
   * Draw polygon fill
   */
  drawFill() {
    this.ctx.fillStyle = this.colors.validFill;
    this.ctx.beginPath();
    this.ctx.moveTo(this.vertices[0].x, this.vertices[0].y);

    for (let i = 1; i < this.vertices.length; i++) {
      this.ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }

    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Draw vertices (control points)
   */
  drawVertices() {
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      const color = this.isValid ? this.colors.validVertex : this.colors.invalidVertex;

      // Highlight dragging vertex
      this.ctx.fillStyle = this.draggingVertex === i ? '#ffff00' : color;
      this.ctx.beginPath();
      this.ctx.arc(v.x, v.y, this.vertexRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Label
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 10px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(i + 1, v.x, v.y);
    }
  }

  /**
   * Get polygon analysis
   */
  analyze() {
    if (this.vertices.length < 3) {
      return null;
    }

    return {
      vertices: this.vertices.length,
      convex: isConvex(this.vertices),
      variance: calculateSideVariance(this.vertices),
      area: polygonArea(this.vertices),
      sideLengths: getSideLengths(this.vertices)
    };
  }
}

/**
 * PolygonAnalyzer - Shows detailed metrics about a polygon
 */
class PolygonAnalyzer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  display(builder) {
    if (!builder || !builder.isValid) {
      this.container.innerHTML = '';
      return;
    }

    const analysis = builder.analyze();
    const convexStr = analysis.convex ? '✓ Convex' : '✗ Concave';
    const varianceFixed = analysis.variance.toFixed(2);
    const areaFixed = analysis.area.toFixed(0);

    let html = `
      <div class="polygon-analysis">
        <h4>Polygon Properties</h4>
        <div class="property-row">
          <span class="label">Sides:</span>
          <span class="value">${analysis.vertices}</span>
        </div>
        <div class="property-row">
          <span class="label">Shape:</span>
          <span class="value">${convexStr}</span>
        </div>
        <div class="property-row">
          <span class="label">Irregularity:</span>
          <span class="value">${varianceFixed}</span>
        </div>
        <div class="property-row">
          <span class="label">Area:</span>
          <span class="value">${areaFixed}</span>
        </div>
    `;

    if (analysis.sideLengths.length > 0) {
      const avgLen = (
        analysis.sideLengths.reduce((a, b) => a + b, 0) / analysis.sideLengths.length
      ).toFixed(1);
      html += `
        <div class="property-row">
          <span class="label">Avg Side:</span>
          <span class="value">${avgLen}</span>
        </div>
      `;
    }

    html += `
        <div class="security-note">
          <strong>Security Impact:</strong><br/>
          ${this.getSecurityNote(analysis)}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  getSecurityNote(analysis) {
    let note = '';

    if (analysis.convex) {
      note += '✓ <strong>Convex</strong> — adds secondary diffusion transform.<br/>';
    } else {
      note += '⚠ <strong>Concave</strong> — no secondary transform.<br/>';
    }

    if (analysis.variance > 5) {
      note += '⚠ High irregularity — unpredictable but may reduce entropy.<br/>';
    } else if (analysis.variance < 1) {
      note += '✓ Regular shape — strong diffusion properties.<br/>';
    }

    note += `• <strong>${analysis.vertices}-gon</strong> shifts by ${analysis.vertices % 26 || 3} positions.`;

    return note;
  }
}
