// example\modules\Models\ModelManager.js
const ModelManager = {
  sceneManager: null,
  modelNormalizer: null,

  init: function(sceneManager) {
    this.sceneManager = sceneManager;
    this.modelNormalizer = ModelNormalizer;
  },

  clearAllModels: function() {
    if (confirm('Удалить все модели?')) {
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
    
    DebugHelper.log('Все модели центрированы');
  },

  // НОВЫЙ МЕТОД: Принудительное размещение всех моделей в комнате
  forceModelsIntoRoom: function() {
    DebugHelper.log('Принудительное размещение всех моделей в комнате');
    
    this.sceneManager.objects.forEach((obj, index) => {
      if (obj.userData.type === 'model') {
        // Обновляем размеры модели
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
        
        // Рассчитываем допустимые границы
        const maxX = roomHalfWidth - halfSize.x;
        const minX = -roomHalfWidth + halfSize.x;
        const maxZ = roomHalfDepth - halfSize.z;
        const minZ = -roomHalfDepth + halfSize.z;
        
        // Корректируем позицию
        obj.position.x = Math.max(minX, Math.min(maxX, obj.position.x));
        obj.position.z = Math.max(minZ, Math.min(maxZ, obj.position.z));
        
        // Выравниваем по полу
        const minY = box.min.y;
        if (minY < this.sceneManager.floorLevel) {
          obj.position.y += this.sceneManager.floorLevel - minY;
        }
        
        DebugHelper.log(`Модель ${index + 1} скорректирована:`, {
          имя: obj.userData.name,
          позиция: obj.position,
          размер: size,
          halfSize: halfSize
        });
      }
    });
    
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
        
        // Если модель больше 70% комнаты - уменьшаем
        const maxAllowedWidth = roomW * 0.7;
        const maxAllowedDepth = roomD * 0.7;
        
        if (size.x > maxAllowedWidth || size.z > maxAllowedDepth) {
          const widthScale = maxAllowedWidth / size.x;
          const depthScale = maxAllowedDepth / size.z;
          const scale = Math.min(widthScale, depthScale) * 0.9; // Дополнительно уменьшаем на 10%
          
          obj.scale.multiplyScalar(scale);
          
          DebugHelper.log('Уменьшена модель:', obj.userData.name, 'новый масштаб:', obj.scale.x);
        }
      }
    });
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification('Слишком большие модели уменьшены', 'success');
    }
  }
};