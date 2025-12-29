const CollisionManager = {
  sceneManager: null,
  collisionHelper: null,
  
  collisionMargin: 15,
  wallOffsetMargin: 15,
  wallSnapDistance: 20,
  
  enablePreciseCollisions: true,
  showDebugColliders: false,
  
  complexShapes: {},

  init: function(sceneManager) {
    this.sceneManager = sceneManager;
    this.collisionHelper = CollisionHelper;
    this.collisionHelper.init(this);
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

  visualizeColliders: function(object) {
    if (!object.userData.colliders || object.userData.colliders.length === 0) return;
    
    this.sceneManager.scene.traverse((child) => {
      if (child.userData && child.userData.debugCollider && child.userData.parentId === object.uuid) {
        this.sceneManager.scene.remove(child);
      }
    });
    
    object.userData.debugColliderMeshes = [];
    
    object.userData.colliders.forEach((collider, index) => {
      const size = new THREE.Vector3();
      collider.getSize(size);
      
      const center = new THREE.Vector3();
      collider.getCenter(center);
      
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      mesh.userData = {
        debugCollider: true,
        parentId: object.uuid,
        colliderIndex: index
      };
      
      this.sceneManager.scene.add(mesh);
      object.userData.debugColliderMeshes.push(mesh);
    });
  },

  checkAllCollisions: function(position, movingObject) {
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
    
    return result;
  },

  checkInitialCollisions: function(newObject) {
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