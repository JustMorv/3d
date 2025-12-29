const CollisionHelper = {
  collisionManager: null,

  init: function(collisionManager) {
    this.collisionManager = collisionManager;
  },

  createCollisionMesh: function(object) {
    if (!object || object.userData.type !== 'model') return [];
    
    DebugHelper.log('Создаем коллайдеры для модели:', object.name || object.userData.name);
    
    const box = new THREE.Box3().setFromObject(object);
    const colliders = [box.clone()];
    
    DebugHelper.log('Размер модели:', box.getSize(new THREE.Vector3()));
    
    return colliders;
  },

  updateCollidersPosition: function(object) {
    if (!object || !object.userData.colliders || object.userData.colliders.length === 0) return;
    
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    object.userData.colliders[0].copy(box);
    
    if (this.collisionManager.showDebugColliders && object.userData.debugColliderMeshes) {
      this.updateDebugCollidersPosition(object);
    }
  },

  updateDebugCollidersPosition: function(object) {
    if (!object.userData.debugColliderMeshes) return;
    
    object.userData.debugColliderMeshes.forEach((mesh, index) => {
      if (index === 0) {
        const box = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.position.copy(center);
        
        const size = box.getSize(new THREE.Vector3());
        mesh.scale.set(
          size.x / (mesh.geometry.parameters.width || 1),
          size.y / (mesh.geometry.parameters.height || 1),
          size.z / (mesh.geometry.parameters.depth || 1)
        );
      }
    });
  },

  checkComplexCollision: function(movingObject, position, otherObject) {
    if (!otherObject.userData.colliders || otherObject.userData.colliders.length === 0) {
      return false;
    }
    
    this.updateCollidersPosition(otherObject);
    
    const movingBox = new THREE.Box3();
    const movingHalfSize = movingObject.userData.combinedHalfSize || movingObject.userData.halfSize;
    if (!movingHalfSize) return false;
    
    movingBox.setFromCenterAndSize(
      position,
      new THREE.Vector3(
        movingHalfSize.x * 2 + this.collisionManager.collisionMargin,
        movingHalfSize.y * 2,
        movingHalfSize.z * 2 + this.collisionManager.collisionMargin
      )
    );
    
    for (let i = 0; i < otherObject.userData.colliders.length; i++) {
      const collider = otherObject.userData.colliders[i];
      
      const expandedCollider = collider.clone();
      expandedCollider.expandByScalar(this.collisionManager.collisionMargin);
      
      if (movingBox.intersectsBox(expandedCollider)) {
        DebugHelper.incrementCollisionChecks();
        return true;
      }
    }
    
    return false;
  },

  findPushVector: function(movingObject, position, otherObject) {
    const pushVector = new THREE.Vector3();
    const movingBox = new THREE.Box3();
    const movingHalfSize = movingObject.userData.combinedHalfSize || movingObject.userData.halfSize;
    
    if (!movingHalfSize) return pushVector;
    
    movingBox.setFromCenterAndSize(
      position,
      new THREE.Vector3(
        movingHalfSize.x * 2,
        movingHalfSize.y * 2,
        movingHalfSize.z * 2
      )
    );
    
    let nearestCollider = null;
    let minDistance = Infinity;
    let nearestDirection = new THREE.Vector3();
    
    if (!otherObject.userData.colliders) {
      otherObject.userData.colliders = this.createCollisionMesh(otherObject);
    }
    
    for (let i = 0; i < otherObject.userData.colliders.length; i++) {
      const collider = otherObject.userData.colliders[i];
      if (movingBox.intersectsBox(collider)) {
        const colliderCenter = new THREE.Vector3();
        collider.getCenter(colliderCenter);
        
        const direction = new THREE.Vector3().subVectors(position, colliderCenter);
        const distance = direction.length();
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestCollider = collider;
          nearestDirection = direction.normalize();
        }
      }
    }
    
    if (nearestCollider && minDistance < Infinity) {
      pushVector.copy(nearestDirection).multiplyScalar(this.collisionManager.collisionMargin * 2);
    }
    
    return pushVector;
  },

  checkWallCollision: function(position, halfSize, roomW, roomD, wallOffsetMargin) {
    const result = { position: position.clone(), hasCollision: false };
    
    const minX = -roomW/2 + halfSize.x + wallOffsetMargin;
    const maxX = roomW/2 - halfSize.x - wallOffsetMargin;
    const minZ = -roomD/2 + halfSize.z + wallOffsetMargin;
    const maxZ = roomD/2 - halfSize.z - wallOffsetMargin;
    
    const originalY = result.position.y;
    let hasWallCollision = false;
    
    if (result.position.x < minX) {
      result.position.x = minX;
      hasWallCollision = true;
    }
    if (result.position.x > maxX) {
      result.position.x = maxX;
      hasWallCollision = true;
    }
    if (result.position.z < minZ) {
      result.position.z = minZ;
      hasWallCollision = true;
    }
    if (result.position.z > maxZ) {
      result.position.z = maxZ;
      hasWallCollision = true;
    }
    
    result.position.y = originalY;
    result.hasCollision = hasWallCollision;
    
    return result;
  },

  checkObjectCollisions: function(position, movingObject, movingHalfSize, objects, collisionManager) {
    const result = { position: position.clone(), hasCollision: false };
    
    if (!collisionManager.enablePreciseCollisions) {
      for (let i = 0; i < objects.length; i++) {
        const otherObject = objects[i];
        if (otherObject === movingObject) continue;
        
        const otherHalfSize = otherObject.userData.combinedHalfSize || otherObject.userData.halfSize;
        if (!otherHalfSize) continue;
        
        const dx = Math.abs(result.position.x - otherObject.position.x);
        const dz = Math.abs(result.position.z - otherObject.position.z);
        const minDistanceX = movingHalfSize.x + otherHalfSize.x + collisionManager.collisionMargin;
        const minDistanceZ = movingHalfSize.z + otherHalfSize.z + collisionManager.collisionMargin;
        
        if (dx < minDistanceX && dz < minDistanceZ) {
          const overlapX = minDistanceX - dx;
          const overlapZ = minDistanceZ - dz;
          
          if (overlapX < overlapZ) {
            if (result.position.x < otherObject.position.x) {
              result.position.x = otherObject.position.x - minDistanceX;
            } else {
              result.position.x = otherObject.position.x + minDistanceX;
            }
          } else {
            if (result.position.z < otherObject.position.z) {
              result.position.z = otherObject.position.z - minDistanceZ;
            } else {
              result.position.z = otherObject.position.z + minDistanceZ;
            }
          }
          
          result.hasCollision = true;
          return result;
        }
      }
    } else {
      for (let i = 0; i < objects.length; i++) {
        const otherObject = objects[i];
        if (otherObject === movingObject) continue;
        
        const movingSphereRadius = Math.max(movingHalfSize.x, movingHalfSize.z);
        const movingSphere = new THREE.Sphere(position, movingSphereRadius);
        
        const otherHalfSize = otherObject.userData.combinedHalfSize || otherObject.userData.halfSize;
        if (!otherHalfSize) continue;
        
        const otherSphereRadius = Math.max(otherHalfSize.x, otherHalfSize.z);
        const otherSphere = new THREE.Sphere(otherObject.position, otherSphereRadius);
        
        if (!movingSphere.intersectsSphere(otherSphere)) continue;
        
        if (this.checkComplexCollision(movingObject, result.position, otherObject)) {
          const pushVector = this.findPushVector(movingObject, result.position, otherObject);
          result.position.add(pushVector);
          result.hasCollision = true;
          
          const wallCheck = this.checkWallCollision(
            result.position, 
            movingHalfSize,
            collisionManager.sceneManager.roomW,
            collisionManager.sceneManager.roomD,
            collisionManager.wallOffsetMargin
          );
          
          if (wallCheck.hasCollision) {
            result.position = wallCheck.position;
          }
          
          return result;
        }
      }
    }
    
    return result;
  },

  findNearestFreePosition: function(movingObject, blockingObject, objects, objectIndex, roomW, roomD, collisionMargin) {
    if (!movingObject || !blockingObject) return movingObject.position;
    
    const movingHalfSize = movingObject.userData.halfSize;
    const blockingHalfSize = blockingObject.userData.halfSize;
    
    if (!movingHalfSize || !blockingHalfSize) return movingObject.position;
    
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize()
    ];
    
    const baseDistance = movingHalfSize.x + blockingHalfSize.x + collisionMargin * 2;
    
    for (let i = 0; i < directions.length; i++) {
      const direction = directions[i];
      const testPosition = blockingObject.position.clone();
      testPosition.add(direction.multiplyScalar(baseDistance));
      
      let hasCollision = false;
      for (let j = 0; j < objects.length; j++) {
        if (j === objectIndex) continue;
        const obj = objects[j];
        const objHalfSize = obj.userData.halfSize;
        if (!objHalfSize) continue;
        
        const dx = Math.abs(testPosition.x - obj.position.x);
        const dz = Math.abs(testPosition.z - obj.position.z);
        const minDistX = movingHalfSize.x + objHalfSize.x + collisionMargin;
        const minDistZ = movingHalfSize.z + objHalfSize.z + collisionMargin;
        
        if (dx < minDistX && dz < minDistZ) {
          hasCollision = true;
          break;
        }
      }
      
      if (!hasCollision) {
        return testPosition;
      }
    }
    
    const roomHalfWidth = roomW / 2;
    const roomHalfDepth = roomD / 2;
    
    for (let attempt = 0; attempt < 10; attempt++) {
      const randomX = -roomHalfWidth + Math.random() * roomW;
      const randomZ = -roomHalfDepth + Math.random() * roomD;
      const testPosition = new THREE.Vector3(randomX, movingObject.position.y, randomZ);
      
      let hasCollision = false;
      for (let j = 0; j < objects.length; j++) {
        if (j === objectIndex) continue;
        const obj = objects[j];
        const objHalfSize = obj.userData.halfSize;
        if (!objHalfSize) continue;
        
        const dx = Math.abs(testPosition.x - obj.position.x);
        const dz = Math.abs(testPosition.z - obj.position.z);
        const minDistX = movingHalfSize.x + objHalfSize.x + collisionMargin;
        const minDistZ = movingHalfSize.z + objHalfSize.z + collisionMargin;
        
        if (dx < minDistX && dz < minDistZ) {
          hasCollision = true;
          break;
        }
      }
      
      if (!hasCollision) {
        return testPosition;
      }
    }
    
    return movingObject.position;
  }
};