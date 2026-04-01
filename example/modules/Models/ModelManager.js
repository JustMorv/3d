const ModelManager = {
  sceneManager: null,
  modelNormalizer: null,
  
  allModelsSizeLines: null,
  isShowingAllSizes: false,

  init: function(sceneManager) {
    this.sceneManager = sceneManager;
    this.modelNormalizer = ModelNormalizer;
    this.allModelsSizeLines = [];
  },

  clearAllModels: function() {
    if (confirm('Удалить все модели?')) {
      if (this.isShowingAllSizes) {
        this.removeAllSizeLines();
      }
      this.sceneManager.clearAllObjects();
      EventManager.emit('models-cleared');
    }
  },

  fixAllModelsHeight: function() {
    this.sceneManager.objects.forEach((obj) => {
      if (obj.userData.type === 'model') {
        const box = new THREE.Box3().setFromObject(obj);
        const minY = box.min.y;
        
        if (minY < this.sceneManager.floorLevel) {
          const correction = this.sceneManager.floorLevel - minY;
          obj.position.y += correction;
          DebugHelper.log('Объект', obj.name || 'без имени', 'поднят на', correction);
        }
      }
    });
    
    if (this.isShowingAllSizes) {
      this.updateAllModelsSizeLines();
    }
    
    DebugHelper.log('Высота всех объектов исправлена');
  },

  checkAllModelSizes: function() {
    DebugHelper.log('=== ПРОВЕРКА РАЗМЕРОВ МОДЕЛЕЙ ===');
    let totalWidth = 0;
    let totalHeight = 0;
    let totalDepth = 0;
    let modelCount = 0;
    
    this.sceneManager.objects.forEach((obj, index) => {
      if (obj.userData.type === 'model') {
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        
        console.log((index + 1) + '. ' + (obj.userData.name || 'без имени') + ':');
        console.log('   Ширина (X):', size.x.toFixed(1));
        console.log('   Высота (Y):', size.y.toFixed(1));
        console.log('   Глубина (Z):', size.z.toFixed(1));
        console.log('   Масштаб:', obj.scale.x.toFixed(3));
        console.log('   Нижняя точка Y:', box.min.y.toFixed(1));
        console.log('   Позиция Y:', obj.position.y.toFixed(1));
        
        totalWidth += size.x;
        totalHeight += size.y;
        totalDepth += size.z;
        modelCount++;
      }
    });
    
    if (modelCount > 0) {
      console.log('Средние размеры:');
      console.log('   Ширина:', (totalWidth / modelCount).toFixed(1));
      console.log('   Высота:', (totalHeight / modelCount).toFixed(1));
      console.log('   Глубина:', (totalDepth / modelCount).toFixed(1));
    }
    
    DebugHelper.log('====================================');
  },

  normalizeAllModels: function() {
    if (!confirm('Привести все модели к единому размеру?')) return;
    
    this.sceneManager.objects.forEach((obj) => {
      if (obj.userData.type === 'model') {
        this.modelNormalizer.normalizeModel(obj);
      }
    });
    
    if (this.isShowingAllSizes) {
      this.updateAllModelsSizeLines();
    }
    
    DebugHelper.log('Все модели нормализованы');
  },

  resetAllPositions: function() {
    this.sceneManager.objects.forEach((obj) => {
      if (obj.userData.type === 'model') {
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const halfSize = {
          x: size.x / 2,
          y: size.y / 2,
          z: size.z / 2
        };
        
        const isOutside = 
          Math.abs(obj.position.x) > this.sceneManager.roomW/2 - halfSize.x ||
          Math.abs(obj.position.z) > this.sceneManager.roomD/2 - halfSize.z;
        
        if (isOutside) {
          DebugHelper.log('Объект вне комнаты:', obj.userData.name, 'позиция:', obj.position);
          
          const safeMargin = Math.max(size.x, size.z) * 0.5 + 30;
          const minX = -this.sceneManager.roomW/2 + size.x/2 + safeMargin;
          const maxX = this.sceneManager.roomW/2 - size.x/2 - safeMargin;
          const minZ = -this.sceneManager.roomD/2 + size.z/2 + safeMargin;
          const maxZ = this.sceneManager.roomD/2 - size.z/2 - safeMargin;
          
          if (minX <= maxX && minZ <= maxZ) {
            obj.position.x = (minX + maxX) / 2;
            obj.position.z = (minZ + maxZ) / 2;
          } else {
            obj.position.x = 0;
            obj.position.z = 0;
          }
          
          const minY = box.min.y;
          if (minY < 0) {
            obj.position.y += -minY;
          }
          
          DebugHelper.log('Новая позиция:', obj.position);
        }
      }
    });
    
    if (this.isShowingAllSizes) {
      this.updateAllModelsSizeLines();
    }
    
    DebugHelper.log('Все объекты возвращены в комнату');
  },

  recenterAllModels: function() {
    this.sceneManager.objects.forEach((obj, index) => {
      if (obj.userData.type === 'model') {
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        
        const safeMargin = Math.max(size.x, size.z) * 0.5 + 50;
        const minX = -this.sceneManager.roomW/2 + size.x/2 + safeMargin;
        const maxX = this.sceneManager.roomW/2 - size.x/2 - safeMargin;
        const minZ = -this.sceneManager.roomD/2 + size.z/2 + safeMargin;
        const maxZ = this.sceneManager.roomD/2 - size.z/2 - safeMargin;
        
        if (minX <= maxX && minZ <= maxZ) {
          obj.position.x = (minX + maxX) / 2;
          obj.position.z = (minZ + maxZ) / 2;
          
          const angle = (index / this.sceneManager.objects.length) * Math.PI * 2;
          obj.position.x += Math.cos(angle) * (maxX - minX) * 0.2;
          obj.position.z += Math.sin(angle) * (maxZ - minZ) * 0.2;
        }
        
        const minY = box.min.y;
        if (minY < 0) {
          obj.position.y += -minY;
        }
      }
    });
    
    if (this.isShowingAllSizes) {
      this.updateAllModelsSizeLines();
    }
    
    DebugHelper.log('Все модели центрированы');
  },

  forceModelsIntoRoom: function() {
    DebugHelper.log('Принудительное размещение всех моделей в комнате');
    
    this.sceneManager.objects.forEach((obj, index) => {
      if (obj.userData.type === 'model') {
        if (window.app && window.app.collisionManager) {
          window.app.collisionManager.updateObjectHalfSize(obj);
        }
        
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const halfSize = {
          x: size.x / 2,
          y: size.y / 2,
          z: size.z / 2
        };
        
        const roomHalfWidth = this.sceneManager.roomW / 2;
        const roomHalfDepth = this.sceneManager.roomD / 2;
        
        const maxX = roomHalfWidth - halfSize.x;
        const minX = -roomHalfWidth + halfSize.x;
        const maxZ = roomHalfDepth - halfSize.z;
        const minZ = -roomHalfDepth + halfSize.z;
        
        obj.position.x = Math.max(minX, Math.min(maxX, obj.position.x));
        obj.position.z = Math.max(minZ, Math.min(maxZ, obj.position.z));
        
        const minY = box.min.y;
        if (minY < this.sceneManager.floorLevel) {
          obj.position.y += this.sceneManager.floorLevel - minY;
        }
        
        DebugHelper.log(`Модель ${index + 1} скорректирована:`, {
          имя: obj.userData.name,
          позиция: obj.position,
          размер: size
        });
      }
    });
    
    if (this.isShowingAllSizes) {
      this.updateAllModelsSizeLines();
    }
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification('Все модели размещены в комнате', 'success');
    }
  },

  shrinkOversizedModels: function() {
    DebugHelper.log('Уменьшение слишком больших моделей');
    
    this.sceneManager.objects.forEach((obj) => {
      if (obj.userData.type === 'model') {
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        
        const roomW = this.sceneManager.roomW;
        const roomD = this.sceneManager.roomD;
        
        const maxAllowedWidth = roomW * 0.7;
        const maxAllowedDepth = roomD * 0.7;
        
        if (size.x > maxAllowedWidth || size.z > maxAllowedDepth) {
          const widthScale = maxAllowedWidth / size.x;
          const depthScale = maxAllowedDepth / size.z;
          const scale = Math.min(widthScale, depthScale) * 0.9;
          
          obj.scale.multiplyScalar(scale);
          
          DebugHelper.log('Уменьшена модель:', obj.userData.name, 'новый масштаб:', obj.scale.x);
        }
      }
    });
    
    if (this.isShowingAllSizes) {
      this.updateAllModelsSizeLines();
    }
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification('Слишком большие модели уменьшены', 'success');
    }
  },

  toggleAllModelsSizes: function() {
    if (this.isShowingAllSizes) {
      this.hideAllModelsSizes();
    } else {
      this.showAllModelsSizesVisual();
    }
  },
  
  showAllModelsSizesVisual: function() {
    if (this.isShowingAllSizes) return;
    
    this.isShowingAllSizes = true;
    
    const toggleText = document.getElementById('sizes-toggle-text');
    if (toggleText) {
      toggleText.innerHTML = 'Скрыть размеры всех моделей';
    }
    
    this.sceneManager.objects.forEach((obj) => {
      if (obj.userData.type === 'model') {
        this.createSizeLinesForModel(obj);
      }
    });
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification('Размеры всех моделей отображаются', 'info', 2000);
    }
  },
  
  hideAllModelsSizes: function() {
    if (!this.isShowingAllSizes) return;
    
    this.isShowingAllSizes = false;
    
    const toggleText = document.getElementById('sizes-toggle-text');
    if (toggleText) {
      toggleText.innerHTML = 'Показать размеры всех моделей';
    }
    
    this.removeAllSizeLines();
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification('Размеры скрыты', 'info', 2000);
    }
  },
  
  createSizeLinesForModel: function(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const min = box.min;
    const max = box.max;
    
    const modelSizeData = {
      model: model,
      widthLine: null,
      depthLine: null,
      heightLine: null,
      labels: [],
      arrows: []
    };
    
    const widthStart = new THREE.Vector3(min.x, min.y - 15, min.z);
    const widthEnd = new THREE.Vector3(max.x, min.y - 15, min.z);
    modelSizeData.widthLine = this.createLine(widthStart, widthEnd, 0x4a6ee0);
    
    const depthStart = new THREE.Vector3(max.x + 15, min.y, min.z);
    const depthEnd = new THREE.Vector3(max.x + 15, min.y, max.z);
    modelSizeData.depthLine = this.createLine(depthStart, depthEnd, 0x4a6ee0);
    
    const heightStart = new THREE.Vector3(min.x - 15, min.y, min.z);
    const heightEnd = new THREE.Vector3(min.x - 15, max.y, min.z);
    modelSizeData.heightLine = this.createLine(heightStart, heightEnd, 0x4a6ee0);
    
    const widthCenter = widthStart.clone().add(widthEnd.clone().sub(widthStart).multiplyScalar(0.5));
    const depthCenter = depthStart.clone().add(depthEnd.clone().sub(depthStart).multiplyScalar(0.5));
    const heightCenter = heightStart.clone().add(heightEnd.clone().sub(heightStart).multiplyScalar(0.5));
    
    modelSizeData.labels.push(this.createSizeLabel(size.x.toFixed(0), widthCenter, model));
    modelSizeData.labels.push(this.createSizeLabel(size.z.toFixed(0), depthCenter, model));
    modelSizeData.labels.push(this.createSizeLabel(size.y.toFixed(0), heightCenter, model));
    
    this.addArrowsToLines(widthStart, widthEnd, modelSizeData.arrows);
    this.addArrowsToLines(depthStart, depthEnd, modelSizeData.arrows);
    this.addArrowsToLines(heightStart, heightEnd, modelSizeData.arrows);
    
    model.userData.sizeLines = modelSizeData;
    this.allModelsSizeLines.push(modelSizeData);
  },
  
  createLine: function(start, end, color) {
    const points = [start.clone(), end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color });
    const line = new THREE.Line(geometry, material);
    this.sceneManager.scene.add(line);
    return line;
  },
  
  createSizeLabel: function(text, position, model) {
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
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    context.strokeStyle = '#4a6ee0';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(40, 20, 1);
    sprite.position.copy(position);
    sprite.userData = { modelId: model.uuid, text: text };
    
    this.sceneManager.scene.add(sprite);
    return sprite;
  },
  
  addArrowsToLines: function(start, end, arrowsArray) {
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const arrowSize = 8;
    
    const arrowStart = new THREE.ArrowHelper(direction.clone().negate(), start, arrowSize, 0x4a6ee0, arrowSize * 0.6, arrowSize * 0.4);
    const arrowEnd = new THREE.ArrowHelper(direction, end, arrowSize, 0x4a6ee0, arrowSize * 0.6, arrowSize * 0.4);
    
    this.sceneManager.scene.add(arrowStart);
    this.sceneManager.scene.add(arrowEnd);
    arrowsArray.push(arrowStart, arrowEnd);
  },
  
  updateAllModelsSizeLines: function() {
    if (!this.isShowingAllSizes) return;
    
    this.allModelsSizeLines.forEach(modelSizeData => {
      const model = modelSizeData.model;
      if (!model || !model.parent) return;
      
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const min = box.min;
      const max = box.max;
      
      if (modelSizeData.widthLine) {
        const points = [
          new THREE.Vector3(min.x, min.y - 15, min.z),
          new THREE.Vector3(max.x, min.y - 15, min.z)
        ];
        modelSizeData.widthLine.geometry.dispose();
        modelSizeData.widthLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      }
      
      if (modelSizeData.depthLine) {
        const points = [
          new THREE.Vector3(max.x + 15, min.y, min.z),
          new THREE.Vector3(max.x + 15, min.y, max.z)
        ];
        modelSizeData.depthLine.geometry.dispose();
        modelSizeData.depthLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      }
      
      if (modelSizeData.heightLine) {
        const points = [
          new THREE.Vector3(min.x - 15, min.y, min.z),
          new THREE.Vector3(min.x - 15, max.y, min.z)
        ];
        modelSizeData.heightLine.geometry.dispose();
        modelSizeData.heightLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      }
      
      if (modelSizeData.labels.length >= 3) {
        const widthCenter = new THREE.Vector3(min.x + size.x/2, min.y - 15, min.z);
        const depthCenter = new THREE.Vector3(max.x + 15, min.y, min.z + size.z/2);
        const heightCenter = new THREE.Vector3(min.x - 15, min.y + size.y/2, min.z);
        
        modelSizeData.labels[0].position.copy(widthCenter);
        modelSizeData.labels[1].position.copy(depthCenter);
        modelSizeData.labels[2].position.copy(heightCenter);
        
        this.updateLabelText(modelSizeData.labels[0], size.x.toFixed(0));
        this.updateLabelText(modelSizeData.labels[1], size.z.toFixed(0));
        this.updateLabelText(modelSizeData.labels[2], size.y.toFixed(0));
      }
      
      if (modelSizeData.arrows) {
        modelSizeData.arrows.forEach(arrow => {
          this.sceneManager.scene.remove(arrow);
        });
        modelSizeData.arrows = [];
        
        const widthStart = new THREE.Vector3(min.x, min.y - 15, min.z);
        const widthEnd = new THREE.Vector3(max.x, min.y - 15, min.z);
        const depthStart = new THREE.Vector3(max.x + 15, min.y, min.z);
        const depthEnd = new THREE.Vector3(max.x + 15, min.y, max.z);
        const heightStart = new THREE.Vector3(min.x - 15, min.y, min.z);
        const heightEnd = new THREE.Vector3(min.x - 15, max.y, min.z);
        
        this.addArrowsToLines(widthStart, widthEnd, modelSizeData.arrows);
        this.addArrowsToLines(depthStart, depthEnd, modelSizeData.arrows);
        this.addArrowsToLines(heightStart, heightEnd, modelSizeData.arrows);
      }
    });
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
  
  removeAllSizeLines: function() {
    this.allModelsSizeLines.forEach(modelSizeData => {
      if (modelSizeData.widthLine) this.sceneManager.scene.remove(modelSizeData.widthLine);
      if (modelSizeData.depthLine) this.sceneManager.scene.remove(modelSizeData.depthLine);
      if (modelSizeData.heightLine) this.sceneManager.scene.remove(modelSizeData.heightLine);
      
      if (modelSizeData.labels) {
        modelSizeData.labels.forEach(label => {
          this.sceneManager.scene.remove(label);
          if (label.material && label.material.map) {
            label.material.map.dispose();
          }
        });
      }
      
      if (modelSizeData.arrows) {
        modelSizeData.arrows.forEach(arrow => {
          this.sceneManager.scene.remove(arrow);
        });
      }
      
      if (modelSizeData.model && modelSizeData.model.userData) {
        delete modelSizeData.model.userData.sizeLines;
      }
    });
    
    this.allModelsSizeLines = [];
  },

  showAllModelsSizes: function() {
    DebugHelper.log('=== РАЗМЕРЫ ВСЕХ МОДЕЛЕЙ ===');
    
    let message = '<div style="max-height: 400px; overflow-y: auto;">';
    message += '<h3 style="margin: 0 0 10px 0;">📊 Размеры всех моделей:</h3>';
    
    let modelCount = 0;
    this.sceneManager.objects.forEach((obj, index) => {
      if (obj.userData.type === 'model') {
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const position = obj.position;
        
        const name = obj.userData.name || `Модель ${index + 1}`;
        
        message += `
          <div style="border-bottom: 1px solid #ddd; padding: 8px 0; font-family: monospace; font-size: 12px;">
            <strong>${name}</strong><br>
            📐 Ширина: ${size.x.toFixed(1)} | Высота: ${size.y.toFixed(1)} | Глубина: ${size.z.toFixed(1)}<br>
            📍 Позиция: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})
          </div>
        `;
        
        console.log(`${index + 1}. ${name}: ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)}`);
        modelCount++;
      }
    });
    
    if (modelCount === 0) {
      message += '<div style="padding: 20px; text-align: center; color: #999;">Нет загруженных моделей</div>';
    }
    
    message += '</div>';
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification(message, 'info', 8000);
    }
    
    DebugHelper.log(`Всего моделей: ${modelCount}`);
    DebugHelper.log('====================================');
  },
  
  showRoomInfo: function() {
    const roomW = this.sceneManager.roomW;
    const roomH = this.sceneManager.roomH;
    const roomD = this.sceneManager.roomD;
    
    const message = `
      🏠 <strong>Информация о комнате</strong><br>
      ─────────────────<br>
      📐 Ширина (X): ${roomW} ед.<br>
      📏 Высота (Y): ${roomH} ед.<br>
      📐 Глубина (Z): ${roomD} ед.<br>
      ─────────────────<br>
      📍 Уровень пола: ${this.sceneManager.floorLevel}
    `;
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification(message, 'info', 5000);
    }
  }
};