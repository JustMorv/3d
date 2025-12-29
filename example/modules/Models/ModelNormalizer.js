const ModelNormalizer = {
  TARGET_WIDTH: 300,
  TARGET_HEIGHT_SCALE: 0.8,
  MAX_HEIGHT: 250,

  normalizeModel: function(obj) {
    const originalWidth = obj.userData.scaleInfo ? 
                         obj.userData.scaleInfo.originalWidth : 
                         obj.userData.originalWidth / obj.scale.x;
    
    const originalHeight = obj.userData.scaleInfo ? 
                          obj.userData.scaleInfo.originalHeight : 
                          obj.userData.originalHeight / obj.scale.y;
    
    const widthScale = this.TARGET_WIDTH / originalWidth;
    const scaledHeight = originalHeight * widthScale;
    let heightScale = 1;
    
    if (scaledHeight > this.MAX_HEIGHT) {
      heightScale = this.MAX_HEIGHT / scaledHeight;
    }
    
    const newScale = widthScale * heightScale * this.TARGET_HEIGHT_SCALE;
    
    obj.scale.setScalar(newScale);
    
    const box = new THREE.Box3().setFromObject(obj);
    const minY = box.min.y;
    
    if (minY < 0) {
      obj.position.y += -minY;
    }
    
    obj.userData.originalScale = newScale;
    obj.userData.originalWidth = this.TARGET_WIDTH;
    obj.userData.originalHeight = box.getSize(new THREE.Vector3()).y;
    
    if (window.app && window.app.collisionManager) {
      window.app.collisionManager.updateObjectHalfSize(obj);
    }
    
    DebugHelper.log('Нормализована модель:', obj.userData.name, 
      'новый масштаб:', newScale.toFixed(3),
      'новая ширина:', this.TARGET_WIDTH,
      'новая высота:', obj.userData.originalHeight.toFixed(1));
  }
};