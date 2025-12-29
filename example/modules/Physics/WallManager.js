const WallManager = {
  sceneManager: null,
  wallSnapDistance: 20,
  wallOffsetMargin: 15,

  init: function(sceneManager) {
    this.sceneManager = sceneManager;
  },

  snapToWalls: function(selectedObject) {
    if (!selectedObject) {
      this.sceneManager.objects.forEach((obj) => {
        this.snapObjectToWall(obj);
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
    
    const distanceToLeftWall = Math.abs(currentPos.x - (-roomW/2 + halfSize.x + this.wallOffsetMargin));
    const distanceToRightWall = Math.abs(currentPos.x - (roomW/2 - halfSize.x - this.wallOffsetMargin));
    const distanceToBackWall = Math.abs(currentPos.z - (-roomD/2 + halfSize.z + this.wallOffsetMargin));
    const distanceToFrontWall = Math.abs(currentPos.z - (roomD/2 - halfSize.z - this.wallOffsetMargin));
    
    const minDistance = Math.min(
      distanceToLeftWall,
      distanceToRightWall,
      distanceToBackWall,
      distanceToFrontWall
    );
    
    const originalHeight = currentPos.y;
    
    if (minDistance <= this.wallSnapDistance) {
      if (minDistance === distanceToLeftWall) {
        object.position.x = -roomW/2 + halfSize.x + this.wallOffsetMargin;
        object.position.z = currentPos.z;
      } else if (minDistance === distanceToRightWall) {
        object.position.x = roomW/2 - halfSize.x - this.wallOffsetMargin;
        object.position.z = currentPos.z;
      } else if (minDistance === distanceToBackWall) {
        object.position.z = -roomD/2 + halfSize.z + this.wallOffsetMargin;
        object.position.x = currentPos.x;
      } else if (minDistance === distanceToFrontWall) {
        object.position.z = roomD/2 - halfSize.z - this.wallOffsetMargin;
        object.position.x = currentPos.x;
      }
      
      object.position.y = originalHeight;
      
      DebugHelper.log('Объект пристыкован к стене:', {
        position: object.position,
        halfSize: halfSize,
        originalHeight: originalHeight
      });
    }
  }
};