const SelectionManager = {
  sceneManager: null,
  uiManager: null,
  modelManager: null,
  collisionManager: null,
  dragManager: null,
  
  selectedObject: null,
  originalObjectState: null,
  
  gearIcon: null,
  gearVisible: false,
  
  widthSlider: null,
  widthControl: null,
  isWidthMode: false,
  originalWidth: 0,

  init: function(sceneManager, uiManager, modelManager, collisionManager, dragManager) {
    this.sceneManager = sceneManager;
    this.uiManager = uiManager;
    this.modelManager = modelManager;
    this.collisionManager = collisionManager;
    this.dragManager = dragManager;
    
    this.createGearIcon();
  },

  createGearIcon: function() {
    this.gearIcon = document.createElement('div');
    this.gearIcon.className = 'gear-icon';
    this.gearIcon.innerHTML = '⚙️';
    this.gearIcon.style.display = 'none';
    document.body.appendChild(this.gearIcon);
    
    this.gearIcon.addEventListener('mouseenter', () => {
      this.gearIcon.style.transform = 'scale(1.1)';
      this.gearIcon.style.background = '#3a5ed0';
    });
    
    this.gearIcon.addEventListener('mouseleave', () => {
      this.gearIcon.style.transform = 'scale(1)';
      this.gearIcon.style.background = '#4a6ee0';
    });
    
    this.gearIcon.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    this.gearIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      ContextMenu.show(e.clientX, e.clientY);
    });
  },

  selectObject: function(object) {
    this.selectedObject = object;
    this.setObjectHighlight(object, true);
    this.saveOriginalState(object);
    this.updateGearIconPosition();
    this.showGearIcon();
  },

  deselectObject: function() {
    if (this.selectedObject) {
      this.setObjectHighlight(this.selectedObject, false);
      this.hideGearIcon();
      if (window.app.rotationManager) {
        window.app.rotationManager.hideRotationCircle();
      }
      this.disableWidthMode();
      this.selectedObject = null;
      ContextMenu.hide();
    }
  },

  deleteSelected: function() {
    if (this.selectedObject) {
      this.sceneManager.removeObject(this.selectedObject);
      this.deselectObject();
    } else {
      alert('Сначала выберите объект (кликните по нему)');
    }
  },

  setObjectHighlight: function(object, highlight, highlightColor) {
    object.traverse((child) => {
      if (child.isMesh) {
        if (highlight) {
          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material;
          }
          
          const highlightMaterial = new THREE.MeshLambertMaterial({
            color: highlightColor || 0x4a6ee0,
            emissive: highlightColor === 0xff0000 ? 0x440000 : 
                     highlightColor === 0x00ff00 ? 0x004400 : 0x001144,
            transparent: true,
            opacity: 0.3,
            wireframe: false
          });
          
          if (Array.isArray(child.material)) {
            child.material = child.material.map(() => highlightMaterial.clone());
          } else {
            child.material = highlightMaterial;
          }
        } else if (child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial;
        }
      }
    });
  },

  saveOriginalState: function(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    
    this.originalObjectState = {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
      width: object.userData.originalWidth || size.x,
      depth: object.userData.originalDepth || size.z,
      originalScale: object.userData.originalScale || object.scale.x
    };
    
    if (!object.userData.originalWidth) {
      object.userData.originalWidth = size.x;
    }
    if (!object.userData.originalDepth) {
      object.userData.originalDepth = size.z;
    }
    if (!object.userData.originalScale && object.userData.type === 'model') {
      object.userData.originalScale = object.scale.x;
    }
  },

  updateGearIconPosition: function() {
    if (!this.selectedObject || !this.gearVisible) return;
    
    const vector = new THREE.Vector3();
    this.selectedObject.getWorldPosition(vector);
    vector.project(this.dragManager.cameraController.camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = -(vector.y * 0.5 - 0.5) * window.innerHeight;
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    
    this.gearIcon.style.left = (x + size.x * 1.5) + 'px';
    this.gearIcon.style.top = (y - size.y * 0.5) + 'px';
  },

  showGearIcon: function() {
    if (this.selectedObject) {
      this.gearIcon.style.display = 'flex';
      this.gearVisible = true;
      this.updateGearIconPosition();
    }
  },

  hideGearIcon: function() {
    this.gearIcon.style.display = 'none';
    this.gearVisible = false;
  },

  scaleObject: function(factor) {
    if (!this.selectedObject) {
      alert('Сначала выберите объект');
      return;
    }
    
    const newScale = this.selectedObject.scale.x * factor;
    
    if (newScale > 0.1 && newScale < 5) {
      this.selectedObject.scale.setScalar(newScale);
      
      this.collisionManager.updateAllColliders(this.selectedObject);
      
      this.updateGearIconPosition();
      if (window.app.rotationManager && window.app.rotationManager.isRotationMode) {
        window.app.rotationManager.updateRotationCirclePosition();
      }
    }
  },

  alignToFloor: function() {
    if (!this.selectedObject) {
      alert('Сначала выберите объект');
      return;
    }
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const minY = box.min.y;
    
    DebugHelper.log('Выравнивание объекта:', {
      currentMinY: minY,
      currentPosition: this.selectedObject.position,
      floorLevel: this.sceneManager.floorLevel
    });
    
    if (minY < this.sceneManager.floorLevel) {
      const correction = this.sceneManager.floorLevel - minY;
      this.selectedObject.position.y += correction;
      
      this.collisionManager.updateAllColliders(this.selectedObject);
      
      DebugHelper.log('Объект поднят на:', correction, 'новое положение Y:', this.selectedObject.position.y);
      
      this.updateGearIconPosition();
      if (window.app.rotationManager && window.app.rotationManager.isRotationMode) {
        window.app.rotationManager.updateRotationCirclePosition();
      }
    }
  },

  enableWidthMode: function() {
    if (!this.selectedObject) {
      alert('Сначала выберите объект');
      return;
    }
    
    this.isWidthMode = true;
    ContextMenu.hide();
    this.hideGearIcon();
    
    if (window.app.rotationManager) {
      window.app.rotationManager.hideRotationCircle();
    }
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    this.originalWidth = size.x;
    
    if (this.selectedObject.userData.originalWidth) {
      this.originalWidth = this.selectedObject.userData.originalWidth;
    }
    
    this.createWidthControl();
    
    const currentBox = new THREE.Box3().setFromObject(this.selectedObject);
    const currentSize = currentBox.getSize(new THREE.Vector3());
    let currentPercentage = Math.round((currentSize.x / this.originalWidth) * 100);
    
    currentPercentage = Math.max(50, Math.min(200, currentPercentage));
    
    this.widthSlider.value = currentPercentage;
    document.getElementById('widthValue').innerHTML = 'Текущая ширина: ' + currentPercentage + '%';
    this.widthControl.style.display = 'block';
  },

  createWidthControl: function() {
    if (this.widthControl) {
      document.body.removeChild(this.widthControl);
    }
    
    this.widthControl = document.createElement('div');
    this.widthControl.className = 'width-control';
    this.widthControl.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; color: #333;">📏 Изменение ширины объекта</div>
      <div style="margin: 15px 0;">
        <input type="range" id="widthSlider" min="10" max="300" value="100" style="width: 100%;">
      </div>
      <div id="widthValue" style="margin-top: 10px; font-size: 14px; color: #666; font-weight: bold;">Текущая ширина: 100%</div>
      <div style="display: flex; justify-content: space-between; margin-top: 10px; gap: 5px;">
        <button onclick="window.app.selectionManager.setWidthPercentage(50)">50%</button>
        <button onclick="window.app.selectionManager.setWidthPercentage(75)">75%</button>
        <button onclick="window.app.selectionManager.setWidthPercentage(100)">100%</button>
        <button onclick="window.app.selectionManager.setWidthPercentage(125)">125%</button>
        <button onclick="window.app.selectionManager.setWidthPercentage(150)">150%</button>
        <button onclick="window.app.selectionManager.setWidthPercentage(200)">200%</button>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button onclick="window.app.selectionManager.resetWidth()" style="flex: 1;">🔄 Сбросить</button>
        <button onclick="window.app.selectionManager.disableWidthMode()" style="flex: 1;">✕ Закрыть</button>
      </div>
    `;
    
    document.body.appendChild(this.widthControl);
    
    this.widthSlider = document.getElementById('widthSlider');
    
    this.widthSlider.addEventListener('input', () => {
      const value = parseInt(this.widthSlider.value);
      document.getElementById('widthValue').innerHTML = 'Текущая ширина: ' + value + '%';
      
      if (this.selectedObject && this.originalWidth) {
        const newWidth = (this.originalWidth * value) / 100;
        this.changeObjectWidth(newWidth);
      }
    });
  },

  setWidthPercentage: function(percentage) {
    if (this.widthSlider) {
      this.widthSlider.value = percentage;
      this.widthSlider.dispatchEvent(new Event('input'));
    }
  },

  changeObjectWidth: function(newWidth) {
    if (!this.selectedObject || !this.originalWidth) return;
    
    const widthScaleFactor = newWidth / this.originalWidth;
    const originalScale = this.selectedObject.userData.originalScale || 1;
    
    if (this.selectedObject.userData.type === 'model') {
      const newScale = originalScale * (newWidth / this.selectedObject.userData.originalWidth);
      this.selectedObject.scale.setScalar(newScale);
    } else {
      this.selectedObject.scale.x = widthScaleFactor;
    }
    
    this.collisionManager.updateAllColliders(this.selectedObject);
    
    this.selectedObject.userData.originalWidth = newWidth;
  },

  resetWidth: function() {
    if (this.widthSlider) {
      this.widthSlider.value = 100;
      this.widthSlider.dispatchEvent(new Event('input'));
    }
  },

  disableWidthMode: function() {
    this.isWidthMode = false;
    if (this.widthControl) {
      this.widthControl.style.display = 'none';
    }
    
    if (this.selectedObject) {
      this.updateGearIconPosition();
      this.showGearIcon();
    }
  },

  resetObject: function() {
    if (!this.selectedObject || !this.originalObjectState) return;
    
    this.selectedObject.position.copy(this.originalObjectState.position);
    this.selectedObject.rotation.copy(this.originalObjectState.rotation);
    this.selectedObject.scale.copy(this.originalObjectState.scale);
    
    this.collisionManager.updateAllColliders(this.selectedObject);
    
    this.selectedObject.userData.originalWidth = this.originalObjectState.width;
    this.selectedObject.userData.originalDepth = this.originalObjectState.depth;
    
    this.updateGearIconPosition();
    if (window.app.rotationManager && window.app.rotationManager.isRotationMode) {
      window.app.rotationManager.updateRotationCirclePosition();
    }
    
    ContextMenu.hide();
  },

  cloneObject: function() {
    if (!this.selectedObject) return;
    
    const clone = this.selectedObject.clone();
    clone.position.x += 50;
    
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => mat.clone());
        } else {
          child.material = child.material.clone();
        }
        child.userData.originalMaterial = child.material;
      }
    });
    
    clone.userData = JSON.parse(JSON.stringify(this.selectedObject.userData));
    
    this.collisionManager.updateAllColliders(clone);
    
    this.sceneManager.addObject(clone);
    
    if (this.selectedObject) {
      this.setObjectHighlight(this.selectedObject, false);
    }
    
    this.selectObject(clone);
    ContextMenu.hide();
  }
};