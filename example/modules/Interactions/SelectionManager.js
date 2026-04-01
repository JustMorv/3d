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
  
  // Новые свойства для размерных линий
  sizeLines: null,
  isSizeLinesVisible: false,  // Переименовано из showSizeLines

  init: function(sceneManager, uiManager, modelManager, collisionManager, dragManager) {
    this.sceneManager = sceneManager;
    this.uiManager = uiManager;
    this.modelManager = modelManager;
    this.collisionManager = collisionManager;
    this.dragManager = dragManager;
    
    this.createGearIcon();
    this.bindEvents();
  },
  
  bindEvents: function() {
    // Слушаем событие обновления камеры для обновления позиций линий
    EventManager.on('camera-updated', () => {
      if (this.isSizeLinesVisible && this.selectedObject) {
        this.updateSizeLinesPosition();
      }
    });
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
    // Скрываем старые линии если были
    if (this.isSizeLinesVisible) {
      this.hideSizeLines();
    }
    
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
      this.hideSizeLines(); // Скрываем линии при снятии выделения
      if (window.app.rotationManager) {
        window.app.rotationManager.hideRotationCircle();
      }
      this.disableWidthMode();
      this.selectedObject = null;
      ContextMenu.hide();
    }
  },

  // НОВЫЙ МЕТОД: Показать размерные линии
  showSizeLines: function() {
    if (!this.selectedObject) {
      if (this.uiManager) {
        this.uiManager.showNotification('Сначала выберите объект', 'warning');
      }
      return;
    }
    
    // Если уже показываем, скрываем
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
  
  // Создание визуальных размерных линий
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
    
    // Линия для ширины (X) - снизу модели
    const widthStart = new THREE.Vector3(min.x, min.y - 15, min.z);
    const widthEnd = new THREE.Vector3(max.x, min.y - 15, min.z);
    this.sizeLines.width = this.createLine(widthStart, widthEnd, 0x4a6ee0, 2);
    
    // Линия для глубины (Z) - справа от модели
    const depthStart = new THREE.Vector3(max.x + 15, min.y, min.z);
    const depthEnd = new THREE.Vector3(max.x + 15, min.y, max.z);
    this.sizeLines.depth = this.createLine(depthStart, depthEnd, 0x4a6ee0, 2);
    
    // Линия для высоты (Y) - слева от модели
    const heightStart = new THREE.Vector3(min.x - 15, min.y, min.z);
    const heightEnd = new THREE.Vector3(min.x - 15, max.y, min.z);
    this.sizeLines.height = this.createLine(heightStart, heightEnd, 0x4a6ee0, 2);
    
    // Создаем текстовые метки
    this.createSizeLabel(size.x.toFixed(0), widthStart.clone().add(widthEnd.clone().sub(widthStart).multiplyScalar(0.5)));
    this.createSizeLabel(size.z.toFixed(0), depthStart.clone().add(depthEnd.clone().sub(depthStart).multiplyScalar(0.5)));
    this.createSizeLabel(size.y.toFixed(0), heightStart.clone().add(heightEnd.clone().sub(heightStart).multiplyScalar(0.5)));
    
    // Добавляем стрелочки на концах линий
    this.addArrows(widthStart, widthEnd);
    this.addArrows(depthStart, depthEnd);
    this.addArrows(heightStart, heightEnd);
  },
  
  createLine: function(start, end, color, linewidth = 2) {
    const points = [start.clone(), end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color });
    const line = new THREE.Line(geometry, material);
    this.sceneManager.scene.add(line);
    return line;
  },
  
  createSizeLabel: function(text, position) {
    // Создаем canvas текстуру
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Прозрачный фон
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем фон
    context.fillStyle = 'rgba(0,0,0,0.75)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем текст
    context.font = 'Bold 20px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Добавляем рамку
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
    
    // Стрелка в начале
    const arrowStart = new THREE.ArrowHelper(direction.clone().negate(), start, arrowSize, 0x4a6ee0, arrowSize * 0.6, arrowSize * 0.4);
    // Стрелка в конце
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
    
    // Обновляем позиции линий
    if (this.sizeLines.width) {
      const points = [
        new THREE.Vector3(min.x, min.y - 15, min.z),
        new THREE.Vector3(max.x, min.y - 15, min.z)
      ];
      this.sizeLines.width.geometry.dispose();
      this.sizeLines.width.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    
    if (this.sizeLines.depth) {
      const points = [
        new THREE.Vector3(max.x + 15, min.y, min.z),
        new THREE.Vector3(max.x + 15, min.y, max.z)
      ];
      this.sizeLines.depth.geometry.dispose();
      this.sizeLines.depth.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    
    if (this.sizeLines.height) {
      const points = [
        new THREE.Vector3(min.x - 15, min.y, min.z),
        new THREE.Vector3(min.x - 15, max.y, min.z)
      ];
      this.sizeLines.height.geometry.dispose();
      this.sizeLines.height.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
    
    // Обновляем позиции меток
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
    
    // Обновляем стрелки
    if (this.sizeLines.arrows) {
      this.sizeLines.arrows.forEach(arrow => {
        this.sceneManager.scene.remove(arrow);
      });
      this.sizeLines.arrows = [];
      
      // Пересоздаем стрелки с новыми позициями
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
    
    if (sprite.material.map) {
      sprite.material.map.dispose();
    }
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
          if (label.material && label.material.map) {
            label.material.map.dispose();
          }
        });
      }
      
      if (this.sizeLines.arrows) {
        this.sizeLines.arrows.forEach(arrow => {
          this.sceneManager.scene.remove(arrow);
        });
      }
      
      this.sizeLines = null;
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

  alignToFloor: function() {
    if (!this.selectedObject) {
      alert('Сначала выберите объект');
      return;
    }
    
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const minY = box.min.y;
    
    if (minY < this.sceneManager.floorLevel) {
      const correction = this.sceneManager.floorLevel - minY;
      this.selectedObject.position.y += correction;
      
      this.collisionManager.updateAllColliders(this.selectedObject);
      
      if (this.isSizeLinesVisible) {
        this.updateSizeLinesPosition();
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
  
  if (this.isSizeLinesVisible) {
    this.updateSizeLinesPosition();
  }
  
  if (window.app.modelManager && window.app.modelManager.isShowingAllSizes) {
    window.app.modelManager.updateAllModelsSizeLines();
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
    
    if (this.isSizeLinesVisible) {
      this.updateSizeLinesPosition();
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
  },
  
  getObjectSize: function() {
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    return box.getSize(new THREE.Vector3());
  }
};