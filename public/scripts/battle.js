// Unit Types Configuration
const UNIT_TYPES = {
  infantry: {
    name: "Infantry",
    cost: 50,
    health: 100,
    damage: 15,
    range: 30,
    speed: 2,
    color: "#4a90e2", // Blue
    shape: "square",
    size: 12,
  },
  archers: {
    name: "Archers",
    cost: 75,
    health: 60,
    damage: 20,
    range: 150,
    speed: 1.5,
    color: "#e24a4a", // Red
    shape: "triangle",
    size: 14,
  },
  cavalry: {
    name: "Cavalry",
    cost: 100,
    health: 80,
    damage: 25,
    range: 35,
    speed: 4,
    color: "#e2c44a", // Gold
    shape: "hexagon",
    size: 14,
  },
};

// Unit Class
class Unit {
  constructor(type, team, x, y) {
    const config = UNIT_TYPES[type];
    this.type = type;
    this.team = team; // 'player' or 'enemy'
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;

    // Stats
    this.maxHealth = config.health;
    this.health = config.health;
    this.damage = config.damage;
    this.range = config.range;
    this.speed = config.speed;
    this.color = config.color;
    this.shape = config.shape;
    this.size = config.size;
    this.name = config.name;

    // Combat
    this.target = null;
    this.attackCooldown = 0;
    this.attackSpeed = 60; // frames between attacks
    this.focusTarget = null; // Manually assigned target for bonus damage

    // Visual
    this.selected = false;
    this.isDead = false;
    this.showMovementLine = false;
    this.movementLineTimer = 0;
  }

  update(allUnits) {
    if (this.isDead) return;

    // Update movement line timer
    if (this.movementLineTimer > 0) {
      this.movementLineTimer--;
      if (this.movementLineTimer === 0) {
        this.showMovementLine = false;
      }
    }

    // If we have a focus target, track it
    if (this.focusTarget && !this.focusTarget.isDead) {
      this.targetX = this.focusTarget.x;
      this.targetY = this.focusTarget.y;
    } else if (this.focusTarget && this.focusTarget.isDead) {
      this.focusTarget = null;
    }

    // Move towards target position
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 2) {
      const moveX = (dx / distance) * this.speed;
      const moveY = (dy / distance) * this.speed;

      // Apply movement
      this.x += moveX;
      this.y += moveY;

      // Handle collision with other units
      this.handleCollisions(allUnits);
    }

    // Decrease attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
  }

  handleCollisions(allUnits) {
    const collisionRadius = this.size + 2; // Units can't get closer than this

    for (const other of allUnits) {
      if (other === this || other.isDead) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = collisionRadius + other.size + 2;

      // If units are overlapping, push them apart
      if (distance < minDistance && distance > 0) {
        const overlap = minDistance - distance;
        const pushX = (dx / distance) * overlap * 0.5;
        const pushY = (dy / distance) * overlap * 0.5;

        // Push this unit away
        this.x += pushX;
        this.y += pushY;

        // Push other unit away (only if same team to avoid weird behavior)
        if (this.team === other.team) {
          other.x -= pushX;
          other.y -= pushY;
        }
      }
    }

    // Keep units within canvas bounds
    const padding = this.size;
    this.x = Math.max(padding, Math.min(1200 - padding, this.x));
    this.y = Math.max(padding, Math.min(700 - padding, this.y));
  }

  moveTo(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.showMovementLine = true;
    this.movementLineTimer = 120; // Show line for 2 seconds
    this.focusTarget = null; // Clear focus target when moving
  }

  setFocusTarget(target) {
    this.focusTarget = target;
    this.targetX = target.x;
    this.targetY = target.y;
    this.showMovementLine = true;
    this.movementLineTimer = 180; // Show targeting line longer
  }

  distanceTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  canAttack(target) {
    // Check if unit is currently moving
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    const isMoving = distanceToTarget > 2; // Same threshold as in update()

    // Check if target is in range
    const targetInRange = this.distanceTo(target) <= this.range;
    
    // Melee range - short distance where units can attack while moving
    const meleeRange = 40; // Fixed melee range in pixels
    const isInMeleeRange = this.distanceTo(target) <= meleeRange;
    
    // Can attack if:
    // 1. Unit is not moving (normal case)
    // 2. OR unit is moving but enemy is in melee range (very close)
    const canAttackWhileMoving = isInMeleeRange;

    return (
      !this.isDead &&
      !target.isDead &&
      targetInRange &&
      this.attackCooldown === 0 &&
      (!isMoving || canAttackWhileMoving) // Can attack if not moving, or if enemy is in melee range
    );
  }

  attack(target) {
    if (this.canAttack(target)) {
      let damageAmount = this.damage;

      // Bonus damage if this is our focus target
      if (this.focusTarget === target) {
        damageAmount *= 1.5; // 50% bonus damage for focused attacks
      }

      target.takeDamage(damageAmount);
      this.attackCooldown = this.attackSpeed;
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    // Draw movement line (before unit so it's behind) - only for player units
    if (
      this.showMovementLine &&
      this.movementLineTimer > 0 &&
      this.team === "player"
    ) {
      ctx.save();
      const alpha = Math.min(1, this.movementLineTimer / 60);

      if (this.focusTarget && !this.focusTarget.isDead) {
        // Targeting line - red for attack
        ctx.strokeStyle = `rgba(255, 50, 50, ${alpha * 0.8})`;
        ctx.lineWidth = 3;
      } else {
        // Movement line - green
        ctx.strokeStyle = `rgba(100, 255, 100, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
      }

      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.targetX, this.targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw destination marker
      ctx.fillStyle = this.focusTarget
        ? `rgba(255, 50, 50, ${alpha})`
        : `rgba(100, 255, 100, ${alpha})`;
      ctx.beginPath();
      ctx.arc(this.targetX, this.targetY, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw focus target indicator
    if (this.focusTarget && !this.focusTarget.isDead) {
      ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw selection highlight
    if (this.selected) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw unit shape
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.team === "player" ? "#00ff00" : "#ff0000";
    ctx.lineWidth = 2;

    this.drawShape(ctx);

    // Draw health bar
    this.drawHealthBar(ctx);

    // Draw attack range when selected
    if (this.selected) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawShape(ctx) {
    ctx.beginPath();

    switch (this.shape) {
      case "square":
        ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        break;

      case "triangle":
        ctx.moveTo(0, -this.size / 2);
        ctx.lineTo(this.size / 2, this.size / 2);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.closePath();
        break;

      case "hexagon":
        const angleStep = Math.PI / 3;
        for (let i = 0; i < 6; i++) {
          const angle = angleStep * i;
          const x = (Math.cos(angle) * this.size) / 2;
          const y = (Math.sin(angle) * this.size) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
    }

    ctx.fill();
    ctx.stroke();
  }

  drawHealthBar(ctx) {
    const barWidth = 20;
    const barHeight = 3;
    const barY = -this.size - 8;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    // Health
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle =
      healthPercent > 0.5
        ? "#00ff00"
        : healthPercent > 0.25
        ? "#ffff00"
        : "#ff0000";
    ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
  }

  containsPoint(x, y) {
    const dx = this.x - x;
    const dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= this.size;
  }
}

// Army Selector Class
class ArmySelector {
  constructor(battle) {
    this.battle = battle;
    this.budget = 1000;
    this.maxBudget = 1000;
    this.selectedUnits = {
      infantry: 0,
      archers: 0,
      cavalry: 0,
    };
    this.updateDisplay();
  }

  incrementUnit(type) {
    const cost = UNIT_TYPES[type].cost;
    if (this.budget >= cost) {
      this.selectedUnits[type]++;
      this.budget -= cost;
      this.updateDisplay();
    }
  }

  decrementUnit(type) {
    if (this.selectedUnits[type] > 0) {
      this.selectedUnits[type]--;
      this.budget += UNIT_TYPES[type].cost;
      this.updateDisplay();
    }
  }

  updateDisplay() {
    document.getElementById("budgetRemaining").textContent = this.budget;
    document.getElementById("infantryCount").textContent =
      this.selectedUnits.infantry;
    document.getElementById("archersCount").textContent =
      this.selectedUnits.archers;
    document.getElementById("cavalryCount").textContent =
      this.selectedUnits.cavalry;

    const totalUnits =
      this.selectedUnits.infantry +
      this.selectedUnits.archers +
      this.selectedUnits.cavalry;

    const startBtn = document.getElementById("startBattleBtn");
    startBtn.disabled = totalUnits === 0;
  }

  startBattle() {
    const totalUnits =
      this.selectedUnits.infantry +
      this.selectedUnits.archers +
      this.selectedUnits.cavalry;

    if (totalUnits === 0) return;

    // Hide army selection overlay
    document.getElementById("armySelectionOverlay").classList.add("hidden");

    // Store player units (stored for deployment)
    this.battle.playerUnitsToPlace = {
      infantry: this.selectedUnits.infantry,
      archers: this.selectedUnits.archers,
      cavalry: this.selectedUnits.cavalry,
    };

    // Create enemy army (mirror composition for balance)
    this.battle.createEnemyArmy(this.selectedUnits);

    // Enter deployment phase
    this.battle.enterDeploymentPhase();
  }
}

// AI Controller Class
class AIController {
  constructor(battle) {
    this.battle = battle;
    this.updateInterval = 30; // Update AI every 30 frames
    this.frameCount = 0;
  }

  update() {
    this.frameCount++;
    if (this.frameCount % this.updateInterval !== 0) return;

    const enemyUnits = this.battle.units.filter(
      (u) => u.team === "enemy" && !u.isDead
    );
    const playerUnits = this.battle.units.filter(
      (u) => u.team === "player" && !u.isDead
    );

    for (const unit of enemyUnits) {
      this.controlUnit(unit, playerUnits, enemyUnits);
    }
  }

  controlUnit(unit, playerUnits, allEnemyUnits) {
    if (playerUnits.length === 0) return;

    // Use different tactics based on unit type
    switch (unit.type) {
      case "archers":
        this.controlArcher(unit, playerUnits, allEnemyUnits);
        break;
      case "cavalry":
        this.controlCavalry(unit, playerUnits, allEnemyUnits);
        break;
      case "infantry":
        this.controlInfantry(unit, playerUnits, allEnemyUnits);
        break;
      default:
        this.controlInfantry(unit, playerUnits, allEnemyUnits);
    }
  }

  // Archers: Stay at range, kite away if enemies get close
  controlArcher(unit, playerUnits, allEnemyUnits) {
    const target = this.findBestTarget(unit, playerUnits);
    if (!target) return;

    const distance = unit.distanceTo(target);
    const optimalRange = unit.range * 0.8; // Stay at 80% of max range
    const dangerRange = unit.range * 0.4; // Too close!

    // If enemy is too close, retreat!
    if (distance < dangerRange) {
      this.kiteAway(unit, target);
    }
    // If in good range, hold position
    else if (distance <= optimalRange) {
      unit.moveTo(unit.x, unit.y); // Stop moving
    }
    // If too far, move closer but maintain range
    else {
      const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
      const targetX = target.x - Math.cos(angle) * optimalRange;
      const targetY = target.y - Math.sin(angle) * optimalRange;
      unit.moveTo(targetX, targetY);
    }
  }

  // Cavalry: Fast flanking, target weak enemies, use mobility
  controlCavalry(unit, playerUnits, allEnemyUnits) {
    // Target the weakest enemy (lowest health percentage)
    let target = this.findWeakestTarget(playerUnits);
    if (!target) return;

    const distance = unit.distanceTo(target);

    // If in range, attack
    if (distance <= unit.range) {
      unit.moveTo(unit.x, unit.y); // Stop and fight
    } else {
      // Try to flank from the side/rear
      const flankPosition = this.calculateFlankPosition(
        unit,
        target,
        playerUnits
      );
      unit.moveTo(flankPosition.x, flankPosition.y);
    }
  }

  // Infantry: Steady advance, protect archers, form lines
  controlInfantry(unit, playerUnits, allEnemyUnits) {
    const target = this.findBestTarget(unit, playerUnits);
    if (!target) return;

    const distance = unit.distanceTo(target);

    // Check if there are friendly archers behind us
    const protectingArchers = this.shouldProtectArchers(
      unit,
      allEnemyUnits,
      playerUnits
    );

    if (protectingArchers && distance < 200) {
      // Hold the line! Don't advance too far
      unit.moveTo(unit.x, unit.y);
    } else if (distance <= unit.range) {
      // In melee range, hold position
      unit.moveTo(unit.x, unit.y);
    } else {
      // Advance steadily toward enemy
      unit.moveTo(target.x, target.y);
    }
  }

  // Find best target (prioritize low health, then closest)
  findBestTarget(unit, playerUnits) {
    let bestTarget = null;
    let bestScore = -Infinity;

    for (const enemy of playerUnits) {
      const distance = unit.distanceTo(enemy);
      const healthPercent = enemy.health / enemy.maxHealth;

      // Score: prioritize low health and close distance
      const score = (1 - healthPercent) * 100 - distance * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = enemy;
      }
    }

    return bestTarget;
  }

  // Find weakest target by health percentage
  findWeakestTarget(playerUnits) {
    let weakest = null;
    let lowestHealthPercent = 1;

    for (const enemy of playerUnits) {
      const healthPercent = enemy.health / enemy.maxHealth;
      if (healthPercent < lowestHealthPercent) {
        lowestHealthPercent = healthPercent;
        weakest = enemy;
      }
    }

    return weakest || playerUnits[0];
  }

  // Calculate flanking position (try to attack from the side)
  calculateFlankPosition(unit, target, playerUnits) {
    // Calculate the center of player forces
    let centerX = 0,
      centerY = 0;
    for (const player of playerUnits) {
      centerX += player.x;
      centerY += player.y;
    }
    centerX /= playerUnits.length;
    centerY /= playerUnits.length;

    // Get angle from player center to target
    const angleToTarget = Math.atan2(target.y - centerY, target.x - centerX);

    // Flank from 90 degrees to the side
    const flankAngle = angleToTarget + Math.PI / 2;
    const flankDistance = 100;

    return {
      x: target.x + Math.cos(flankAngle) * flankDistance,
      y: target.y + Math.sin(flankAngle) * flankDistance,
    };
  }

  // Kite away from enemy (move backwards while maintaining line of sight)
  kiteAway(unit, threat) {
    const angle = Math.atan2(unit.y - threat.y, unit.x - threat.x);
    const retreatDistance = 150;
    const targetX = unit.x + Math.cos(angle) * retreatDistance;
    const targetY = unit.y + Math.sin(angle) * retreatDistance;

    // Make sure we don't retreat off the map
    const safeX = Math.max(
      50,
      Math.min(this.battle.canvas.width - 50, targetX)
    );
    const safeY = Math.max(
      50,
      Math.min(this.battle.canvas.height - 50, targetY)
    );

    unit.moveTo(safeX, safeY);
  }

  // Check if infantry should protect archers
  shouldProtectArchers(unit, allEnemyUnits, playerUnits) {
    // Find friendly archers
    const friendlyArchers = allEnemyUnits.filter(
      (u) => u.type === "archers" && !u.isDead
    );
    if (friendlyArchers.length === 0) return false;

    // Check if any archers are behind us (closer to our spawn)
    const behindArchers = friendlyArchers.filter(
      (archer) => archer.x > unit.x && unit.distanceTo(archer) < 200
    );

    if (behindArchers.length === 0) return false;

    // Check if there are close threats to those archers
    for (const player of playerUnits) {
      for (const archer of behindArchers) {
        if (player.distanceTo(archer) < 150) {
          return true; // Protect the archers!
        }
      }
    }

    return false;
  }
}

// Particle Effect Class
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6 - 2;
    this.life = 60;
    this.maxLife = 60;
    this.color = color;
    this.size = Math.random() * 4 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2; // gravity
    this.life--;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.fillStyle = this.color
      .replace(")", `, ${alpha})`)
      .replace("rgb", "rgba");
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  isDead() {
    return this.life <= 0;
  }
}

// Main Battle Class
class Battle {
  constructor() {
    this.canvas = document.getElementById("battleCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.units = [];
    this.particles = [];
    this.selectedUnit = null;
    this.phase = "selection"; // selection, deployment, combat, ended

    this.playerUnitsToPlace = {
      infantry: 0,
      archers: 0,
      cavalry: 0,
    };
    this.selectedUnitTypeToPlace = null; // Which unit type the player is currently placing

    this.enemyKills = 0;
    this.playerLosses = 0;
    this.battleStartTime = 0;
    this.battleTime = 0;
    this.isPaused = false;
    this.pausedTime = 0; // Track time spent paused
    this.scoreSubmitted = false; // Track if score has been submitted

    // Initialize subsystems
    this.armySelector = new ArmySelector(this);
    this.ai = new AIController(this);

    // Initialize Firebase
    this.initFirebase();

    // Setup event listeners
    this.setupEventListeners();

    // Start game loop
    this.lastFrameTime = Date.now();
    this.gameLoop();
  }

  initFirebase() {
    // Firebase configuration (user should replace with their config)
    const firebaseConfig = {
      apiKey: "AIzaSyCeT5eglBU9dkOU6P9aacD7TsOi8qOzuXw",
      authDomain: "personalwebsite-joseph.firebaseapp.com",
      projectId: "personalwebsite-joseph",
      storageBucket: "personalwebsite-joseph.firebasestorage.app",
      messagingSenderId: "84929715169",
      appId: "1:84929715169:web:9abfaab3f7856bfebb90a0",
    };

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      this.db = firebase.firestore();
    } catch (error) {
      console.warn("Firebase not configured properly:", error);
      this.db = null;
    }
  }

  setupEventListeners() {
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener("contextmenu", (e) =>
      this.handleRightClick(e)
    );
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));

    // Track mouse position and drag selection
    this.mouseX = 0;
    this.mouseY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragEndX = 0;
    this.dragEndY = 0;
    this.draggedUnit = null; // Unit being dragged during deployment
    this.mouseDownX = 0;
    this.mouseDownY = 0;
    this.justFinishedDrag = false; // Track if we just finished a drag selection
  }

  handleRightClick(e) {
    e.preventDefault(); // Prevent context menu

    if (this.phase !== "combat") return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get all selected units
    const selectedUnits = this.units.filter(
      (u) => u.team === "player" && u.selected && !u.isDead
    );

    // Check if right-clicking on an enemy unit
    let targetEnemy = null;
    for (const unit of this.units) {
      if (unit.team === "enemy" && !unit.isDead && unit.containsPoint(x, y)) {
        targetEnemy = unit;
        break;
      }
    }

    if (targetEnemy && selectedUnits.length > 0) {
      // Command selected units to attack this specific target
      for (const unit of selectedUnits) {
        unit.setFocusTarget(targetEnemy);
      }
    } else if (selectedUnits.length > 0) {
      // Right-click on ground with selected units - move them
      for (const unit of selectedUnits) {
        unit.moveTo(x, y);
      }
    } else {
      // Right-click on empty ground with no selected units - deselect all
      for (const unit of this.units) {
        if (unit.team === "player") {
          unit.selected = false;
        }
      }
      this.selectedUnit = null;
      this.updateUnitInfo();
    }
  }

  handleKeyPress(e) {
    // Spacebar or P to pause/unpause (only during combat)
    if ((e.code === "Space" || e.code === "KeyP") && this.phase === "combat") {
      e.preventDefault();
      e.stopPropagation();
      this.togglePause();
      return;
    }
    // ESC to deselect all units (or prevent default behavior)
    if (e.code === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (this.phase === "combat") {
        // Deselect all units
        for (const unit of this.units) {
          if (unit.team === "player") {
            unit.selected = false;
          }
        }
        this.selectedUnit = null;
        this.updateUnitInfo();
      }
      return;
    }
    // Ctrl+A to select all units
    if (e.code === "KeyA" && e.ctrlKey && this.phase === "combat") {
      e.preventDefault();
      e.stopPropagation();
      this.selectAllUnits();
    }
  }

  selectAllUnits() {
    // Deselect all first
    for (const unit of this.units) {
      if (unit.team === "player") {
        unit.selected = false;
      }
    }

    // Select all player units
    let selectedCount = 0;
    for (const unit of this.units) {
      if (unit.team === "player" && !unit.isDead) {
        unit.selected = true;
        selectedCount++;
      }
    }

    if (selectedCount > 0) {
      this.updateUnitInfo();
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    // Handle unit dragging during deployment
    if (this.phase === "deployment" && this.draggedUnit) {
      // Constrain to left side of battlefield
      const x = Math.min(this.mouseX, this.canvas.width / 2);
      const y = Math.max(0, Math.min(this.mouseY, this.canvas.height));

      // Temporarily move the unit (will validate on mouse up)
      this.draggedUnit.x = x;
      this.draggedUnit.y = y;
      this.draggedUnit.targetX = x;
      this.draggedUnit.targetY = y;
      return;
    }

    // Update drag selection box
    if (this.isDragging) {
      this.dragEndX = this.mouseX;
      this.dragEndY = this.mouseY;
    }
  }

  handleMouseDown(e) {
    // Only handle left mouse button (button 0)
    // Right-clicks are handled separately in handleRightClick
    if (e.button !== 0) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Reset the flag at the start of each mouse interaction
    this.justFinishedDrag = false;
    
    // Store mouse down position to detect if it's a drag or click
    this.mouseDownX = x;
    this.mouseDownY = y;

    // Handle deployment phase - allow dragging placed units
    if (this.phase === "deployment") {
      // Check if clicking on a placed player unit
      for (const unit of this.units) {
        if (
          unit.team === "player" &&
          !unit.isDead &&
          unit.containsPoint(x, y)
        ) {
          this.draggedUnit = unit;
          // Store original position for snap-back if needed
          this.draggedUnitOriginalX = unit.x;
          this.draggedUnitOriginalY = unit.y;
          return;
        }
      }
      return; // If not clicking on a unit, let handleDeploymentClick handle it
    }

    // Combat phase - always allow drag selection to start
    if (this.phase === "combat") {
      this.isDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      this.dragEndX = x;
      this.dragEndY = y;
    }
  }

  handleMouseUp(e) {
    // Only handle left mouse button (button 0)
    // Right-clicks are handled separately in handleRightClick
    if (e.button !== 0) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseUpX = e.clientX - rect.left;
    const mouseUpY = e.clientY - rect.top;
    
    // Calculate if this was a click (little movement) or a drag
    const dragDistance = Math.sqrt(
      Math.pow(mouseUpX - this.mouseDownX, 2) + 
      Math.pow(mouseUpY - this.mouseDownY, 2)
    );
    const wasClick = dragDistance < 5; // Less than 5 pixels = click
    
    // Handle deployment phase - finalize unit drag
    if (this.phase === "deployment" && this.draggedUnit) {
      // If it was just a click (not a drag), clear draggedUnit and let handleCanvasClick handle it
      if (wasClick) {
        this.draggedUnit = null;
        return;
      }
      
      const x = Math.min(mouseUpX, this.canvas.width / 2);
      const y = Math.max(0, Math.min(mouseUpY, this.canvas.height));
      
      // Use stored original position
      const originalX = this.draggedUnitOriginalX;
      const originalY = this.draggedUnitOriginalY;
      
      // Check if new position is valid (excluding the unit being dragged)
      const tempUnits = this.units.filter((u) => u !== this.draggedUnit);
      let isValid = true;
      const minPlacementDistance = 35;
      
      for (const existingUnit of tempUnits) {
        if (existingUnit.team === "player") {
          const dx = x - existingUnit.x;
          const dy = y - existingUnit.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minPlacementDistance) {
            isValid = false;
            break;
          }
        }
      }
      
      // Also check if position is on left side
      if (x > this.canvas.width / 2) {
        isValid = false;
      }
      
      if (isValid) {
        // Valid position - keep the new position
        this.draggedUnit.x = x;
        this.draggedUnit.y = y;
        this.draggedUnit.targetX = x;
        this.draggedUnit.targetY = y;
      } else {
        // Invalid position - snap back to original
        this.draggedUnit.x = originalX;
        this.draggedUnit.y = originalY;
        this.draggedUnit.targetX = originalX;
        this.draggedUnit.targetY = originalY;
        this.showMessage("Cannot place here!");
      }
      
      this.draggedUnit = null;
      return;
    }

    // Combat phase - handle clicks and drags
    if (this.phase === "combat" && this.isDragging) {
      const x = mouseUpX;
      const y = mouseUpY;

      this.dragEndX = x;
      this.dragEndY = y;

      // Calculate selection box bounds
      const minX = Math.min(this.dragStartX, this.dragEndX);
      const maxX = Math.max(this.dragStartX, this.dragEndX);
      const minY = Math.min(this.dragStartY, this.dragEndY);
      const maxY = Math.max(this.dragStartY, this.dragEndY);

      // Calculate drag distance
      const combatDragDistance = Math.sqrt(
        Math.pow(this.dragEndX - this.dragStartX, 2) +
          Math.pow(this.dragEndY - this.dragStartY, 2)
      );

      if (combatDragDistance > 5) {
        // Was a drag selection
        this.justFinishedDrag = true;
        
        // Deselect all units first
        for (const unit of this.units) {
          if (unit.team === "player") {
            unit.selected = false;
          }
        }

        // Select all player units within the box
        let selectedCount = 0;
        for (const unit of this.units) {
          if (unit.team === "player" && !unit.isDead) {
            if (
              unit.x >= minX &&
              unit.x <= maxX &&
              unit.y >= minY &&
              unit.y <= maxY
            ) {
              unit.selected = true;
              selectedCount++;
            }
          }
        }

        // Update unit info to show first selected unit or count
        if (selectedCount > 0) {
          this.updateUnitInfo();
        }
      } else {
        // Was a click - handle it directly here
        this.justFinishedDrag = false;
        this.handleCombatClick(mouseUpX, mouseUpY);
      }

      this.isDragging = false;
      return;
    }
  }

  handleCanvasClick(e) {
    // Don't process click if we just finished dragging a selection box or are dragging a unit
    if (this.draggedUnit) return;
    
    // Combat phase clicks are handled in handleMouseUp, so skip them here
    if (this.phase === "combat") {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.phase === "deployment") {
      // Check if clicking on an existing unit - if so, don't place new unit
      let clickedUnit = null;
      for (const unit of this.units) {
        if (
          unit.team === "player" &&
          !unit.isDead &&
          unit.containsPoint(x, y)
        ) {
          clickedUnit = unit;
          break;
        }
      }

      // Only place new unit if not clicking on existing unit
      if (!clickedUnit) {
        this.handleDeploymentClick(x, y);
      }
    }
  }

  handleDeploymentClick(x, y) {
    // Only allow placement on left side
    if (x > this.canvas.width / 2) {
      return;
    }

    // Check if a unit type is selected
    if (!this.selectedUnitTypeToPlace) {
      this.showMessage("Select a unit type first!");
      return;
    }

    // Check if position is valid
    if (!this.isValidPlacementPosition(x, y)) {
      this.showMessage("Too close to another unit!");
      return;
    }

    // Check if we have units of this type remaining
    if (this.playerUnitsToPlace[this.selectedUnitTypeToPlace] > 0) {
      const unit = new Unit(this.selectedUnitTypeToPlace, "player", x, y);
      unit.targetX = x;
      unit.targetY = y;
      this.units.push(unit);

      this.playerUnitsToPlace[this.selectedUnitTypeToPlace]--;

      // If no more of this type, auto-select another available type
      if (this.playerUnitsToPlace[this.selectedUnitTypeToPlace] === 0) {
        this.autoSelectNextUnitType();
      }

      this.updateDeploymentUI();
    } else {
      this.showMessage(`No more ${this.selectedUnitTypeToPlace} available!`);
    }
  }

  isValidPlacementPosition(x, y) {
    const minPlacementDistance = 35; // Minimum distance between units
    for (const existingUnit of this.units) {
      if (existingUnit.team === "player") {
        const dx = x - existingUnit.x;
        const dy = y - existingUnit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minPlacementDistance) {
          return false;
        }
      }
    }
    return true;
  }

  autoSelectNextUnitType() {
    // Try to select the next available unit type
    const types = ["infantry", "archers", "cavalry"];
    for (const type of types) {
      if (this.playerUnitsToPlace[type] > 0) {
        this.selectUnitTypeToPlace(type);
        return;
      }
    }
    // No units left to place
    this.selectedUnitTypeToPlace = null;
  }

  selectUnitTypeToPlace(type) {
    if (this.playerUnitsToPlace[type] > 0) {
      this.selectedUnitTypeToPlace = type;
      this.updateDeploymentUI();
    }
  }

  showMessage(text) {
    // Show a temporary message on the canvas
    this.deploymentMessage = text;
    this.deploymentMessageTime = 60; // frames
  }

  handleCombatClick(x, y) {
    // Check if clicking on a player unit
    let clickedPlayerUnit = null;
    for (const unit of this.units) {
      if (unit.team === "player" && !unit.isDead && unit.containsPoint(x, y)) {
        clickedPlayerUnit = unit;
        break;
      }
    }

    if (clickedPlayerUnit) {
      // Select single unit (deselect others)
      for (const unit of this.units) {
        if (unit.team === "player") {
          unit.selected = false;
        }
      }
      this.selectedUnit = clickedPlayerUnit;
      this.selectedUnit.selected = true;
      this.updateUnitInfo();
      return;
    }

    // Check if clicking on an enemy unit
    let clickedEnemyUnit = null;
    for (const unit of this.units) {
      if (unit.team === "enemy" && !unit.isDead && unit.containsPoint(x, y)) {
        clickedEnemyUnit = unit;
        break;
      }
    }

    // Get selected units
    const selectedUnits = this.units.filter(
      (u) => u.team === "player" && u.selected && !u.isDead
    );

    if (clickedEnemyUnit && selectedUnits.length > 0) {
      // Attack the enemy with all selected units
      for (const unit of selectedUnits) {
        unit.setFocusTarget(clickedEnemyUnit);
      }
    } else if (selectedUnits.length > 0) {
      // Left-click on empty ground with selected units - move units
      for (const unit of selectedUnits) {
        unit.moveTo(x, y);
      }
    } else {
      // Left-click on empty ground with no selected units - deselect all
      for (const unit of this.units) {
        if (unit.team === "player") {
          unit.selected = false;
        }
      }
      this.selectedUnit = null;
      this.updateUnitInfo();
    }
  }

  createEnemyArmy(composition) {
    const rightSide = this.canvas.width * 0.75;
    const spacing = 60;
    let currentY = 100;

    // Create infantry
    for (let i = 0; i < composition.infantry; i++) {
      const x = rightSide + (Math.random() - 0.5) * 100;
      const y = currentY;
      const unit = new Unit("infantry", "enemy", x, y);
      unit.targetX = x;
      unit.targetY = y;
      this.units.push(unit);
      currentY += spacing;
      if (currentY > this.canvas.height - 100) {
        currentY = 100;
        rightSide += 50;
      }
    }

    // Create archers
    for (let i = 0; i < composition.archers; i++) {
      const x = rightSide + (Math.random() - 0.5) * 100;
      const y = currentY;
      const unit = new Unit("archers", "enemy", x, y);
      unit.targetX = x;
      unit.targetY = y;
      this.units.push(unit);
      currentY += spacing;
      if (currentY > this.canvas.height - 100) {
        currentY = 100;
        rightSide += 50;
      }
    }

    // Create cavalry
    for (let i = 0; i < composition.cavalry; i++) {
      const x = rightSide + (Math.random() - 0.5) * 100;
      const y = currentY;
      const unit = new Unit("cavalry", "enemy", x, y);
      unit.targetX = x;
      unit.targetY = y;
      this.units.push(unit);
      currentY += spacing;
      if (currentY > this.canvas.height - 100) {
        currentY = 100;
        rightSide += 50;
      }
    }
  }

  enterDeploymentPhase() {
    this.phase = "deployment";

    // Auto-select first available unit type
    this.autoSelectNextUnitType();

    // Show deployment UI
    document
      .getElementById("deploymentInstructions")
      .classList.remove("hidden");
    document.getElementById("unitTypeSelector").classList.remove("hidden");

    // Initially hide the start combat button
    document.getElementById("startCombatBtn").style.display = "none";

    this.deploymentMessage = null;
    this.deploymentMessageTime = 0;

    this.updateDeploymentUI();
  }

  updateDeploymentUI() {
    const infantryRemaining = this.playerUnitsToPlace.infantry;
    const archersRemaining = this.playerUnitsToPlace.archers;
    const cavalryRemaining = this.playerUnitsToPlace.cavalry;
    const totalRemaining =
      infantryRemaining + archersRemaining + cavalryRemaining;

    document.getElementById("unitsToPlace").textContent = totalRemaining;
    document.getElementById("infantryRemaining").textContent =
      infantryRemaining;
    document.getElementById("archersRemaining").textContent = archersRemaining;
    document.getElementById("cavalryRemaining").textContent = cavalryRemaining;

    // Update selected state
    const types = ["infantry", "archers", "cavalry"];
    for (const type of types) {
      const btn = document.getElementById(
        `deploy${type.charAt(0).toUpperCase() + type.slice(1)}Btn`
      );
      if (btn) {
        if (type === this.selectedUnitTypeToPlace) {
          btn.classList.add("selected");
        } else {
          btn.classList.remove("selected");
        }
        btn.disabled = this.playerUnitsToPlace[type] === 0;
      }
    }

    if (totalRemaining === 0) {
      document.getElementById("startCombatBtn").style.display = "block";
      document.getElementById("unitTypeSelector").classList.add("hidden");
    }
  }

  startCombat() {
    this.phase = "combat";
    document.getElementById("deploymentInstructions").classList.add("hidden");
    document.getElementById("unitTypeSelector").classList.add("hidden");
    document.getElementById("pauseBtn").style.display = "block";
    this.battleStartTime = Date.now();
    this.pauseStartTime = 0;
    this.pausedTime = 0;
    this.isPaused = false;
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      // Pausing
      this.pauseStartTime = Date.now();
      // Don't show the full overlay, just a banner
      document.getElementById("pauseBanner").classList.remove("hidden");
      document.getElementById("pauseBtn").textContent = "▶ Resume";
    } else {
      // Resuming
      this.pausedTime += Date.now() - this.pauseStartTime;
      document.getElementById("pauseBanner").classList.add("hidden");
      document.getElementById("pauseBtn").textContent = "⏸ Pause";
    }
  }

  update() {
    // Update deployment message timer
    if (this.deploymentMessageTime > 0) {
      this.deploymentMessageTime--;
      if (this.deploymentMessageTime === 0) {
        this.deploymentMessage = null;
      }
    }

    if (this.phase !== "combat") return;

    // Update UI even when paused (for unit selection display)
    this.updateUI();

    // Don't update game state if paused
    if (this.isPaused) return;

    // Update battle time (excluding paused time)
    this.battleTime = Math.floor(
      (Date.now() - this.battleStartTime - this.pausedTime) / 1000
    );

    // Update all units (pass all units for collision detection)
    for (const unit of this.units) {
      unit.update(this.units);
    }

    // Handle combat
    this.handleCombat();

    // Update AI
    this.ai.update();

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }

    // Check victory conditions
    this.checkVictoryConditions();
  }

  createDeathParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  createHitEffect(x, y) {
    for (let i = 0; i < 5; i++) {
      this.particles.push(new Particle(x, y, "rgb(255, 100, 100)"));
    }
  }

  handleCombat() {
    const playerUnits = this.units.filter(
      (u) => u.team === "player" && !u.isDead
    );
    const enemyUnits = this.units.filter(
      (u) => u.team === "enemy" && !u.isDead
    );

    // Player units attack enemies
    for (const unit of playerUnits) {
      // If we have a focus target, prioritize it
      if (unit.focusTarget && !unit.focusTarget.isDead) {
        const wasAlive = !unit.focusTarget.isDead;
        if (unit.attack(unit.focusTarget)) {
          this.createHitEffect(unit.focusTarget.x, unit.focusTarget.y);
          if (unit.focusTarget.isDead && wasAlive) {
            this.enemyKills++;
            this.createDeathParticles(
              unit.focusTarget.x,
              unit.focusTarget.y,
              unit.focusTarget.color
            );
            unit.focusTarget = null;
          }
          continue;
        }
      }

      // Otherwise attack any enemy in range
      for (const enemy of enemyUnits) {
        const wasAlive = !enemy.isDead;
        if (unit.attack(enemy)) {
          this.createHitEffect(enemy.x, enemy.y);
          if (enemy.isDead && wasAlive) {
            this.enemyKills++;
            this.createDeathParticles(enemy.x, enemy.y, enemy.color);
          }
          break;
        }
      }
    }

    // Enemy units attack player
    for (const unit of enemyUnits) {
      for (const player of playerUnits) {
        const wasAlive = !player.isDead;
        if (unit.attack(player)) {
          this.createHitEffect(player.x, player.y);
          if (player.isDead && wasAlive) {
            this.playerLosses++;
            this.createDeathParticles(player.x, player.y, player.color);
          }
          break;
        }
      }
    }
  }

  checkVictoryConditions() {
    const playerUnits = this.units.filter(
      (u) => u.team === "player" && !u.isDead
    );
    const enemyUnits = this.units.filter(
      (u) => u.team === "enemy" && !u.isDead
    );

    if (playerUnits.length === 0 && this.phase === "combat") {
      this.endBattle(false);
    } else if (enemyUnits.length === 0 && this.phase === "combat") {
      this.endBattle(true);
    }
  }

  endBattle(victory) {
    this.phase = "ended";
    this.isPaused = false;
    document.getElementById("pauseBtn").style.display = "none";
    document.getElementById("pauseBanner").classList.add("hidden");

    // Calculate score
    const baseScore = this.enemyKills * 100 - this.playerLosses * 50;
    const timeBonus = Math.max(0, 300 - this.battleTime) * 10;
    const finalScore = Math.max(0, baseScore + timeBonus);

    // Show victory screen
    const overlay = document.getElementById("victoryOverlay");
    const container = overlay.querySelector(".victory-container");

    if (victory) {
      document.getElementById("victoryTitle").textContent = "🎉 Victory! 🎉";
      container.classList.remove("defeat");
    } else {
      document.getElementById("victoryTitle").textContent = "💀 Defeat 💀";
      container.classList.add("defeat");
    }

    document.getElementById("finalScore").textContent = finalScore;
    document.getElementById("enemyKillsDisplay").textContent = this.enemyKills;
    document.getElementById("yourLossesDisplay").textContent =
      this.playerLosses;
    document.getElementById("battleTimeDisplay").textContent =
      this.battleTime + "s";
    document.getElementById("timeBonusDisplay").textContent = timeBonus;

    // Reset submit button and UI for new battle
    const buttonsContainer = document.querySelector(".victory-buttons");
    if (buttonsContainer) {
      // Remove any success message
      const successMsg = buttonsContainer.querySelector(
        ".score-submitted-message"
      );
      if (successMsg) {
        successMsg.remove();
      }

      // Restore submit button if it was removed
      const submitBtn = buttonsContainer.querySelector(".victory-btn.primary");
      if (!submitBtn) {
        const newSubmitBtn = document.createElement("button");
        newSubmitBtn.className = "victory-btn primary";
        newSubmitBtn.onclick = () => battle.submitScore();
        newSubmitBtn.textContent = "Submit Score";
        buttonsContainer.insertBefore(
          newSubmitBtn,
          buttonsContainer.querySelector(".victory-btn.secondary")
        );
      }
    }
    this.scoreSubmitted = false; // Reset flag for new battle

    // Load and show leaderboard when battle ends
    this.loadLeaderboard();

    overlay.classList.remove("hidden");
  }

  async submitScore() {
    // Prevent duplicate submissions (safety check)
    if (this.scoreSubmitted) {
      return;
    }

    const playerName = document.getElementById("playerNameInput").value.trim();
    if (!playerName) {
      alert("Please enter your name!");
      return;
    }

    const baseScore = this.enemyKills * 100 - this.playerLosses * 50;
    const timeBonus = Math.max(0, 300 - this.battleTime) * 10;
    const finalScore = Math.max(0, baseScore + timeBonus);

    if (this.db) {
      try {
        // Format date as string (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const dateString = now.toISOString().slice(0, 19).replace("T", " ");

        await this.db.collection("scores").add({
          name: playerName,
          score: finalScore,
          date: dateString,
        });

        // Mark as submitted and remove the button
        this.scoreSubmitted = true;
        const submitBtn = document.querySelector(".victory-btn.primary");
        if (submitBtn) {
          submitBtn.remove(); // Remove the button entirely
        }

        // Show success message
        const buttonsContainer = document.querySelector(".victory-buttons");
        if (buttonsContainer) {
          const successMsg = document.createElement("div");
          successMsg.className = "score-submitted-message";
          successMsg.innerHTML = "✓ Score Submitted Successfully!";
          successMsg.style.cssText = `
            padding: 15px;
            background: rgba(74, 144, 226, 0.2);
            border: 2px solid #4a90e2;
            border-radius: 6px;
            color: #4affe2;
            text-align: center;
            font-weight: bold;
            margin-bottom: 15px;
          `;
          buttonsContainer.insertBefore(
            successMsg,
            buttonsContainer.firstChild
          );
        }

        // Load and display leaderboard
        await this.loadLeaderboard(playerName);
      } catch (error) {
        console.error("Error submitting score:", error);
        alert("Error submitting score. Check console for details.");
      }
    } else {
      alert("Firebase not configured. Score not saved.");
    }
  }

  async loadLeaderboard(highlightName = null) {
    if (!this.db) return;

    try {
      const snapshot = await this.db
        .collection("scores")
        .orderBy("score", "desc")
        .limit(10)
        .get();

      const leaderboardDiv = document.getElementById("leaderboard");
      const entriesDiv = document.getElementById("leaderboardEntries");
      entriesDiv.innerHTML = "";

      snapshot.forEach((doc, index) => {
        const data = doc.data();
        const entry = document.createElement("div");
        entry.className = "leaderboard-entry";
        if (data.name === highlightName) {
          entry.classList.add("highlight");
        }

        // Ensure score is a number (handle both string and number types)
        const score =
          typeof data.score === "number"
            ? data.score
            : parseInt(data.score, 10) || 0;

        entry.innerHTML = `
                    <span class="leaderboard-rank">${index + 1}.</span>
                    <span class="leaderboard-name">${
                      data.name || "Unknown"
                    }</span>
                    <span class="leaderboard-score">${score}</span>
                `;

        entriesDiv.appendChild(entry);
      });

      leaderboardDiv.classList.remove("hidden");
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  }

  playAgain() {
    window.location.reload();
  }

  draw() {
    // Clear canvas with gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#2d4a3e");
    gradient.addColorStop(1, "#1a2e26");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid pattern for depth
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    this.ctx.lineWidth = 1;
    const gridSize = 50;
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

    // Draw deployment zones during deployment
    if (this.phase === "deployment") {
      this.ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
      this.ctx.fillRect(0, 0, this.canvas.width / 2, this.canvas.height);

      this.ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([10, 10]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.canvas.width / 2, 0);
      this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw deployment instruction on canvas
      this.ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      this.ctx.font = "bold 24px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText("DEPLOY YOUR UNITS HERE", this.canvas.width / 4, 50);

      // Draw selected unit type indicator
      if (this.selectedUnitTypeToPlace) {
        const config = UNIT_TYPES[this.selectedUnitTypeToPlace];
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        this.ctx.font = "bold 18px Arial";
        this.ctx.fillText(`Placing: ${config.name}`, this.canvas.width / 4, 85);

        // Draw placement preview at mouse position
        if (this.mouseX > 0 && this.mouseX < this.canvas.width / 2) {
          const isValid = this.isValidPlacementPosition(
            this.mouseX,
            this.mouseY
          );

          // Draw ghost unit
          this.ctx.save();
          this.ctx.globalAlpha = 0.5;
          this.ctx.translate(this.mouseX, this.mouseY);

          // Draw preview circle
          this.ctx.strokeStyle = isValid ? "#00ff00" : "#ff0000";
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, config.size + 5, 0, Math.PI * 2);
          this.ctx.stroke();

          // Draw unit shape preview
          this.ctx.fillStyle = config.color;
          this.ctx.strokeStyle = isValid ? "#00ff00" : "#ff0000";
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();

          switch (config.shape) {
            case "square":
              this.ctx.rect(
                -config.size / 2,
                -config.size / 2,
                config.size,
                config.size
              );
              break;
            case "triangle":
              this.ctx.moveTo(0, -config.size / 2);
              this.ctx.lineTo(config.size / 2, config.size / 2);
              this.ctx.lineTo(-config.size / 2, config.size / 2);
              this.ctx.closePath();
              break;
            case "hexagon":
              const angleStep = Math.PI / 3;
              for (let i = 0; i < 6; i++) {
                const angle = angleStep * i;
                const x = (Math.cos(angle) * config.size) / 2;
                const y = (Math.sin(angle) * config.size) / 2;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
              }
              this.ctx.closePath();
              break;
          }

          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.restore();
        }
      }
    }

    // Draw deployment message if active
    if (this.deploymentMessage && this.deploymentMessageTime > 0) {
      const alpha = Math.min(1, this.deploymentMessageTime / 20);
      this.ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
      this.ctx.font = "bold 20px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        this.deploymentMessage,
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }

    // Draw pause indicator on canvas during combat
    if (this.phase === "combat" && this.isPaused) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.fillStyle = "rgba(74, 144, 226, 0.9)";
      this.ctx.font = "bold 32px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText("⏸ PAUSED", this.canvas.width / 2, 40);

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(
        "You can still select units and give orders",
        this.canvas.width / 2,
        70
      );

      this.ctx.restore();
    }

    // Draw particles (behind units)
    for (const particle of this.particles) {
      particle.draw(this.ctx);
    }

    // Draw all units
    for (const unit of this.units) {
      unit.draw(this.ctx);
    }

    // Draw visual indicator for dragged unit during deployment
    if (this.phase === "deployment" && this.draggedUnit) {
      this.ctx.save();
      this.ctx.translate(this.draggedUnit.x, this.draggedUnit.y);

      // Draw pulsing ring around dragged unit
      const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
      this.ctx.strokeStyle = `rgba(100, 255, 255, ${pulse})`;
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.draggedUnit.size + 10, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw semi-transparent overlay
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillStyle = this.draggedUnit.color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.draggedUnit.size + 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;

      this.ctx.restore();
    }

    // Draw target indicators on enemy units
    for (const unit of this.units) {
      if (unit.team === "enemy" && !unit.isDead) {
        // Check if any player units are targeting this enemy
        const targetingUnits = this.units.filter(
          (u) => u.team === "player" && !u.isDead && u.focusTarget === unit
        );

        if (targetingUnits.length > 0) {
          // Draw targeting reticle on enemy
          this.ctx.save();
          this.ctx.translate(unit.x, unit.y);

          const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
          this.ctx.strokeStyle = `rgba(255, 50, 50, ${pulse})`;
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([]);

          // Draw crosshair
          this.ctx.beginPath();
          this.ctx.moveTo(-15, 0);
          this.ctx.lineTo(-5, 0);
          this.ctx.moveTo(15, 0);
          this.ctx.lineTo(5, 0);
          this.ctx.moveTo(0, -15);
          this.ctx.lineTo(0, -5);
          this.ctx.moveTo(0, 15);
          this.ctx.lineTo(0, 5);
          this.ctx.stroke();

          // Draw target count
          if (targetingUnits.length > 1) {
            this.ctx.fillStyle = "rgba(255, 50, 50, 0.9)";
            this.ctx.font = "bold 12px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(`×${targetingUnits.length}`, 0, 25);
          }

          this.ctx.restore();
        }
      }
    }

    // Draw drag selection box
    if (this.isDragging && this.phase === "combat") {
      const minX = Math.min(this.dragStartX, this.dragEndX);
      const maxX = Math.max(this.dragStartX, this.dragEndX);
      const minY = Math.min(this.dragStartY, this.dragEndY);
      const maxY = Math.max(this.dragStartY, this.dragEndY);
      const width = maxX - minX;
      const height = maxY - minY;

      // Draw selection box
      this.ctx.strokeStyle = "#00ff00";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(minX, minY, width, height);
      this.ctx.setLineDash([]);

      // Draw semi-transparent fill
      this.ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
      this.ctx.fillRect(minX, minY, width, height);
    }

    // Draw attack lines with pulse effect
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 10) * 0.5 + 0.5;
    this.ctx.lineWidth = 2;

    for (const unit of this.units) {
      if (unit.isDead || unit.attackCooldown < 50) continue;

      const enemies = this.units.filter(
        (u) =>
          u.team !== unit.team && !u.isDead && unit.distanceTo(u) <= unit.range
      );

      for (const enemy of enemies) {
        // Animated attack line
        const alpha = 0.3 + pulse * 0.3;
        this.ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.moveTo(unit.x, unit.y);
        this.ctx.lineTo(enemy.x, enemy.y);
        this.ctx.stroke();

        // Attack impact circle at target
        this.ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(enemy.x, enemy.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Draw centerline
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  updateUI() {
    document.getElementById("phaseDisplay").textContent =
      this.phase === "deployment"
        ? "Deploying"
        : this.phase === "combat"
        ? "Combat"
        : "Ended";

    document.getElementById("timeDisplay").textContent = this.battleTime + "s";

    const playerUnits = this.units.filter(
      (u) => u.team === "player" && !u.isDead
    ).length;
    const enemyUnits = this.units.filter(
      (u) => u.team === "enemy" && !u.isDead
    ).length;

    document.getElementById("playerUnitsDisplay").textContent = playerUnits;
    document.getElementById("enemyUnitsDisplay").textContent = enemyUnits;
    document.getElementById("killsDisplay").textContent = this.enemyKills;
    document.getElementById("lossesDisplay").textContent = this.playerLosses;
  }

  updateUnitInfo() {
    const infoDiv = document.getElementById("unitInfo");

    // Get all selected units
    const selectedUnits = this.units.filter(
      (u) => u.team === "player" && u.selected && !u.isDead
    );

    if (selectedUnits.length === 0) {
      infoDiv.innerHTML = "<p>No unit selected</p>";
      this.selectedUnit = null;
    } else if (selectedUnits.length === 1) {
      // Show single unit info
      const unit = selectedUnits[0];
      this.selectedUnit = unit;
      infoDiv.innerHTML = `
                <p><strong>${unit.name}</strong></p>
                <p>Health: ${Math.ceil(unit.health)}/${unit.maxHealth}</p>
                <p>Damage: ${unit.damage}</p>
                <p>Range: ${unit.range}</p>
                <p>Speed: ${unit.speed}</p>
            `;
    } else {
      // Show group info
      this.selectedUnit = selectedUnits[0]; // Keep reference to first unit

      // Count unit types
      const infantry = selectedUnits.filter(
        (u) => u.type === "infantry"
      ).length;
      const archers = selectedUnits.filter((u) => u.type === "archers").length;
      const cavalry = selectedUnits.filter((u) => u.type === "cavalry").length;

      // Calculate total/average health
      const totalHealth = selectedUnits.reduce((sum, u) => sum + u.health, 0);
      const maxHealth = selectedUnits.reduce((sum, u) => sum + u.maxHealth, 0);
      const avgHealthPercent = Math.round((totalHealth / maxHealth) * 100);

      infoDiv.innerHTML = `
                <p><strong>${selectedUnits.length} Units Selected</strong></p>
                <p>Group Health: ${avgHealthPercent}%</p>
                ${infantry > 0 ? `<p>🟦 Infantry: ${infantry}</p>` : ""}
                ${archers > 0 ? `<p>🔺 Archers: ${archers}</p>` : ""}
                ${cavalry > 0 ? `<p>⬡ Cavalry: ${cavalry}</p>` : ""}
            `;
    }
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Initialize game when page loads
// Declare battle in global scope for onclick handlers
var battle;
window.addEventListener("DOMContentLoaded", () => {
  battle = new Battle();
  // Make battle accessible globally for onclick handlers
  window.battle = battle;
});
