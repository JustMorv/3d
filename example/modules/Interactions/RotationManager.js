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
    
    // Добавляем стили для rotation-circle и rotation-handle
    this.addStyles();
  },

  addStyles: function() {
    if (!document.getElementById('rotation-styles')) {
      const style = document.createElement('style');
      style.id = 'rotation-styles';
      style.textContent = `
        .rotation-circle {
          position: fixed;
          border-radius: 50%;
          border: 3px dashed rgba(74, 110, 224, 0.9);
          pointer-events: none;
          z-index: 1000;
          transition: opacity 0.2s ease;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.5), inset 0 0 0 2px rgba(255,255,255,0.3);
          background: radial-gradient(circle, rgba(74,110,224,0.1) 0%, rgba(74,110,224,0) 70%);
        }
        .rotation-handle {
          position: fixed;
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #4a6ee0, #7c3aed);
          border-radius: 50%;
          cursor: grab;
          z-index: 1001;
          box-shadow: 0 2px 15px rgba(0,0,0,0.3);
          border: 2px solid white;
          pointer-events: auto;
          transition: transform 0.1s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .rotation-handle:active {
          cursor: grabbing;
          transform: scale(0.95);
        }
        .rotation-handle::before {
          content: "↻";
          color: white;
          font-size: 18px;
          font-weight: bold;
        }
      `;
      document.head.appendChild(style);
    }
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
      if (!this.isRotationMode) return;
      this.isRotatingWithHandle = true;
      this.previousAngle = this.getMouseAngle(e.clientX, e.clientY);
      document.addEventListener('mousemove', this.onRotationHandleMove.bind(this));
      document.addEventListener('mouseup', this.onRotationHandleUp.bind(this));
    });
  },

  enableRotationMode: function() {
    if (!this.selectionManager.selectedObject) {
      if (window.app.uiManager) {
        window.app.uiManager.showNotification('Сначала выберите объект', 'warning');
      }
      return;
    }
    this.isRotationMode = true;
    this.showRotationCircle();
    ContextMenu.hide();
    if (window.app.uiManager) {
      window.app.uiManager.showNotification('Режим вращения включен. Потяните за ручку', 'info', 2000);
    }
  },

  resetRotation: function() {
    if (!this.selectionManager.selectedObject) return;
    this.selectionManager.selectedObject.rotation.set(0, 0, 0);
    if (this.rotationCircleVisible) {
      this.updateRotationHandlePosition();
    }
    if (this.sceneManager.collisionManager) {
      this.sceneManager.collisionManager.updateAllColliders(this.selectionManager.selectedObject);
    }
    ContextMenu.hide();
    if (window.app.uiManager) {
      window.app.uiManager.showNotification('Вращение сброшено', 'info', 1000);
    }
  },

  showRotationCircle: function() {
    if (this.selectionManager.selectedObject) {
      this.rotationCircle.style.display = 'block';
      this.rotationCircle.style.opacity = '0.85';
      this.rotationHandle.style.display = 'flex';
      this.rotationCircleVisible = true;
      this.updateRotationCirclePosition();
    }
  },

  hideRotationCircle: function() {
    this.rotationCircle.style.display = 'none';
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
    const radius = Math.max(size.x, size.z) * 0.8;
    
    this.rotationCircle.style.width = (radius * 2) + 'px';
    this.rotationCircle.style.height = (radius * 2) + 'px';
    this.rotationCircle.style.left = (x - radius) + 'px';
    this.rotationCircle.style.top = (y - radius) + 'px';
    this.updateRotationHandlePosition();
  },

  updateRotationHandlePosition: function() {
    if (!this.selectionManager.selectedObject) return;
    
    const circleRect = this.rotationCircle.getBoundingClientRect();
    if (circleRect.width === 0) return;
    
    const radius = circleRect.width / 2;
    const centerX = circleRect.left + radius;
    const centerY = circleRect.top + radius;
    const angle = this.selectionManager.selectedObject.rotation.y;
    const handleX = centerX + Math.cos(angle) * radius;
    const handleY = centerY + Math.sin(angle) * radius;
    
    this.rotationHandle.style.left = (handleX - 15) + 'px';
    this.rotationHandle.style.top = (handleY - 15) + 'px';
  },

  onRotationHandleMove: function(e) {
    if (!this.isRotatingWithHandle || !this.selectionManager.selectedObject) return;
    
    const currentAngle = this.getMouseAngle(e.clientX, e.clientY);
    let angleDelta = currentAngle - this.previousAngle;
    
    // Нормализуем дельту
    if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
    if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
    
    this.selectionManager.selectedObject.rotation.y += angleDelta;
    this.updateRotationHandlePosition();
    this.previousAngle = currentAngle;
    
    if (this.sceneManager.collisionManager) {
      this.sceneManager.collisionManager.updateAllColliders(this.selectionManager.selectedObject);
    }
  },

  onRotationHandleUp: function() {
    this.isRotatingWithHandle = false;
    document.removeEventListener('mousemove', this.onRotationHandleMove.bind(this));
    document.removeEventListener('mouseup', this.onRotationHandleUp.bind(this));
  },

  getMouseAngle: function(mouseX, mouseY) {
    const circleRect = this.rotationCircle.getBoundingClientRect();
    if (circleRect.width === 0) return 0;
    const circleCenterX = circleRect.left + circleRect.width / 2;
    const circleCenterY = circleRect.top + circleRect.height / 2;
    const dx = mouseX - circleCenterX;
    const dy = mouseY - circleCenterY;
    return Math.atan2(dy, dx);
  }
};