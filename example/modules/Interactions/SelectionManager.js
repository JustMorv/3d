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
  
  // Для режима подъема
  elevatorArrow: null,
  isElevatorMode: false,
  isElevating: false,
  startMouseY: 0,
  startObjectY: 0,
  elevatorStep: 5,  // Шаг подъема в единицах (можно менять)
  showBoundsVisual: false,  // Показывать ли границы визуально
  
  // Для автоматической стыковки
  snapDistance: 15,
  
  sizeLines: null,
  isSizeLinesVisible: false,
  
  // Флаг, что объект был поднят вручную (чтобы не сбрасывать высоту)
  manuallyElevated: false,
  
  // Для уведомлений о стыковке
  lastWallSnapNotified: false,
  
  // Для ограничений подъема
  limitReachedNotified: false,
  boundsLines: null,

  init: function(sceneManager, uiManager, modelManager, collisionManager, dragManager) {
    this.sceneManager = sceneManager;
    this.uiManager = uiManager;
    this.modelManager = modelManager;
    this.collisionManager = collisionManager;
    this.dragManager = dragManager;
    
    this.createGearIcon();
    this.createElevatorArrow();
    this.bindEvents();
    this.boundsLines = [];
  },
  
  bindEvents: function() {
    EventManager.on('camera-updated', () => {
      if (this.isSizeLinesVisible && this.selectedObject) {
        this.updateSizeLinesPosition();
      }
      if (this.isElevatorMode && this.selectedObject) {
        this.updateElevatorArrowPosition();
        if (this.showBoundsVisual) {
          this.updateBoundsLinesPosition();
        }
      }
      if (window.app.rotationManager && window.app.rotationManager.isRotationMode) {
        window.app.rotationManager.updateRotationCirclePosition();
      }
    });
  },

  // Настройка шага подъема
  setElevatorStep: function(step) {
    this.elevatorStep = Math.max(1, Math.min(50, step));
    if (this.uiManager) {
      this.uiManager.showNotification(`Шаг подъема установлен: ${this.elevatorStep} ед.`, 'info', 1500);
    }
    console.log(`Шаг подъема изменен на ${this.elevatorStep}`);
  },

  // Включение/выключение визуальных границ
  toggleBoundsVisual: function() {
    this.showBoundsVisual = !this.showBoundsVisual;
    if (!this.showBoundsVisual) {
      this.hideElevationBounds();
      if (this.uiManager) {
        this.uiManager.showNotification('Границы скрыты', 'info', 1000);
      }
    } else {
      if (this.isElevatorMode && this.selectedObject) {
        this.showElevationBounds();
        if (this.uiManager) {
          this.uiManager.showNotification('Границы показаны', 'info', 1000);
        }
      }
    }
    return this.showBoundsVisual;
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
    
    this.gearIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      ContextMenu.show(e.clientX, e.clientY);
    });
  },
  
  createElevatorArrow: function() {
    this.elevatorArrow = document.createElement('div');
    this.elevatorArrow.className = 'elevator-arrow';
    this.elevatorArrow.style.display = 'none';
    document.body.appendChild(this.elevatorArrow);
    
    this.elevatorArrow.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!this.isElevatorMode) return;
      this.startElevating(e);
    });
  },
  
  startElevating: function(e) {
    this.isElevating = true;
    this.startMouseY = e.clientY;
    this.startObjectY = this.selectedObject.position.y;
    
    // Получаем ограничения для отображения в консоли
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    const minY = this.sceneManager.floorLevel + (size.y / 2);
    const maxY = this.sceneManager.roomH - (size.y / 2);
    
    console.log(`Ограничения подъема: minY=${minY.toFixed(1)}, maxY=${maxY.toFixed(1)}, шаг=${this.elevatorStep}`);
    
    document.addEventListener('mousemove', this.onElevatorMove.bind(this));
    document.addEventListener('mouseup', this.stopElevating.bind(this));
    
    this.elevatorArrow.style.cursor = 'ns-resize';
  },
  
  onElevatorMove: function(e) {
    if (!this.isElevating || !this.selectedObject) return;
    
    const deltaY = (this.startMouseY - e.clientY) * 0.5;
    let newY = this.startObjectY + deltaY;
    
    // Получаем размеры модели
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    const modelHeight = size.y;
    
    // Ограничения
    const floorLevel = this.sceneManager.floorLevel;      // уровень пола (0)
    const ceilingLevel = this.sceneManager.roomH;        // высота потолка (270)
    
    // Минимальная позиция Y (модель стоит на полу)
    const minY = floorLevel + (modelHeight / 2);
    
    // Максимальная позиция Y (модель не выше потолка)
    const maxY = ceilingLevel - (modelHeight / 2);
    
    // Округляем до шага для более плавного подъема
    newY = Math.round(newY / this.elevatorStep) * this.elevatorStep;
    
    // Ограничиваем новую позицию
    newY = Math.max(minY, Math.min(maxY, newY));
    
    // Показываем уведомление при достижении границ
    if (newY <= minY + 1) {
      if (this.uiManager && !this.limitReachedNotified) {
        this.uiManager.showNotification('⚠️ Модель на полу. Нельзя опустить ниже', 'warning', 1000);
        this.limitReachedNotified = true;
        setTimeout(() => { this.limitReachedNotified = false; }, 1000);
      }
    } else if (newY >= maxY - 1) {
      if (this.uiManager && !this.limitReachedNotified) {
        this.uiManager.showNotification(`⚠️ Модель достигла потолка (${maxY.toFixed(0)} ед.)`, 'warning', 1000);
        this.limitReachedNotified = true;
        setTimeout(() => { this.limitReachedNotified = false; }, 1000);
      }
    } else {
      this.limitReachedNotified = false;
    }
    
    this.selectedObject.position.y = newY;
    
    // Отмечаем, что объект был поднят вручную
    if (newY > minY + 1) {
      this.manuallyElevated = true;
    } else {
      this.manuallyElevated = false;
    }
    
    // Сохраняем текущую высоту
    this.selectedObject.userData.customHeight = newY;
    
    if (this.collisionManager) {
      this.collisionManager.updateAllColliders(this.selectedObject);
    }
    
    this.updateGearIconPosition();
    this.updateElevatorArrowPosition();
    
    // Обновляем границы только если они включены
    if (this.showBoundsVisual) {
      this.updateBoundsLinesPosition();
    }
    
    if (this.isSizeLinesVisible) {
      this.updateSizeLinesPosition();
    }
    if (this.modelManager && this.modelManager.isShowingAllSizes) {
      this.modelManager.updateAllModelsSizeLines();
    }
  },
  
  stopElevating: function() {
    this.isElevating = false;
    document.removeEventListener('mousemove', this.onElevatorMove.bind(this));
    document.removeEventListener('mouseup', this.stopElevating.bind(this));
    this.elevatorArrow.style.cursor = 'ns-resize';
    
    // Сохраняем высоту в userData, чтобы при повторном выделении не сбрасывалась
    if (this.selectedObject) {
      this.selectedObject.userData.customHeight = this.selectedObject.position.y;
    }
  },
  
  // Показать границы подъема для текущей модели
  showElevationBounds: function() {
    if (!this.selectedObject || !this.showBoundsVisual) return;
    
    // Удаляем старые границы
    this.hideElevationBounds();
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    const modelHeight = size.y;
    const centerX = this.selectedObject.position.x;
    const centerZ = this.selectedObject.position.z;
    
    const floorLevel = this.sceneManager.floorLevel;
    const ceilingLevel = this.sceneManager.roomH;
    
    const minY = floorLevel;
    const maxY = ceilingLevel - modelHeight;
    
    // Создаём линии границ
    const pointsBottom = [
      new THREE.Vector3(centerX - 40, minY, centerZ - 40),
      new THREE.Vector3(centerX + 40, minY, centerZ - 40),
      new THREE.Vector3(centerX + 40, minY, centerZ + 40),
      new THREE.Vector3(centerX - 40, minY, centerZ + 40),
      new THREE.Vector3(centerX - 40, minY, centerZ - 40)
    ];
    
    const pointsTop = [
      new THREE.Vector3(centerX - 40, maxY, centerZ - 40),
      new THREE.Vector3(centerX + 40, maxY, centerZ - 40),
      new THREE.Vector3(centerX + 40, maxY, centerZ + 40),
      new THREE.Vector3(centerX - 40, maxY, centerZ + 40),
      new THREE.Vector3(centerX - 40, maxY, centerZ - 40)
    ];
    
    // Рисуем нижнюю границу (пол) - зелёным
    for (let i = 0; i < pointsBottom.length - 1; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([pointsBottom[i], pointsBottom[i+1]]);
      const material = new THREE.LineBasicMaterial({ color: 0x44ff44, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      this.sceneManager.scene.add(line);
      this.boundsLines.push(line);
    }
    
    // Рисуем верхнюю границу (потолок) - красным
    for (let i = 0; i < pointsTop.length - 1; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([pointsTop[i], pointsTop[i+1]]);
      const material = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      this.sceneManager.scene.add(line);
      this.boundsLines.push(line);
    }
    
    // Вертикальные линии - жёлтым
    for (let i = 0; i < 4; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([pointsBottom[i], pointsTop[i]]);
      const material = new THREE.LineBasicMaterial({ color: 0xffaa44 });
      const line = new THREE.Line(geometry, material);
      this.sceneManager.scene.add(line);
      this.boundsLines.push(line);
    }
    
    console.log(`Границы подъема: пол (${minY}), потолок (${maxY.toFixed(0)})`);
  },
  
  // Обновить позицию границ при движении модели
  updateBoundsLinesPosition: function() {
    if (!this.isElevatorMode || !this.selectedObject || this.boundsLines.length === 0) return;
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    const modelHeight = size.y;
    const centerX = this.selectedObject.position.x;
    const centerZ = this.selectedObject.position.z;
    
    const floorLevel = this.sceneManager.floorLevel;
    const ceilingLevel = this.sceneManager.roomH;
    
    const minY = floorLevel;
    const maxY = ceilingLevel - modelHeight;
    
    // Обновляем позиции линий
    const pointsBottom = [
      new THREE.Vector3(centerX - 40, minY, centerZ - 40),
      new THREE.Vector3(centerX + 40, minY, centerZ - 40),
      new THREE.Vector3(centerX + 40, minY, centerZ + 40),
      new THREE.Vector3(centerX - 40, minY, centerZ + 40),
      new THREE.Vector3(centerX - 40, minY, centerZ - 40)
    ];
    
    const pointsTop = [
      new THREE.Vector3(centerX - 40, maxY, centerZ - 40),
      new THREE.Vector3(centerX + 40, maxY, centerZ - 40),
      new THREE.Vector3(centerX + 40, maxY, centerZ + 40),
      new THREE.Vector3(centerX - 40, maxY, centerZ + 40),
      new THREE.Vector3(centerX - 40, maxY, centerZ - 40)
    ];
    
    // Обновляем нижние линии (индексы 0-3)
    for (let i = 0; i < 4 && i < this.boundsLines.length; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([pointsBottom[i], pointsBottom[i+1]]);
      if (this.boundsLines[i].geometry) this.boundsLines[i].geometry.dispose();
      this.boundsLines[i].geometry = geometry;
    }
    
    // Обновляем верхние линии (индексы 4-7)
    const topStartIndex = 4;
    for (let i = 0; i < 4 && (topStartIndex + i) < this.boundsLines.length; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([pointsTop[i], pointsTop[i+1]]);
      if (this.boundsLines[topStartIndex + i].geometry) this.boundsLines[topStartIndex + i].geometry.dispose();
      this.boundsLines[topStartIndex + i].geometry = geometry;
    }
    
    // Обновляем вертикальные линии (индексы 8-11)
    const vertStartIndex = 8;
    for (let i = 0; i < 4 && (vertStartIndex + i) < this.boundsLines.length; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([pointsBottom[i], pointsTop[i]]);
      if (this.boundsLines[vertStartIndex + i].geometry) this.boundsLines[vertStartIndex + i].geometry.dispose();
      this.boundsLines[vertStartIndex + i].geometry = geometry;
    }
  },
  
  // Скрыть границы подъема
  hideElevationBounds: function() {
    if (this.boundsLines) {
      this.boundsLines.forEach(line => {
        if (line.parent) this.sceneManager.scene.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
      });
      this.boundsLines = [];
    }
  },
  
  enableElevatorMode: function() {
    if (!this.selectedObject) {
      if (this.uiManager) this.uiManager.showNotification('Сначала выберите объект', 'warning');
      return;
    }
    
    if (this.isElevatorMode) {
      this.disableElevatorMode();
    } else {
      this.isElevatorMode = true;
      this.showElevatorArrow();
      if (this.showBoundsVisual) {
        this.showElevationBounds();
      }
      ContextMenu.hide();
      
      // Показываем информацию о текущей высоте
      const currentY = this.selectedObject.position.y;
      const box = new THREE.Box3().setFromObject(this.selectedObject);
      const modelTop = currentY + (box.getSize(new THREE.Vector3()).y / 2);
      
      if (this.uiManager) {
        this.uiManager.showNotification(
          `Режим подъема включен. Шаг: ${this.elevatorStep} ед.\nТекущая высота: ${currentY.toFixed(0)} ед. (верх: ${modelTop.toFixed(0)} ед.)`, 
          'info', 
          3000
        );
      }
    }
  },
  
  disableElevatorMode: function() {
    this.isElevatorMode = false;
    this.hideElevatorArrow();
    this.hideElevationBounds();
  },
  
  showElevatorArrow: function() {
    this.elevatorArrow.style.display = 'flex';
    this.updateElevatorArrowPosition();
  },
  
  hideElevatorArrow: function() {
    this.elevatorArrow.style.display = 'none';
  },
  
  updateElevatorArrowPosition: function() {
    if (!this.selectedObject || !this.isElevatorMode) return;
    
    const vector = new THREE.Vector3();
    this.selectedObject.getWorldPosition(vector);
    vector.project(this.dragManager.cameraController.camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = -(vector.y * 0.5 - 0.5) * window.innerHeight;
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    
    // Стрелка сверху над моделью
    this.elevatorArrow.style.left = (x - 20) + 'px';
    this.elevatorArrow.style.top = (y - size.y * 0.8 - 30) + 'px';
  },

  selectObject: function(object) {
    if (this.isSizeLinesVisible) {
      this.hideSizeLines();
    }
    
    this.selectedObject = object;
    
    // ВАЖНО: НЕ сбрасываем высоту объекта!
    // Сохраняем текущую позицию Y (которая могла быть изменена подъемом)
    if (object.userData.customHeight !== undefined) {
      // Если у объекта сохранена кастомная высота, убеждаемся что она применена
      if (Math.abs(object.position.y - object.userData.customHeight) > 0.1) {
        object.position.y = object.userData.customHeight;
      }
    }
    
    this.setObjectHighlight(object, true);
    this.saveOriginalState(object);
    this.updateGearIconPosition();
    this.showGearIcon();
  },

  deselectObject: function() {
    if (this.selectedObject) {
      this.setObjectHighlight(this.selectedObject, false);
      this.hideGearIcon();
      this.hideSizeLines();
      this.disableElevatorMode();
      if (window.app.rotationManager) {
        window.app.rotationManager.hideRotationCircle();
      }
      this.disableWidthMode();
      this.selectedObject = null;
      ContextMenu.hide();
    }
  },

  alignToFloor: function(force = false) {
    if (!this.selectedObject) {
      if (this.uiManager) this.uiManager.showNotification('Сначала выберите объект', 'warning');
      return;
    }
    
    if (this.manuallyElevated && !force) {
      if (this.uiManager) {
        this.uiManager.showNotification('Объект был поднят вручную. Используйте "Сбросить на пол" для выравнивания', 'info', 2000);
      }
      return;
    }
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const minY = box.min.y;
    
    if (minY < this.sceneManager.floorLevel) {
      const correction = this.sceneManager.floorLevel - minY;
      this.selectedObject.position.y += correction;
      this.manuallyElevated = false;
      this.selectedObject.userData.customHeight = this.selectedObject.position.y;
      
      if (this.collisionManager) {
        this.collisionManager.updateAllColliders(this.selectedObject);
      }
      
      if (this.isSizeLinesVisible) {
        this.updateSizeLinesPosition();
      }
      
      if (this.uiManager) {
        this.uiManager.showNotification('Объект выровнен по полу', 'success', 1000);
      }
    }
  },
  
  resetToFloor: function() {
    if (!this.selectedObject) return;
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const minY = box.min.y;
    const correction = this.sceneManager.floorLevel - minY;
    this.selectedObject.position.y += correction;
    this.manuallyElevated = false;
    this.selectedObject.userData.customHeight = this.selectedObject.position.y;
    
    if (this.collisionManager) {
      this.collisionManager.updateAllColliders(this.selectedObject);
    }
    
    this.updateGearIconPosition();
    if (this.isElevatorMode) {
      this.updateElevatorArrowPosition();
      if (this.showBoundsVisual) {
        this.updateBoundsLinesPosition();
      }
    }
    if (this.isSizeLinesVisible) this.updateSizeLinesPosition();
    
    if (this.uiManager) {
      this.uiManager.showNotification('Объект опущен на пол', 'success', 1000);
    }
  },

  checkAndSnapToNearby: function(position) {
    if (!this.selectedObject) return position;
    
    const sourceHalfSize = this.selectedObject.userData.combinedHalfSize || this.selectedObject.userData.halfSize;
    if (!sourceHalfSize) return position;
    
    let bestSnap = null;
    let bestDistance = this.snapDistance;
    let snapType = null;
    
    for (let i = 0; i < this.sceneManager.objects.length; i++) {
      const other = this.sceneManager.objects[i];
      if (other === this.selectedObject) continue;
      
      const otherHalfSize = other.userData.combinedHalfSize || other.userData.halfSize;
      if (!otherHalfSize) continue;
      
      const snapRightX = other.position.x + otherHalfSize.x + sourceHalfSize.x;
      const snapLeftX = other.position.x - otherHalfSize.x - sourceHalfSize.x;
      const currentZ = position.z;
      const otherZ = other.position.z;
      
      const zOverlap = Math.abs(currentZ - otherZ) < (sourceHalfSize.z + otherHalfSize.z);
      
      if (zOverlap) {
        const distRight = Math.abs(position.x - snapRightX);
        if (distRight < bestDistance) {
          bestDistance = distRight;
          bestSnap = { x: snapRightX, z: otherZ };
          snapType = 'model';
        }
        const distLeft = Math.abs(position.x - snapLeftX);
        if (distLeft < bestDistance) {
          bestDistance = distLeft;
          bestSnap = { x: snapLeftX, z: otherZ };
          snapType = 'model';
        }
      }
      
      const snapFrontZ = other.position.z + otherHalfSize.z + sourceHalfSize.z;
      const snapBackZ = other.position.z - otherHalfSize.z - sourceHalfSize.z;
      const currentX = position.x;
      const otherX = other.position.x;
      
      const xOverlap = Math.abs(currentX - otherX) < (sourceHalfSize.x + otherHalfSize.x);
      
      if (xOverlap) {
        const distFront = Math.abs(position.z - snapFrontZ);
        if (distFront < bestDistance) {
          bestDistance = distFront;
          bestSnap = { x: otherX, z: snapFrontZ };
          snapType = 'model';
        }
        const distBack = Math.abs(position.z - snapBackZ);
        if (distBack < bestDistance) {
          bestDistance = distBack;
          bestSnap = { x: otherX, z: snapBackZ };
          snapType = 'model';
        }
      }
    }
    
    const roomW = this.sceneManager.roomW;
    const roomD = this.sceneManager.roomD;
    const WALL_GAP = 0;
    
    const leftWallX = -roomW/2 + sourceHalfSize.x + WALL_GAP;
    const distToLeftWall = Math.abs(position.x - leftWallX);
    if (distToLeftWall < bestDistance) {
      bestDistance = distToLeftWall;
      bestSnap = { x: leftWallX, z: position.z };
      snapType = 'wall_left';
    }
    
    const rightWallX = roomW/2 - sourceHalfSize.x - WALL_GAP;
    const distToRightWall = Math.abs(position.x - rightWallX);
    if (distToRightWall < bestDistance) {
      bestDistance = distToRightWall;
      bestSnap = { x: rightWallX, z: position.z };
      snapType = 'wall_right';
    }
    
    const backWallZ = -roomD/2 + sourceHalfSize.z + WALL_GAP;
    const distToBackWall = Math.abs(position.z - backWallZ);
    if (distToBackWall < bestDistance) {
      bestDistance = distToBackWall;
      bestSnap = { x: position.x, z: backWallZ };
      snapType = 'wall_back';
    }
    
    const frontWallZ = roomD/2 - sourceHalfSize.z - WALL_GAP;
    const distToFrontWall = Math.abs(position.z - frontWallZ);
    if (distToFrontWall < bestDistance) {
      bestDistance = distToFrontWall;
      bestSnap = { x: position.x, z: frontWallZ };
      snapType = 'wall_front';
    }
    
    if (bestSnap) {
      if (snapType && snapType.startsWith('wall') && bestDistance < 10) {
        if (this.uiManager && !this.lastWallSnapNotified) {
          this.lastWallSnapNotified = true;
          const wallNames = {
            'wall_left': 'левой',
            'wall_right': 'правой',
            'wall_back': 'задней',
            'wall_front': 'передней'
          };
          this.uiManager.showNotification(`📐 Пристыковано к ${wallNames[snapType]} стене`, 'success', 800);
          setTimeout(() => { this.lastWallSnapNotified = false; }, 1000);
        }
      }
      
      position.x = bestSnap.x;
      position.z = bestSnap.z;
    }
    
    return position;
  },

  showSizeLines: function() {
    if (!this.selectedObject) {
      if (this.uiManager) this.uiManager.showNotification('Сначала выберите объект', 'warning');
      return;
    }
    
    if (this.isSizeLinesVisible) {
      this.hideSizeLines();
      return;
    }
    
    this.isSizeLinesVisible = true;
    this.createSizeLines();
    ContextMenu.hide();
    
    if (this.uiManager) {
      this.uiManager.showNotification('Размеры отображаются рядом с моделью', 'info', 2000);
    }
  },
  
  createSizeLines: function() {
    if (this.sizeLines) {
      this.removeSizeLines();
    }
    
    if (!this.selectedObject) return;
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    const min = box.min;
    const max = box.max;
    
    this.sizeLines = {
      width: null,
      height: null,
      depth: null,
      labels: [],
      arrows: []
    };
    
    const widthStart = new THREE.Vector3(min.x, min.y - 15, min.z);
    const widthEnd = new THREE.Vector3(max.x, min.y - 15, min.z);
    this.sizeLines.width = this.createLine(widthStart, widthEnd, 0x4a6ee0);
    
    const depthStart = new THREE.Vector3(max.x + 15, min.y, min.z);
    const depthEnd = new THREE.Vector3(max.x + 15, min.y, max.z);
    this.sizeLines.depth = this.createLine(depthStart, depthEnd, 0x4a6ee0);
    
    const heightStart = new THREE.Vector3(min.x - 15, min.y, min.z);
    const heightEnd = new THREE.Vector3(min.x - 15, max.y, min.z);
    this.sizeLines.height = this.createLine(heightStart, heightEnd, 0x4a6ee0);
    
    this.createSizeLabel(size.x.toFixed(0), widthStart.clone().add(widthEnd.clone().sub(widthStart).multiplyScalar(0.5)));
    this.createSizeLabel(size.z.toFixed(0), depthStart.clone().add(depthEnd.clone().sub(depthStart).multiplyScalar(0.5)));
    this.createSizeLabel(size.y.toFixed(0), heightStart.clone().add(heightEnd.clone().sub(heightStart).multiplyScalar(0.5)));
    
    this.addArrows(widthStart, widthEnd);
    this.addArrows(depthStart, depthEnd);
    this.addArrows(heightStart, heightEnd);
  },
  
  createLine: function(start, end, color) {
    const points = [start.clone(), end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color });
    const line = new THREE.Line(geometry, material);
    this.sceneManager.scene.add(line);
    return line;
  },
  
  createSizeLabel: function(text, position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'rgba(0,0,0,0.75)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'Bold 20px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    context.strokeStyle = '#4a6ee0';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(40, 20, 1);
    sprite.position.copy(position);
    sprite.userData = { text: text };
    
    this.sceneManager.scene.add(sprite);
    this.sizeLines.labels.push(sprite);
  },
  
  addArrows: function(start, end) {
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const arrowSize = 8;
    
    const arrowStart = new THREE.ArrowHelper(direction.clone().negate(), start, arrowSize, 0x4a6ee0, arrowSize * 0.6, arrowSize * 0.4);
    const arrowEnd = new THREE.ArrowHelper(direction, end, arrowSize, 0x4a6ee0, arrowSize * 0.6, arrowSize * 0.4);
    
    this.sceneManager.scene.add(arrowStart);
    this.sceneManager.scene.add(arrowEnd);
    this.sizeLines.arrows.push(arrowStart, arrowEnd);
  },
  
  updateSizeLinesPosition: function() {
    if (!this.isSizeLinesVisible || !this.selectedObject) return;
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    const min = box.min;
    const max = box.max;
    
    if (this.sizeLines.width) {
      const points = [new THREE.Vector3(min.x, min.y - 15, min.z), new THREE.Vector3(max.x, min.y - 15, min.z)];
      this.sizeLines.width.geometry.dispose();
      this.sizeLines.width.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    
    if (this.sizeLines.depth) {
      const points = [new THREE.Vector3(max.x + 15, min.y, min.z), new THREE.Vector3(max.x + 15, min.y, max.z)];
      this.sizeLines.depth.geometry.dispose();
      this.sizeLines.depth.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    
    if (this.sizeLines.height) {
      const points = [new THREE.Vector3(min.x - 15, min.y, min.z), new THREE.Vector3(min.x - 15, max.y, min.z)];
      this.sizeLines.height.geometry.dispose();
      this.sizeLines.height.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    
    if (this.sizeLines.labels) {
      const widthCenter = new THREE.Vector3(min.x + size.x/2, min.y - 15, min.z);
      const depthCenter = new THREE.Vector3(max.x + 15, min.y, min.z + size.z/2);
      const heightCenter = new THREE.Vector3(min.x - 15, min.y + size.y/2, min.z);
      
      if (this.sizeLines.labels[0]) {
        this.sizeLines.labels[0].position.copy(widthCenter);
        this.updateLabelText(this.sizeLines.labels[0], size.x.toFixed(0));
      }
      if (this.sizeLines.labels[1]) {
        this.sizeLines.labels[1].position.copy(depthCenter);
        this.updateLabelText(this.sizeLines.labels[1], size.z.toFixed(0));
      }
      if (this.sizeLines.labels[2]) {
        this.sizeLines.labels[2].position.copy(heightCenter);
        this.updateLabelText(this.sizeLines.labels[2], size.y.toFixed(0));
      }
    }
    
    if (this.sizeLines.arrows) {
      this.sizeLines.arrows.forEach(arrow => this.sceneManager.scene.remove(arrow));
      this.sizeLines.arrows = [];
      
      if (this.sizeLines.width) {
        const start = new THREE.Vector3(min.x, min.y - 15, min.z);
        const end = new THREE.Vector3(max.x, min.y - 15, min.z);
        this.addArrows(start, end);
      }
      if (this.sizeLines.depth) {
        const start = new THREE.Vector3(max.x + 15, min.y, min.z);
        const end = new THREE.Vector3(max.x + 15, min.y, max.z);
        this.addArrows(start, end);
      }
      if (this.sizeLines.height) {
        const start = new THREE.Vector3(min.x - 15, min.y, min.z);
        const end = new THREE.Vector3(min.x - 15, max.y, min.z);
        this.addArrows(start, end);
      }
    }
  },
  
  updateLabelText: function(sprite, newText) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0,0,0,0.75)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'Bold 20px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(newText, canvas.width / 2, canvas.height / 2);
    
    context.strokeStyle = '#4a6ee0';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    if (sprite.material.map) sprite.material.map.dispose();
    sprite.material.map = new THREE.CanvasTexture(canvas);
    sprite.material.map.needsUpdate = true;
    sprite.userData.text = newText;
  },
  
  hideSizeLines: function() {
    this.isSizeLinesVisible = false;
    this.removeSizeLines();
  },
  
  removeSizeLines: function() {
    if (this.sizeLines) {
      if (this.sizeLines.width) this.sceneManager.scene.remove(this.sizeLines.width);
      if (this.sizeLines.depth) this.sceneManager.scene.remove(this.sizeLines.depth);
      if (this.sizeLines.height) this.sceneManager.scene.remove(this.sizeLines.height);
      
      if (this.sizeLines.labels) {
        this.sizeLines.labels.forEach(label => {
          this.sceneManager.scene.remove(label);
          if (label.material && label.material.map) label.material.map.dispose();
        });
      }
      
      if (this.sizeLines.arrows) {
        this.sizeLines.arrows.forEach(arrow => this.sceneManager.scene.remove(arrow));
      }
      
      this.sizeLines = null;
    }
  },

  deleteSelected: function() {
    if (this.selectedObject) {
      this.sceneManager.removeObject(this.selectedObject);
      this.deselectObject();
    } else {
      if (this.uiManager) this.uiManager.showNotification('Сначала выберите объект', 'warning');
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
    
    if (!object.userData.originalWidth) object.userData.originalWidth = size.x;
    if (!object.userData.originalDepth) object.userData.originalDepth = size.z;
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

  enableWidthMode: function() {
    if (!this.selectedObject) {
      if (this.uiManager) this.uiManager.showNotification('Сначала выберите объект', 'warning');
      return;
    }
    
    this.isWidthMode = true;
    ContextMenu.hide();
    this.hideGearIcon();
    
    if (window.app.rotationManager) window.app.rotationManager.hideRotationCircle();
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const size = box.getSize(new THREE.Vector3());
    this.originalWidth = this.selectedObject.userData.originalWidth || size.x;
    
    this.createWidthControl();
    
    const currentBox = new THREE.Box3().setFromObject(this.selectedObject);
    const currentSize = currentBox.getSize(new THREE.Vector3());
    let currentPercentage = Math.round((currentSize.x / this.originalWidth) * 100);
    currentPercentage = Math.max(50, Math.min(200, currentPercentage));
    
    this.widthSlider.value = currentPercentage;
    const widthValueSpan = document.getElementById('widthValue');
    if (widthValueSpan) widthValueSpan.innerHTML = 'Текущая ширина: ' + currentPercentage + '%';
    if (this.widthControl) this.widthControl.style.display = 'block';
  },

  createWidthControl: function() {
    if (this.widthControl && this.widthControl.parentNode) {
      this.widthControl.parentNode.removeChild(this.widthControl);
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
        <button class="width-preset" data-width="50">50%</button>
        <button class="width-preset" data-width="75">75%</button>
        <button class="width-preset" data-width="100">100%</button>
        <button class="width-preset" data-width="125">125%</button>
        <button class="width-preset" data-width="150">150%</button>
        <button class="width-preset" data-width="200">200%</button>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button id="width-reset-btn" style="flex: 1;">🔄 Сбросить</button>
        <button id="width-close-btn" style="flex: 1;">✕ Закрыть</button>
      </div>
    `;
    
    document.body.appendChild(this.widthControl);
    this.widthSlider = document.getElementById('widthSlider');
    
    if (this.widthSlider) {
      this.widthSlider.addEventListener('input', () => {
        const value = parseInt(this.widthSlider.value);
        const widthValueSpan = document.getElementById('widthValue');
        if (widthValueSpan) widthValueSpan.innerHTML = 'Текущая ширина: ' + value + '%';
        if (this.selectedObject && this.originalWidth) {
          this.changeObjectWidth((this.originalWidth * value) / 100);
        }
      });
    }
    
    document.querySelectorAll('.width-preset').forEach(btn => {
      btn.onclick = () => this.setWidthPercentage(parseInt(btn.dataset.width));
    });
    
    const resetBtn = document.getElementById('width-reset-btn');
    if (resetBtn) resetBtn.onclick = () => this.resetWidth();
    
    const closeBtn = document.getElementById('width-close-btn');
    if (closeBtn) closeBtn.onclick = () => this.disableWidthMode();
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
    
    if (this.collisionManager) {
      this.collisionManager.updateAllColliders(this.selectedObject);
    }
    this.selectedObject.userData.originalWidth = newWidth;
    
    if (this.isSizeLinesVisible) this.updateSizeLinesPosition();
    if (this.modelManager && this.modelManager.isShowingAllSizes) {
      this.modelManager.updateAllModelsSizeLines();
    }
  },
  
  resetWidth: function() {
    if (this.widthSlider) {
      this.widthSlider.value = 100;
      this.widthSlider.dispatchEvent(new Event('input'));
    }
  },

  disableWidthMode: function() {
    this.isWidthMode = false;
    if (this.widthControl) this.widthControl.style.display = 'none';
    if (this.selectedObject) {
      this.updateGearIconPosition();
      this.showGearIcon();
    }
  },

  cloneObject: function() {
    if (!this.selectedObject) return;
    
    const clone = this.selectedObject.clone();
    clone.position.x += 50;
    
    if (this.selectedObject.userData.customHeight) {
      clone.userData.customHeight = this.selectedObject.userData.customHeight;
      clone.position.y = this.selectedObject.userData.customHeight;
    }
    
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
    
    if (this.collisionManager) {
      this.collisionManager.updateAllColliders(clone);
    }
    
    this.sceneManager.addObject(clone);
    
    if (this.selectedObject) this.setObjectHighlight(this.selectedObject, false);
    this.selectObject(clone);
    ContextMenu.hide();
    
    if (this.uiManager) {
      this.uiManager.showNotification('Объект скопирован', 'success', 1000);
    }
  },
  
  getObjectSize: function() {
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    return box.getSize(new THREE.Vector3());
  }
};