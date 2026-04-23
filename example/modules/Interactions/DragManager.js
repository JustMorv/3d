const DragManager = {
  sceneManager: null,
  cameraController: null,
  collisionManager: null,
  wallManager: null,
  selectionManager: null,
  
  raycaster: null,
  mouse: null,
  dragPlane: null,
  dragVector: null,
  dragOffset: null,
  dragNormal: null,
  dragIntersection: null,
  dragStartPosition: null,
  isDragging: false,
  hasCollision: false,
  originalYPosition: 0,

  init: function(sceneManager, cameraController, collisionManager, wallManager, selectionManager) {
    this.sceneManager = sceneManager;
    this.cameraController = cameraController;
    this.collisionManager = collisionManager;
    this.wallManager = wallManager;
    this.selectionManager = selectionManager;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.dragVector = new THREE.Vector3();
    this.dragOffset = new THREE.Vector3();
    this.dragNormal = new THREE.Vector3(0, 1, 0);
    this.dragIntersection = new THREE.Vector3();
    this.dragStartPosition = new THREE.Vector3();
    
    this.bindEvents();
  },

  setSelectionManager: function(selectionManager) {
    this.selectionManager = selectionManager;
  },

  bindEvents: function() {
    const renderer = this.sceneManager.renderer;
    
    renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
    renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
    renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
  },

  onMouseDown: function(event) {
    event.preventDefault();
    
    if (event.button !== 0) return;
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.cameraController.camera);
    
    if (this.selectionManager.gearIcon && this.selectionManager.gearIcon.style.display !== 'none') {
      const rect = this.selectionManager.gearIcon.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        return;
      }
    }
    
    const intersects = this.raycaster.intersectObjects(this.sceneManager.objects, true);
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      let clickedObject = intersect.object;
      
      while (clickedObject.parent && !this.sceneManager.objects.includes(clickedObject)) {
        clickedObject = clickedObject.parent;
      }
      
      if (this.selectionManager.selectedObject !== clickedObject) {
        if (this.selectionManager.selectedObject) {
          this.selectionManager.setObjectHighlight(this.selectionManager.selectedObject, false);
          this.selectionManager.hideGearIcon();
          if (window.app.rotationManager) {
            window.app.rotationManager.hideRotationCircle();
          }
          this.selectionManager.disableWidthMode();
          this.selectionManager.disableElevatorMode();
        }
        
        this.selectionManager.selectObject(clickedObject);
      }
      
      this.isDragging = true;
      this.cameraController.disable();
      
      this.originalYPosition = this.selectionManager.selectedObject.position.y;
      
      this.dragStartPosition.copy(this.selectionManager.selectedObject.position);
      this.dragPlane.setFromNormalAndCoplanarPoint(
        this.dragNormal,
        this.selectionManager.selectedObject.position
      );
      
      this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection);
      this.dragOffset.copy(this.selectionManager.selectedObject.position).sub(this.dragIntersection);
      
      this.selectionManager.setObjectHighlight(this.selectionManager.selectedObject, true, 0x00ff00);
      this.selectionManager.hideGearIcon();
      
      if (window.app.rotationManager) {
        window.app.rotationManager.hideRotationCircle();
      }
      
      this.selectionManager.disableWidthMode();
    } else {
      if (this.selectionManager.selectedObject) {
        this.selectionManager.deselectObject();
      }
    }
  },

  onMouseMove: function(event) {
    if (!this.isDragging || !this.selectionManager.selectedObject) return;
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.cameraController.camera);
    
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
      let newPosition = this.dragIntersection.clone().add(this.dragOffset);
      newPosition.y = this.originalYPosition;
      
      // АВТОМАТИЧЕСКАЯ СТЫКОВКА (к другим моделям И К СТЕНАМ)
      if (this.selectionManager.checkAndSnapToNearby) {
        newPosition = this.selectionManager.checkAndSnapToNearby(newPosition);
      }
      
      // ========== ПРОВЕРКА СТЕН (ТОЛЬКО ДЛЯ ЗАПРЕТА ВЫХОДА, БЕЗ ДОПОЛНИТЕЛЬНОГО ЗАЗОРА) ==========
      const halfSize = this.selectionManager.selectedObject.userData.combinedHalfSize || 
                       this.selectionManager.selectedObject.userData.halfSize;
      
      if (halfSize) {
        const roomW = this.sceneManager.roomW;
        const roomD = this.sceneManager.roomD;
        // МИНИМАЛЬНЫЙ зазор только для предотвращения выхода за стены (0.1 вместо 5)
        const MIN_WALL_GAP = 0.1;
        
        const minX = -roomW/2 + halfSize.x + MIN_WALL_GAP;
        const maxX = roomW/2 - halfSize.x - MIN_WALL_GAP;
        const minZ = -roomD/2 + halfSize.z + MIN_WALL_GAP;
        const maxZ = roomD/2 - halfSize.z - MIN_WALL_GAP;
        
        let hasCollision = false;
        
        if (newPosition.x < minX) { newPosition.x = minX; hasCollision = true; }
        if (newPosition.x > maxX) { newPosition.x = maxX; hasCollision = true; }
        if (newPosition.z < minZ) { newPosition.z = minZ; hasCollision = true; }
        if (newPosition.z > maxZ) { newPosition.z = maxZ; hasCollision = true; }
        
        if (hasCollision) {
          if (!this.hasCollision) {
            this.selectionManager.setObjectHighlight(this.selectionManager.selectedObject, true, 0xffaa00);
            this.hasCollision = true;
          }
        } else {
          if (this.hasCollision) {
            this.selectionManager.setObjectHighlight(this.selectionManager.selectedObject, true, 0x00ff00);
            this.hasCollision = false;
          }
        }
        
        this.selectionManager.selectedObject.position.x = newPosition.x;
        this.selectionManager.selectedObject.position.z = newPosition.z;
      } else {
        this.selectionManager.selectedObject.position.x = newPosition.x;
        this.selectionManager.selectedObject.position.z = newPosition.z;
      }
      
      if (this.collisionManager) {
        this.collisionManager.updateAllColliders(this.selectionManager.selectedObject);
      }
      
      this.selectionManager.updateGearIconPosition();
      if (this.selectionManager.isElevatorMode) {
        this.selectionManager.updateElevatorArrowPosition();
      }
      
      if (window.app.rotationManager && window.app.rotationManager.isRotationMode) {
        window.app.rotationManager.updateRotationCirclePosition();
      }
      
      if (window.app.modelManager && window.app.modelManager.isShowingAllSizes) {
        window.app.modelManager.updateAllModelsSizeLines();
      }
    }
  },

  onMouseUp: function(event) {
    if (this.isDragging && this.selectionManager.selectedObject) {
      // ПРОВЕРКА КОЛЛИЗИЙ С ДРУГИМИ ОБЪЕКТАМИ
      const isInCollision = this.collisionManager.isObjectInCollision(this.selectionManager.selectedObject);
      
      if (isInCollision) {
        const safePosition = this.dragStartPosition.clone();
        this.selectionManager.selectedObject.position.copy(safePosition);
        
        if (window.app.uiManager) {
          window.app.uiManager.showNotification('Невозможно разместить объект внутри другого!', 'warning', 2000);
        }
        
        DebugHelper.log('Объект возвращен в безопасную позицию из-за коллизии');
      }
      
      // Сохраняем текущую высоту
      const currentY = this.selectionManager.selectedObject.position.y;
      const box = new THREE.Box3().setFromObject(this.selectionManager.selectedObject);
      const minY = box.min.y;
      const floorLevel = this.sceneManager.floorLevel;
      
      if (Math.abs(minY - floorLevel) > 5) {
        this.selectionManager.manuallyElevated = true;
        this.selectionManager.selectedObject.userData.customHeight = currentY;
      } else {
        this.selectionManager.manuallyElevated = false;
      }
      
      this.selectionManager.setObjectHighlight(this.selectionManager.selectedObject, true);
      this.hasCollision = false;
      this.selectionManager.updateGearIconPosition();
      this.selectionManager.showGearIcon();
      
      if (window.app.rotationManager && window.app.rotationManager.isRotationMode) {
        window.app.rotationManager.showRotationCircle();
      }
      
      if (window.app.modelManager && window.app.modelManager.isShowingAllSizes) {
        window.app.modelManager.updateAllModelsSizeLines();
      }
    }
    
    this.isDragging = false;
    this.cameraController.enable();
  }
};