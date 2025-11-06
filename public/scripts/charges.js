// ==================== 
// CONSTANTS
// ====================
const k = 8.99e9; // Coulomb's constant (N⋅m²/C²)
const FIELD_LINE_COUNT = 16; // Field lines per charge
const FIELD_LINE_STEPS = 150; // Integration steps
const FIELD_LINE_STEP_SIZE = 0.08; // Step size for field line integration

// ==================== 
// GLOBAL VARIABLES
// ====================
let scene, camera, renderer, controls;
let chargedObjects = [];
let fieldLines = [];
let placementMode = false; // Start with placement mode off
let currentCharge = 5.0; // in µC
let raycaster, mouse;

// Visualization toggles
let showFieldLines = true;

// ==================== 
// CHARGED OBJECT CLASS
// ====================
class ChargedObject {
    constructor(type, position, charge) {
        this.type = type; // 'sphere', 'rod', 'plane', 'ring'
        this.position = position.clone();
        this.charge = charge; // in µC
        this.mesh = null;
        this.createMesh();
    }

    createMesh() {
        let geometry, material;
        const isPositive = this.charge > 0;
        const color = isPositive ? 0xff3366 : 0x3366ff;

        switch(this.type) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.3, 32, 32);
                material = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.4,
                    transparent: true,
                    opacity: 0.95,
                    shininess: 100,
                    specular: 0x888888
                });
                break;

            case 'rod':
                geometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 32);
                material = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.9,
                    shininess: 80,
                    specular: 0x666666
                });
                break;

            case 'plane':
                geometry = new THREE.BoxGeometry(3, 0.05, 2);
                material = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.75,
                    side: THREE.DoubleSide,
                    shininess: 60,
                    specular: 0x555555
                });
                break;

            case 'ring':
                geometry = new THREE.TorusGeometry(0.8, 0.1, 16, 32);
                material = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.4,
                    transparent: true,
                    opacity: 0.9,
                    shininess: 90,
                    specular: 0x777777
                });
                break;
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.userData.chargedObject = this;
        
        // Rotate rod to be horizontal instead of vertical
        if (this.type === 'rod') {
            this.mesh.rotation.z = Math.PI / 2; // Rotate 90 degrees to make horizontal
        }
        
        // Add enhanced glow effect
        const glowGeometry = geometry.clone();
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.25,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.scale.set(1.3, 1.3, 1.3);
        this.mesh.add(glow);
        
        // Add inner glow
        const innerGlowGeometry = geometry.clone();
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        innerGlow.scale.set(1.15, 1.15, 1.15);
        this.mesh.add(innerGlow);

        scene.add(this.mesh);
    }

    // Calculate electric field at a point
    getElectricField(point) {
        const field = new THREE.Vector3();
        
        switch(this.type) {
            case 'sphere':
                return this.getSphereField(point);
            
            case 'rod':
                return this.getRodField(point);
            
            case 'plane':
                return this.getPlaneField(point);
            
            case 'ring':
                return this.getRingField(point);
        }
        
        return field;
    }

    getSphereField(point) {
        const r = new THREE.Vector3().subVectors(point, this.position);
        const distance = r.length();
        
        if (distance < 0.01) return new THREE.Vector3(0, 0, 0);
        
        // E = kQ/r² in direction of r
        const magnitude = (k * this.charge * 1e-6) / (distance * distance);
        return r.normalize().multiplyScalar(magnitude);
    }

    getRodField(point) {
        // Simplified: treat as line of point charges (horizontal rod along X-axis)
        const field = new THREE.Vector3();
        const numSegments = 10;
        const rodLength = 2;
        const chargePerSegment = this.charge / numSegments;
        
        for (let i = 0; i < numSegments; i++) {
            const t = (i / (numSegments - 1) - 0.5) * rodLength;
            const segmentPos = this.position.clone().add(new THREE.Vector3(t, 0, 0));
            
            const r = new THREE.Vector3().subVectors(point, segmentPos);
            const distance = r.length();
            
            if (distance > 0.01) {
                const magnitude = (k * chargePerSegment * 1e-6) / (distance * distance);
                field.add(r.normalize().multiplyScalar(magnitude));
            }
        }
        
        return field;
    }

    getPlaneField(point) {
        // Simplified infinite plane: uniform field perpendicular to plane
        const surfaceChargeDensity = this.charge * 1e-6 / 6; // Approximate
        const magnitude = surfaceChargeDensity / (2 * 8.854e-12); // σ/(2ε₀)
        
        // Field perpendicular to plane (assuming plane is horizontal)
        const normal = new THREE.Vector3(0, 1, 0);
        const field = normal.multiplyScalar(magnitude * (point.y > this.position.y ? 1 : -1));
        
        return field;
    }

    getRingField(point) {
        // Ring field calculation (simplified with segments)
        const field = new THREE.Vector3();
        const numSegments = 20;
        const radius = 0.8;
        const chargePerSegment = this.charge / numSegments;
        
        for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const segmentPos = this.position.clone().add(new THREE.Vector3(x, 0, z));
            
            const r = new THREE.Vector3().subVectors(point, segmentPos);
            const distance = r.length();
            
            if (distance > 0.01) {
                const magnitude = (k * chargePerSegment * 1e-6) / (distance * distance);
                field.add(r.normalize().multiplyScalar(magnitude));
            }
        }
        
        return field;
    }

    remove() {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

// ==================== 
// FIELD LINE CLASS
// ====================
class FieldLine {
    constructor(startPos, direction, isBackward = false) {
        this.points = [];
        this.line = null;
        this.isBackward = isBackward;
        this.generate(startPos, direction, isBackward);
    }

    generate(startPos, direction, isBackward) {
        let currentPos = startPos.clone();
        
        this.points.push(currentPos.clone());
        
        for (let i = 0; i < FIELD_LINE_STEPS; i++) {
            // Get total field at current position
            const field = getTotalElectricField(currentPos);
            
            if (field.length() < 1e-4) break; // Field too weak
            
            // Get field direction
            let fieldDir = field.clone().normalize();
            
            // If backward (toward negative charge), reverse direction
            if (isBackward) {
                fieldDir.negate();
            }
            
            // RK4 integration for accurate field line tracing
            const h = FIELD_LINE_STEP_SIZE;
            
            // k1 = h * f(t, y)
            const k1 = fieldDir.clone().multiplyScalar(h);
            
            // k2 = h * f(t + h/2, y + k1/2)
            const pos2 = currentPos.clone().add(k1.clone().multiplyScalar(0.5));
            let field2 = getTotalElectricField(pos2);
            if (field2.length() < 1e-6) break;
            field2.normalize();
            if (isBackward) field2.negate();
            const k2 = field2.multiplyScalar(h);
            
            // k3 = h * f(t + h/2, y + k2/2)
            const pos3 = currentPos.clone().add(k2.clone().multiplyScalar(0.5));
            let field3 = getTotalElectricField(pos3);
            if (field3.length() < 1e-6) break;
            field3.normalize();
            if (isBackward) field3.negate();
            const k3 = field3.multiplyScalar(h);
            
            // k4 = h * f(t + h, y + k3)
            const pos4 = currentPos.clone().add(k3.clone());
            let field4 = getTotalElectricField(pos4);
            if (field4.length() < 1e-6) break;
            field4.normalize();
            if (isBackward) field4.negate();
            const k4 = field4.multiplyScalar(h);
            
            // y_next = y + (k1 + 2*k2 + 2*k3 + k4) / 6
            const step = new THREE.Vector3()
                .add(k1)
                .add(k2.clone().multiplyScalar(2))
                .add(k3.clone().multiplyScalar(2))
                .add(k4)
                .multiplyScalar(1/6);
            
            currentPos.add(step);
            this.points.push(currentPos.clone());
            
            // Check if we've gone too far
            if (currentPos.length() > 25) break;
            
            // Check if we hit a charge (termination condition)
            let hitCharge = false;
            for (let obj of chargedObjects) {
                const dist = currentPos.distanceTo(obj.position);
                // Larger termination radius for better visual
                const terminationRadius = obj.type === 'sphere' ? 0.35 : 0.5;
                if (dist < terminationRadius) {
                    hitCharge = true;
                    break;
                }
            }
            if (hitCharge) break;
        }
        
        this.createLine();
    }

    createLine() {
        if (this.points.length < 2) return;
        
        const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        
        // Create gradient-like effect with opacity based on position
        const colors = [];
        const opacities = [];
        
        for (let i = 0; i < this.points.length; i++) {
            const t = i / (this.points.length - 1);
            // Fade out at the ends
            const opacity = Math.sin(t * Math.PI) * 0.8 + 0.2;
            colors.push(0, 0.87, 1); // Cyan RGB
            opacities.push(opacity);
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.LineBasicMaterial({
            color: 0x00ddff,
            transparent: true,
            opacity: 0.7,
            linewidth: 2,
            vertexColors: false
        });
        
        this.line = new THREE.Line(geometry, material);
        scene.add(this.line);
        
        // Add directional arrows along the line
        this.addArrows();
    }
    
    addArrows() {
        if (this.points.length < 10) return;
        
        // Add arrows at intervals along the line
        const arrowInterval = Math.floor(this.points.length / 4); // 3-4 arrows per line
        
        for (let i = arrowInterval; i < this.points.length - 5; i += arrowInterval) {
            const point = this.points[i];
            const nextPoint = this.points[i + 3]; // Look ahead for direction
            
            // Calculate direction vector along the line
            let direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
            
            // If this is a backward-traced line (to negative charge),
            // reverse the arrow direction so it points TOWARD the charge
            if (this.isBackward) {
                direction.multiplyScalar(-1);
            }
            
            // Create arrow cone geometry with better appearance
            const coneGeometry = new THREE.ConeGeometry(0.08, 0.2, 12);
            const coneMaterial = new THREE.MeshPhongMaterial({
                color: 0x00ddff,
                emissive: 0x00aacc,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.85,
                shininess: 100,
                specular: 0x88ccff
            });
            
            const arrow = new THREE.Mesh(coneGeometry, coneMaterial);
            arrow.position.copy(point);
            
            // Orient the cone in the direction of the field
            const axis = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);
            arrow.setRotationFromQuaternion(quaternion);
            
            scene.add(arrow);
            
            // Store arrow reference so we can remove it later
            if (!this.arrows) this.arrows = [];
            this.arrows.push(arrow);
        }
    }

    remove() {
        if (this.line) {
            scene.remove(this.line);
            this.line.geometry.dispose();
            this.line.material.dispose();
        }
        
        // Remove arrows
        if (this.arrows) {
            this.arrows.forEach(arrow => {
                scene.remove(arrow);
                arrow.geometry.dispose();
                arrow.material.dispose();
            });
            this.arrows = [];
        }
    }
}

// ==================== 
// PHYSICS FUNCTIONS
// ====================
function getTotalElectricField(point) {
    const totalField = new THREE.Vector3();
    
    for (let obj of chargedObjects) {
        const field = obj.getElectricField(point);
        totalField.add(field);
    }
    
    return totalField;
}

function generateFieldLines() {
    // Clear existing field lines
    fieldLines.forEach(line => line.remove());
    fieldLines = [];
    
    if (!showFieldLines || chargedObjects.length === 0) return;
    
    // Helper function for Fibonacci sphere distribution (better than random)
    function getFibonacciSpherePoint(i, n) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / n);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);
        
        return new THREE.Vector3(x, y, z);
    }
    
    // Generate field lines FROM positive charges (outward)
    for (let obj of chargedObjects) {
        if (obj.charge <= 0) continue;
        
        const numLines = Math.min(FIELD_LINE_COUNT, Math.max(8, Math.abs(obj.charge) * 2));
        const startRadius = obj.type === 'sphere' ? 0.35 : 0.55;
        
        for (let i = 0; i < numLines; i++) {
            const direction = getFibonacciSpherePoint(i, numLines);
            const startPos = obj.position.clone().add(direction.clone().multiplyScalar(startRadius));
            
            const fieldLine = new FieldLine(startPos, direction, false);
            fieldLines.push(fieldLine);
        }
    }
    
    // Generate field lines TO negative charges (inward/backward)
    for (let obj of chargedObjects) {
        if (obj.charge >= 0) continue;
        
        const numLines = Math.min(FIELD_LINE_COUNT, Math.max(8, Math.abs(obj.charge) * 2));
        const startRadius = obj.type === 'sphere' ? 0.35 : 0.55;
        
        for (let i = 0; i < numLines; i++) {
            const direction = getFibonacciSpherePoint(i, numLines);
            const startPos = obj.position.clone().add(direction.clone().multiplyScalar(startRadius));
            
            // For negative charges, we trace backward (against the field)
            const fieldLine = new FieldLine(startPos, direction, true);
            fieldLines.push(fieldLine);
        }
    }
}

function generateForceVectors() {
    // Clear existing force vectors
    forceVectors.forEach(arrow => scene.remove(arrow));
    forceVectors = [];
    
    if (!showForceVectors) return;
    
    // Create a grid of test points
    const gridSize = 5;
    const spacing = 2;
    
    for (let x = -gridSize; x <= gridSize; x += spacing) {
        for (let y = -gridSize; y <= gridSize; y += spacing) {
            for (let z = -gridSize; z <= gridSize; z += spacing) {
                const point = new THREE.Vector3(x, y, z);
                
                // Don't place vectors too close to charges
                let tooClose = false;
                for (let obj of chargedObjects) {
                    if (point.distanceTo(obj.position) < 0.8) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;
                
                const field = getTotalElectricField(point);
                const magnitude = field.length();
                
                if (magnitude < 1e-2) continue;
                
                const direction = field.normalize();
                const arrowLength = Math.min(magnitude * FORCE_VECTOR_SCALE * 1e-9, 1);
                
                const arrowHelper = new THREE.ArrowHelper(
                    direction,
                    point,
                    arrowLength,
                    0xffff00,
                    arrowLength * 0.2,
                    arrowLength * 0.15
                );
                
                scene.add(arrowHelper);
                forceVectors.push(arrowHelper);
            }
        }
    }
}

function generateTestParticles() {
    // Clear existing test particles
    testParticles.forEach(particle => scene.remove(particle));
    testParticles = [];
    
    if (!showTestParticles) return;
    
    // Create a few test particles
    const particlePositions = [
        new THREE.Vector3(2, 0, 0),
        new THREE.Vector3(-2, 0, 0),
        new THREE.Vector3(0, 2, 0),
        new THREE.Vector3(0, -2, 0)
    ];
    
    for (let pos of particlePositions) {
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(pos);
        
        scene.add(particle);
        testParticles.push(particle);
        
        // Add force vector
        const field = getTotalElectricField(pos);
        const magnitude = field.length();
        if (magnitude > 1e-2) {
            const direction = field.normalize();
            const arrowLength = Math.min(magnitude * FORCE_VECTOR_SCALE * 1e-9, 1);
            
            const arrowHelper = new THREE.ArrowHelper(
                direction,
                pos,
                arrowLength,
                0x00ff00,
                arrowLength * 0.3,
                arrowLength * 0.2
            );
            
            scene.add(arrowHelper);
            testParticles.push(arrowHelper);
        }
    }
}

function updateVisualizations() {
    generateFieldLines();
}

// ==================== 
// THREE.JS SETUP
// ====================
function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 15, 50);
    
    // Add subtle background gradient effect
    const bgGeometry = new THREE.SphereGeometry(45, 32, 32);
    const bgMaterial = new THREE.MeshBasicMaterial({
        color: 0x1a1a3e,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.3
    });
    const bgSphere = new THREE.Mesh(bgGeometry, bgMaterial);
    scene.add(bgSphere);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.cursor = 'grab'; // Default cursor (placement off)
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 30;
    
    // Update cursor during interaction
    controls.addEventListener('start', () => {
        if (!placementMode) {
            renderer.domElement.style.cursor = 'grabbing';
        }
    });
    controls.addEventListener('end', () => {
        renderer.domElement.style.cursor = placementMode ? 'crosshair' : 'grab';
    });
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x6366f1, 1.5, 100);
    pointLight1.position.set(10, 10, 10);
    pointLight1.castShadow = true;
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xec4899, 1.2, 100);
    pointLight2.position.set(-10, -10, -10);
    pointLight2.castShadow = true;
    scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0x8b5cf6, 0.8, 80);
    pointLight3.position.set(0, 15, 0);
    scene.add(pointLight3);
    
    // Directional light for better depth
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    
    // Grid Helper with better styling
    const gridHelper = new THREE.GridHelper(20, 20, 0x4444aa, 0x222255);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);
    
    // Subtle axes helper
    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.material.transparent = true;
    axesHelper.material.opacity = 0.5;
    scene.add(axesHelper);
    
    // Raycaster for object placement
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onCanvasClick);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onCanvasClick(event) {
    if (!placementMode) return;
    
    // Calculate mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast to find intersection with grid plane
    raycaster.setFromCamera(mouse, camera);
    
    // Create an invisible plane at y=0 for object placement
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    if (intersectPoint) {
        // Create new charged sphere
        const newObject = new ChargedObject('sphere', intersectPoint, currentCharge);
        chargedObjects.push(newObject);
        updateVisualizations();
    }
}

// ==================== 
// UI CONTROLS
// ====================
function setupControls() {
    // Charge slider
    const chargeSlider = document.getElementById('charge-slider');
    const chargeValue = document.getElementById('charge-value');
    
    chargeSlider.addEventListener('input', (e) => {
        currentCharge = parseFloat(e.target.value);
        const sign = currentCharge >= 0 ? '+' : '';
        chargeValue.textContent = sign + currentCharge.toFixed(1);
    });
    
    // Toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const toggleType = toggle.dataset.toggle;
            
            if (toggleType === 'field-lines') {
                showFieldLines = toggle.classList.contains('active');
                updateVisualizations();
            } else if (toggleType === 'placement-mode') {
                placementMode = toggle.classList.contains('active');
                // Update cursor based on placement mode
                renderer.domElement.style.cursor = placementMode ? 'crosshair' : 'grab';
            }
        });
    });
}

// ==================== 
// PRESET SCENARIOS
// ====================
function loadPreset(presetName) {
    clearScene();
    
    switch(presetName) {
        case 'dipole':
            // Simple electric dipole - opposite charges
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-2, 0, 0), 6));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(2, 0, 0), -6));
            break;
            
        case 'quadrupole':
            // Four charges in a square pattern - alternating signs
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-2, 0, -2), 5));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(2, 0, -2), -5));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-2, 0, 2), -5));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(2, 0, 2), 5));
            break;
            
        case 'triangle':
            // Equilateral triangle - two positive, one negative
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(0, 0, -2.3), 6));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-2, 0, 1.15), 6));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(2, 0, 1.15), -8));
            break;
            
        case 'line':
            // Linear array of alternating charges
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-4, 0, 0), 5));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-2, 0, 0), -5));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(0, 0, 0), 5));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(2, 0, 0), -5));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(4, 0, 0), 5));
            break;
            
        case 'hexagon':
            // Six charges in a hexagonal pattern around center
            const radius = 3;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                const charge = (i % 2 === 0) ? 5 : -5; // Alternating charges
                chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(x, 0, z), charge));
            }
            break;
            
        case 'surrounded':
            // Central positive charge surrounded by negative charges
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(0, 0, 0), 8));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(2.5, 0, 0), -4));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-2.5, 0, 0), -4));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(0, 0, 2.5), -4));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(0, 0, -2.5), -4));
            break;
            
        case 'complex':
            // Complex asymmetric configuration
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-3, 0, -3), 7));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(3, 0, -3), -4));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-3, 0, 3), -4));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(3, 0, 3), 7));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(0, 0, 0), -6));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(-1.5, 0, 0), 3));
            chargedObjects.push(new ChargedObject('sphere', new THREE.Vector3(1.5, 0, 0), 3));
            break;
    }
    
    updateVisualizations();
}

function clearScene() {
    // Remove all charged objects
    chargedObjects.forEach(obj => obj.remove());
    chargedObjects = [];
    
    // Clear visualizations
    fieldLines.forEach(line => line.remove());
    fieldLines = [];
}

function resetCamera() {
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    controls.reset();
}

// ==================== 
// ANIMATION LOOP
// ====================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Subtle pulsing animation for charged objects
    const time = Date.now() * 0.001;
    chargedObjects.forEach((obj, index) => {
        if (obj.mesh) {
            const pulse = Math.sin(time * 2 + index) * 0.02 + 1;
            obj.mesh.children.forEach(child => {
                if (child.material && child.material.transparent) {
                    child.scale.set(pulse * 1.2, pulse * 1.2, pulse * 1.2);
                }
            });
        }
    });
    
    renderer.render(scene, camera);
}

// ==================== 
// INITIALIZATION
// ====================
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    setupControls();
    animate();
    
    // Load a default preset with smooth fade-in
    setTimeout(() => {
        loadPreset('dipole');
    }, 800);
});

