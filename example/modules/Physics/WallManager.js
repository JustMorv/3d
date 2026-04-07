const WallManager = {
  sceneManager: null,
  wallSnapDistance: 30, // Увеличил дистанцию срабатывания
  wallOffsetMargin: 15,

  init: function(sceneManager) {
    this.sceneManager = sceneManager;
  },

  snapToWalls: function(selectedObject) {
    if (!selectedObject) {
      this.sceneManager.objects.forEach((obj) => {
        if (obj.userData.type === 'model') {
          this.snapObjectToWall(obj);
        }
      });
    } else {
      this.snapObjectToWall(selectedObject);
    }
    
    EventManager.emit('walls-snapped', { selectedObject });
  },

snapObjectToWall: function(object) {
  if (!object) return;
  
  if (window.app && window.app.collisionManager) {
    window.app.collisionManager.updateObjectHalfSize(object);
  }
  
  const halfSize = object.userData.combinedHalfSize || object.userData.halfSize;
  if (!halfSize) return;
  
  const currentPos = object.position.clone();
  const roomW = this.sceneManager.roomW;
  const roomD = this.sceneManager.roomD;
  
  const FIXED_WALL_GAP = 5;
  
  // Границы с учетом размера модели
  const leftWallX = -roomW/2 + halfSize.x + FIXED_WALL_GAP;
  const rightWallX = roomW/2 - halfSize.x - FIXED_WALL_GAP;
  const backWallZ = -roomD/2 + halfSize.z + FIXED_WALL_GAP;
  const frontWallZ = roomD/2 - halfSize.z - FIXED_WALL_GAP;
  
  const distanceToLeftWall = Math.abs(currentPos.x - leftWallX);
  const distanceToRightWall = Math.abs(currentPos.x - rightWallX);
  const distanceToBackWall = Math.abs(currentPos.z - backWallZ);
  const distanceToFrontWall = Math.abs(currentPos.z - frontWallZ);
  
  const minDistance = Math.min(
    distanceToLeftWall,
    distanceToRightWall,
    distanceToBackWall,
    distanceToFrontWall
  );
  
  if (minDistance <= this.wallSnapDistance) {
    const originalY = currentPos.y;
    
    if (minDistance === distanceToLeftWall) {
      object.position.x = leftWallX;
    } else if (minDistance === distanceToRightWall) {
      object.position.x = rightWallX;
    } else if (minDistance === distanceToBackWall) {
      object.position.z = backWallZ;
    } else if (minDistance === distanceToFrontWall) {
      object.position.z = frontWallZ;
    }
    
    object.position.y = originalY;
    
    if (window.app && window.app.uiManager) {
      window.app.uiManager.showNotification('Объект пристыкован к стене', 'success', 1500);
    }
  }
},
  // НОВЫЙ МЕТОД: принудительная стыковка к указанной стене
  snapToSpecificWall: function(object, wallSide) {
    if (!object) return;
    
    if (window.app && window.app.collisionManager) {
      window.app.collisionManager.updateObjectHalfSize(object);
    }
    
    const halfSize = object.userData.combinedHalfSize || object.userData.halfSize;
    if (!halfSize) return;
    
    const roomW = this.sceneManager.roomW;
    const roomD = this.sceneManager.roomD;
    
    const minX = -roomW/2 + halfSize.x + this.wallOffsetMargin;
    const maxX = roomW/2 - halfSize.x - this.wallOffsetMargin;
    const minZ = -roomD/2 + halfSize.z + this.wallOffsetMargin;
    const maxZ = roomD/2 - halfSize.z - this.wallOffsetMargin;
    
    const originalY = object.position.y;
    const oldPosition = object.position.clone();
    
    switch(wallSide) {
      case 'left':
        object.position.x = minX;
        break;
      case 'right':
        object.position.x = maxX;
        break;
      case 'back':
        object.position.z = minZ;
        break;
      case 'front':
        object.position.z = maxZ;
        break;
    }
    
    object.position.y = originalY;
    
    // Проверка коллизий
    let hasCollision = false;
    for (let i = 0; i < this.sceneManager.objects.length; i++) {
      const other = this.sceneManager.objects[i];
      if (other === object) continue;
      if (other.userData.type !== 'model') continue;
      
      const otherHalfSize = other.userData.combinedHalfSize || other.userData.halfSize;
      if (!otherHalfSize) continue;
      
      const dx = Math.abs(object.position.x - other.position.x);
      const dz = Math.abs(object.position.z - other.position.z);
      const minDistX = halfSize.x + otherHalfSize.x + 5;
      const minDistZ = halfSize.z + otherHalfSize.z + 5;
      
      if (dx < minDistX && dz < minDistZ) {
        hasCollision = true;
        break;
      }
    }
    
    if (hasCollision) {
      object.position.copy(oldPosition);
      if (window.app && window.app.uiManager) {
        window.app.uiManager.showNotification('Нельзя пристыковать - мешает другой объект', 'warning', 2000);
      }
    } else {
      if (window.app && window.app.collisionManager) {
        window.app.collisionManager.updateAllColliders(object);
      }
      if (window.app && window.app.uiManager) {
        window.app.uiManager.showNotification(`Объект пристыкован к ${wallSide} стене`, 'success', 1500);
      }
    }
  }
};