const CollisionManager = {
 sceneManager: null,
  collisionHelper: null,
  
  collisionMargin: 0,
  wallOffsetMargin: 0,
  wallSnapDistance: 30,
  
  enablePreciseCollisions: true,
  showDebugColliders: false,
  collisionsEnabled: true, 
  
  
  complexShapes: {},

  init: function(sceneManager) {
    this.sceneManager = sceneManager;
    this.collisionHelper = CollisionHelper;
    this.collisionHelper.init(this);
  },

  toggleCollisions: function() {
    this.collisionsEnabled = !this.collisionsEnabled;
    DebugHelper.log('Коллизии:', this.collisionsEnabled ? 'ВКЛ' : 'ВЫКЛ');
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification(`Коллизии ${this.collisionsEnabled ? 'ВКЛЮЧЕНЫ' : 'ВЫКЛЮЧЕНЫ'}`, 'info', 2000);
    }
    return this.collisionsEnabled;
  },

  togglePreciseCollisions: function() {
    this.enablePreciseCollisions = !this.enablePreciseCollisions;
    const status = this.enablePreciseCollisions ? 'ВКЛ' : 'ВЫКЛ';
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.updateCollisionStatus(this.enablePreciseCollisions);
    }
    
    DebugHelper.log('Точные столкновения:', status);
    
    if (this.enablePreciseCollisions) {
      this.sceneManager.objects.forEach((obj) => {
        if (obj.userData.type === 'model' && !obj.userData.colliders) {
          this.updateObjectHalfSize(obj);
        }
      });
    }
  },

  showColliders: function() {
    this.showDebugColliders = true;
    this.sceneManager.objects.forEach((obj) => {
      if (obj.userData.type === 'model') {
        if (!obj.userData.colliders) {
          this.updateObjectHalfSize(obj);
        }
        this.visualizeColliders(obj);
      }
    });
    DebugHelper.log('Коллайдеры показаны');
  },

  hideColliders: function() {
    this.showDebugColliders = false;
    this.sceneManager.scene.traverse((child) => {
      if (child.userData && child.userData.debugCollider) {
        this.sceneManager.scene.remove(child);
      }
    });
    
    this.sceneManager.objects.forEach((obj) => {
      if (obj.userData.debugColliderMeshes) {
        obj.userData.debugColliderMeshes = [];
      }
    });
    
    DebugHelper.log('Коллайдеры скрыты');
  },

  updateObjectHalfSize: function(object) {
    if (!object) return;
    
    const box = new THREE.Box3().setFromObject(object);
    object.userData.boundingBox = box.clone();
    
    const size = box.getSize(new THREE.Vector3());
    object.userData.halfSize = {
      x: size.x / 2,
      y: size.y / 2,
      z: size.z / 2
    };
    
    if (object.userData.type === 'model' && object.children.length > 0) {
      const meshes = [];
      object.traverse((child) => {
        if (child.isMesh) {
          const meshBox = new THREE.Box3().setFromObject(child);
          meshes.push(meshBox);
        }
      });
      
      if (meshes.length > 0) {
        const combinedBox = meshes[0].clone();
        for (let i = 1; i < meshes.length; i++) {
          combinedBox.union(meshes[i]);
        }
        
        const combinedSize = combinedBox.getSize(new THREE.Vector3());
        object.userData.combinedHalfSize = {
          x: combinedSize.x / 2,
          y: combinedSize.y / 2,
          z: combinedSize.z / 2
        };
        
        object.userData.preciseBoundingBox = combinedBox;
        
        if (!object.userData.colliders) {
          try {
            object.userData.colliders = this.collisionHelper.createCollisionMesh(object);
            this.complexShapes[object.uuid] = {
              colliders: object.userData.colliders,
              type: object.userData.name || 'complex'
            };
            
            DebugHelper.log('Созданы коллайдеры для объекта', object.name, 'количество:', object.userData.colliders.length);
            
            if (this.showDebugColliders) {
              this.visualizeColliders(object);
            }
          } catch (error) {
            DebugHelper.warn('Ошибка при создании коллайдеров:', error);
            object.userData.colliders = [box.clone()];
          }
        } else {
          this.collisionHelper.updateCollidersPosition(object);
        }
      }
    }
  },

checkCollisionsXZ: function(position, movingObject) {
  if (!this.collisionsEnabled) {
    return { position: position.clone(), hasCollision: false };
  }
  
  const result = { position: position.clone(), hasCollision: false };
  
  // Получаем halfSize модели
  const movingHalfSize = movingObject.userData.combinedHalfSize || movingObject.userData.halfSize;
  
  if (!movingHalfSize) {
    DebugHelper.warn('Нет halfSize у объекта:', movingObject.userData.name);
    return result;
  }
  
  // Проверка стен
  const wallCollision = this.collisionHelper.checkWallCollisionXZ(
    result.position, 
    movingHalfSize,
    this.sceneManager.roomW,
    this.sceneManager.roomD,
    this.wallOffsetMargin
  );
  
  result.position = wallCollision.position;
  result.hasCollision = wallCollision.hasCollision;
  
  // Проверка коллизий с другими объектами (опционально)
  if (this.enablePreciseCollisions) {
    const objectCollision = this.collisionHelper.checkObjectCollisionsXZ(
      result.position,
      movingObject,
      movingHalfSize,
      this.sceneManager.objects,
      this
    );
    
    if (objectCollision.hasCollision) {
      result.position = objectCollision.position;
      result.hasCollision = true;
    }
  }
  
  return result;
},
  checkFloorCollision: function(position, object) {
    const result = position.clone();
    
    if (!object || !object.userData.halfSize) {
      return result;
    }
    
    const halfSize = object.userData.combinedHalfSize || object.userData.halfSize;
    const floorLevel = this.sceneManager.floorLevel;
    
    const bottomY = result.y - halfSize.y;
    
    if (bottomY < floorLevel) {
      result.y = floorLevel + halfSize.y;
    }
    
    return result;
  },

  isObjectInCollision: function(object) {
    if (!this.collisionsEnabled) return false;
    if (!object || !object.userData.halfSize) return false;
    
    const halfSize = object.userData.combinedHalfSize || object.userData.halfSize;
    const position = object.position.clone();
    
    const wallCheck = this.collisionHelper.checkWallCollision(
      position,
      halfSize,
      this.sceneManager.roomW,
      this.sceneManager.roomD,
      this.wallOffsetMargin
    );
    
    if (wallCheck.hasCollision) {
      return true;
    }
    
    for (let i = 0; i < this.sceneManager.objects.length; i++) {
      const otherObject = this.sceneManager.objects[i];
      if (otherObject === object) continue;
      
      const otherHalfSize = otherObject.userData.combinedHalfSize || otherObject.userData.halfSize;
      if (!otherHalfSize) continue;
      
      const dx = Math.abs(position.x - otherObject.position.x);
      const dz = Math.abs(position.z - otherObject.position.z);
      const minDistanceX = halfSize.x + otherHalfSize.x + this.collisionMargin;
      const minDistanceZ = halfSize.z + otherHalfSize.z + this.collisionMargin;
      
      if (dx < minDistanceX && dz < minDistanceZ) {
        return true;
      }
    }
    
    return false;
  },

  checkAllCollisions: function(position, movingObject) {
    if (!this.collisionsEnabled) {
      return { position: position.clone(), hasCollision: false };
    }
    
    const result = { position: position.clone(), hasCollision: false };
    
    const movingHalfSize = movingObject.userData.combinedHalfSize || movingObject.userData.halfSize || { x: 0, y: 0, z: 0 };
    
    const wallCollision = this.collisionHelper.checkWallCollision(
      result.position, 
      movingHalfSize,
      this.sceneManager.roomW,
      this.sceneManager.roomD,
      this.wallOffsetMargin
    );
    
    if (wallCollision.hasCollision) {
      result.position = wallCollision.position;
      result.hasCollision = true;
    }
    
    const objectCollision = this.collisionHelper.checkObjectCollisions(
      result.position, 
      movingObject, 
      movingHalfSize,
      this.sceneManager.objects,
      this
    );
    
    if (objectCollision.hasCollision) {
      result.position = objectCollision.position;
      result.hasCollision = true;
    }
    
    const floorCheck = this.checkFloorCollision(result.position, movingObject);
    if (floorCheck.y !== result.position.y) {
      result.position = floorCheck;
      result.hasCollision = true;
    }
    
    return result;
  },

 visualizeColliders: function(object) {
  if (!object.userData.halfSize) return;
  
  const halfSize = object.userData.halfSize;
  const center = object.position.clone();
  
  // Создаем видимую рамку вокруг модели
  const geometry = new THREE.BoxGeometry(halfSize.x * 2, halfSize.y * 2, halfSize.z * 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });
  
  const wireframe = new THREE.Mesh(geometry, material);
  wireframe.position.copy(center);
  wireframe.userData = { debugCollider: true, parentId: object.uuid };
  
  // Удаляем старый коллайдер если есть
  if (object.userData.debugWireframe) {
    this.sceneManager.scene.remove(object.userData.debugWireframe);
  }
  
  object.userData.debugWireframe = wireframe;
  this.sceneManager.scene.add(wireframe);
  
  console.log('Визуализация коллайдера для:', object.userData.name);
  console.log('Позиция коллайдера:', center);
  console.log('Размер коллайдера:', halfSize);
},

  checkInitialCollisions: function(newObject) {
    if (!this.collisionsEnabled) return;
    if (!newObject || !newObject.userData.halfSize) return;
    
    let position = newObject.position.clone();
    const halfSize = newObject.userData.halfSize;
    const objectIndex = this.sceneManager.objects.indexOf(newObject);
    
    const wallCheck = this.collisionHelper.checkWallCollision(
      position, 
      halfSize,
      this.sceneManager.roomW,
      this.sceneManager.roomD,
      this.wallOffsetMargin
    );
    
    if (wallCheck.hasCollision) {
      DebugHelper.log('Новая модель выходит за пределы комнаты, корректируем позицию');
      newObject.position.copy(wallCheck.position);
      position.copy(wallCheck.position);
    }
    
    for (let i = 0; i < this.sceneManager.objects.length; i++) {
      const otherObject = this.sceneManager.objects[i];
      if (otherObject === newObject) continue;
      
      const otherHalfSize = otherObject.userData.halfSize;
      if (!otherHalfSize) continue;
      
      const dx = Math.abs(position.x - otherObject.position.x);
      const dz = Math.abs(position.z - otherObject.position.z);
      const minDistanceX = halfSize.x + otherHalfSize.x + this.collisionMargin;
      const minDistanceZ = halfSize.z + otherHalfSize.z + this.collisionMargin;
      
      if (dx < minDistanceX && dz < minDistanceZ) {
        DebugHelper.log('Новая модель пересекается с существующей, перемещаем');
        
        const newPosition = this.collisionHelper.findNearestFreePosition(
          newObject, 
          otherObject,
          this.sceneManager.objects,
          objectIndex,
          this.sceneManager.roomW,
          this.sceneManager.roomD,
          this.collisionMargin
        );
        
        let hasCollisionAtNewPosition = false;
        for (let j = 0; j < this.sceneManager.objects.length; j++) {
          if (j === objectIndex) continue;
          const obj = this.sceneManager.objects[j];
          const objHalfSize = obj.userData.halfSize;
          if (!objHalfSize) continue;
          
          const dx2 = Math.abs(newPosition.x - obj.position.x);
          const dz2 = Math.abs(newPosition.z - obj.position.z);
          const minDistX2 = halfSize.x + objHalfSize.x + this.collisionMargin;
          const minDistZ2 = halfSize.z + objHalfSize.z + this.collisionMargin;
          
          if (dx2 < minDistX2 && dz2 < minDistZ2) {
            hasCollisionAtNewPosition = true;
            break;
          }
        }
        
        if (!hasCollisionAtNewPosition) {
          newObject.position.copy(newPosition);
        } else {
          const anotherPosition = this.collisionHelper.findNearestFreePosition(
            newObject, 
            otherObject,
            this.sceneManager.objects,
            objectIndex,
            this.sceneManager.roomW,
            this.sceneManager.roomD,
            this.collisionMargin
          );
          newObject.position.copy(anotherPosition);
        }
        
        DebugHelper.log('Перемещено в позицию:', newObject.position);
        break;
      }
    }
  },

  updateAllColliders: function(object) {
    if (!object) return;
    
    this.updateObjectHalfSize(object);
    
    if (object.userData.colliders && object.userData.colliders.length > 0) {
      this.collisionHelper.updateCollidersPosition(object);
    }
  }
};