const RotationManager = {
  sceneManager: null,
  selectionManager: null,
  
  rotationCircle: null,
  rotationHandle: null,
  isRotationMode: false,
  rotationCircleVisible: false,
  
  isRotatingWithHandle: false,
  previousAngle: 0,

  init: function(sceneManager, selectionManager) {
    this.sceneManager = sceneManager;
    this.selectionManager = selectionManager;
    
    this.createRotationUI();
    this.bindEvents();
  },

  createRotationUI: function() {
    this.rotationCircle = document.createElement('div');
    this.rotationCircle.className = 'rotation-circle';
    document.body.appendChild(this.rotationCircle);
    
    this.rotationHandle = document.createElement('div');
    this.rotationHandle.className = 'rotation-handle';
    document.body.appendChild(this.rotationHandle);
  },

  bindEvents: function() {
    this.rotationHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.isRotatingWithHandle = true;
      this.previousAngle = this.getMouseAngle(e.clientX, e.clientY);
      document.addEventListener('mousemove', this.onRotationHandleMove.bind(this));
      document.addEventListener('mouseup', this.onRotationHandleUp.bind(this));
    });
  },

  enableRotationMode: function() {
    if (!this.selectionManager.selectedObject) return;
    this.isRotationMode = true;
    this.showRotationCircle();
    ContextMenu.hide();
  },

  resetRotation: function() {
    if (!this.selectionManager.selectedObject) return;
    this.selectionManager.selectedObject.rotation.set(0, 0, 0);
    if (this.rotationCircleVisible) {
      this.updateRotationHandlePosition();
    }
    this.sceneManager.collisionManager.updateAllColliders(this.selectionManager.selectedObject);
    ContextMenu.hide();
  },

  showRotationCircle: function() {
    if (this.selectionManager.selectedObject) {
      this.rotationCircle.style.opacity = '0.7';
      this.rotationHandle.style.display = 'block';
      this.rotationCircleVisible = true;
      this.updateRotationCirclePosition();
    }
  },

  hideRotationCircle: function() {
    this.rotationCircle.style.opacity = '0';
    this.rotationHandle.style.display = 'none';
    this.rotationCircleVisible = false;
    this.isRotationMode = false;
  },

  updateRotationCirclePosition: function() {
    if (!this.selectionManager.selectedObject) return;
    
    const vector = new THREE.Vector3();
    this.selectionManager.selectedObject.getWorldPosition(vector);
    vector.project(window.app.cameraController.camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = -(vector.y * 0.5 - 0.5) * window.innerHeight;
    
    const box = new THREE.Box3().setFromObject(this.selectionManager.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) * 0.6;
    
    this.rotationCircle.style.width = radius * 2 + 'px';
    this.rotationCircle.style.height = radius * 2 + 'px';
    this.rotationCircle.style.left = (x - radius) + 'px';
    this.rotationCircle.style.top = (y - radius) + 'px';
    this.updateRotationHandlePosition();
  },

  updateRotationHandlePosition: function() {
    if (!this.selectionManager.selectedObject) return;
    
    const circleRect = this.rotationCircle.getBoundingClientRect();
    const radius = circleRect.width / 2;
    const centerX = circleRect.left + radius;
    const centerY = circleRect.top + radius;
    const angle = this.selectionManager.selectedObject.rotation.y;
    const handleX = centerX + Math.cos(angle) * radius;
    const handleY = centerY + Math.sin(angle) * radius;
    
    this.rotationHandle.style.left = (handleX - 10) + 'px';
    this.rotationHandle.style.top = (handleY - 10) + 'px';
  },

  onRotationHandleMove: function(e) {
    if (!this.isRotatingWithHandle || !this.selectionManager.selectedObject) return;
    
    const currentAngle = this.getMouseAngle(e.clientX, e.clientY);
    const angleDelta = currentAngle - this.previousAngle;
    this.selectionManager.selectedObject.rotation.y += angleDelta;
    this.updateRotationHandlePosition();
    this.previousAngle = currentAngle;
    
    this.sceneManager.collisionManager.updateAllColliders(this.selectionManager.selectedObject);
  },

  onRotationHandleUp: function() {
    this.isRotatingWithHandle = false;
    document.removeEventListener('mousemove', this.onRotationHandleMove.bind(this));
    document.removeEventListener('mouseup', this.onRotationHandleUp.bind(this));
  },

  getMouseAngle: function(mouseX, mouseY) {
    const circleRect = this.rotationCircle.getBoundingClientRect();
    const circleCenterX = circleRect.left + circleRect.width / 2;
    const circleCenterY = circleRect.top + circleRect.height / 2;
    const dx = mouseX - circleCenterX;
    const dy = mouseY - circleCenterY;
    return Math.atan2(dy, dx);
  }
};