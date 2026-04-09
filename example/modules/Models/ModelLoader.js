const ModelLoader = {
  sceneManager: null,
  loaders: {
    gltf: null,
    obj: null
  },
  
  MODEL_TARGET_WIDTH: 300,
  MODEL_TARGET_HEIGHT_SCALE: 0.8,
  MODEL_MAX_HEIGHT: 250,

  modelMap: {
    'basic_kitchen': 'ШН36-50.glb',
    'cabinet': 'ШН36-60.glb',
    'hallway': 'ШН46-50.glb',
    'kitchen': 'ШН46-60.glb',
    'kitchen1': 'ШН75-15.glb',
    'kitchen2': 'ШН75-20.glb',
    'kitchen_cabinets': 'ШН75-30.glb',
    'kitchen_set': 'ШН75-40.glb',
    'kitchen_model_2': 'ШН75-45.glb',
    'modern_kitchen': 'ШН75-50.glb',
    'living_room': 'ШН75-60.glb',
    'new_kitchen': 'ШН75-60-2.glb',
    'pigan': 'ШН92-15.glb',
    'pobin': 'ШН92-15.glb'
  },
  init: function(sceneManager) {
    this.sceneManager = sceneManager;
    this.loaders.gltf = new THREE.GLTFLoader();
    this.loaders.obj = new THREE.OBJLoader();
  },

  loadModel: function(modelType) {
    if (!this.modelMap[modelType]) {
      console.error('Неизвестный тип модели:', modelType);
      alert('Модель не найдена: ' + modelType);
      return;
    }

    const modelPath = '../models/3dModels/3Д модели/' + this.modelMap[modelType];
    DebugHelper.log('Загружаем модель:', modelPath);

    this.loaders.gltf.load(
      modelPath,
      (gltf) => this.onModelLoaded(gltf, modelType),
      (xhr) => this.onProgress(xhr),
      (error) => this.onError(error, modelType)
    );
  },

onModelLoaded: function(gltf, modelType) {
  const model = gltf.scene;
  const modelGroup = new THREE.Group();
  modelGroup.name = modelType + '_group';
  
  // ПРИНУДИТЕЛЬНОЕ ЦЕНТРИРОВАНИЕ МОДЕЛИ
  // Сначала вычисляем bounding box оригинальной модели
  const tempBox = new THREE.Box3().setFromObject(model);
  const center = tempBox.getCenter(new THREE.Vector3());
  const size = tempBox.getSize(new THREE.Vector3());
  const minY = tempBox.min.y;
  
  console.log('=== ДО центрирования ===');
  console.log('Центр модели:', center);
  console.log('Размер:', size);
  console.log('minY:', minY);
  
  // Смещаем все дочерние объекты так, чтобы центр стал в 0,0,0
  model.position.sub(center);
  
  // Проверяем после центрирования
  const centeredBox = new THREE.Box3().setFromObject(model);
  const centeredMinY = centeredBox.min.y;
  const centeredSize = centeredBox.getSize(new THREE.Vector3());
  
  console.log('=== ПОСЛЕ центрирования ===');
  console.log('Новый minY:', centeredMinY);
  console.log('Новый размер:', centeredSize);
  
  // Добавляем модель в группу
  modelGroup.add(model);
  
  // Теперь центрирование выполнено, модель стоит так, что её центр в 0,0,0
  // Нужно поднять её так, чтобы нижняя точка была на 0
  const finalBoxBeforeScale = new THREE.Box3().setFromObject(modelGroup);
  const finalMinYBeforeScale = finalBoxBeforeScale.min.y;
  
  console.log('minY перед масштабированием:', finalMinYBeforeScale);
  
  // Вычисляем масштаб
  const scale = this.calculateModelScaleWithRoomCheck(centeredSize, modelType);
  modelGroup.scale.setScalar(scale);
  
  // После масштабирования - ставим на пол
  const afterScaleBox = new THREE.Box3().setFromObject(modelGroup);
  const afterScaleMinY = afterScaleBox.min.y;
  
  console.log('minY после масштабирования:', afterScaleMinY);
  
  // Поднимаем на пол
  modelGroup.position.y = -afterScaleMinY;
  
  // Финальный размер
  const finalBox = new THREE.Box3().setFromObject(modelGroup);
  const finalSize = finalBox.getSize(new THREE.Vector3());
  const finalMinY = finalBox.min.y;
  
  console.log('=== ФИНАЛ ===');
  console.log('Размер:', finalSize);
  console.log('minY (должен быть 0):', finalMinY);
  console.log('Позиция Y:', modelGroup.position.y);
  
  // Расчет позиции в комнате (X, Z)
  const roomW = this.sceneManager.roomW;
  const roomD = this.sceneManager.roomD;
  const FIXED_WALL_GAP = 5;
  
  const halfSize = {
    x: finalSize.x / 2,
    z: finalSize.z / 2
  };
  
  const minX = -roomW/2 + halfSize.x + FIXED_WALL_GAP;
  const maxX = roomW/2 - halfSize.x - FIXED_WALL_GAP;
  const minZ = -roomD/2 + halfSize.z + FIXED_WALL_GAP;
  const maxZ = roomD/2 - halfSize.z - FIXED_WALL_GAP;
  
  const randomX = minX + Math.random() * (maxX - minX);
  const randomZ = minZ + Math.random() * (maxZ - minZ);
  
  modelGroup.position.x = randomX;
  modelGroup.position.z = randomZ;
  
  console.log('Позиция в комнате:', { x: randomX, z: randomZ });
  console.log('Финальная позиция:', modelGroup.position);
  
  // Настройка материалов
  modelGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (!child.userData.originalMaterial) {
        child.userData.originalMaterial = child.material;
      }
    }
  });

  // Сохраняем данные
  modelGroup.userData = {
    type: 'model',
    name: modelType,
    halfSize: halfSize,
    originalScale: modelGroup.scale.x,
    boundingBox: finalBox.clone(),
    originalWidth: finalSize.x,
    originalDepth: finalSize.z,
    originalHeight: finalSize.y,
    shape: 'complex',
    modelHeight: finalSize.y,
    baseY: 0,
    scaleInfo: {
      originalWidth: centeredSize.x,
      targetWidth: this.getTargetWidth(modelType),
      originalHeight: centeredSize.y,
      appliedScale: modelGroup.scale.x
    }
  };

  // Добавляем в сцену
  this.sceneManager.addObject(modelGroup);
  
  if (window.app && window.app.collisionManager) {
    window.app.collisionManager.updateObjectHalfSize(modelGroup);
  }
  

  
  console.log('Модель загружена:', modelType);
  EventManager.emit('model-loaded', { model: modelGroup, type: modelType });
},
  calculateModelScaleWithRoomCheck: function(originalSize, modelType) {
    const targetWidth = this.getTargetWidth(modelType);
    const widthScale = targetWidth / originalSize.x;
    
    const scaledHeight = originalSize.y * widthScale;
    
    let heightScale = 1;
    if (scaledHeight > this.MODEL_MAX_HEIGHT) {
      heightScale = this.MODEL_MAX_HEIGHT / scaledHeight;
    }
    
    const finalScale = widthScale * heightScale * this.getHeightScale(modelType);
    
    DebugHelper.log('Настройки масштабирования для ' + modelType + ':', {
      targetWidth: targetWidth,
      originalWidth: originalSize.x,
      originalHeight: originalSize.y,
      scaledHeight: scaledHeight,
      widthScale: widthScale,
      heightScale: heightScale,
      finalScale: finalScale
    });
    
    return finalScale;
  },

  getTargetWidth: function(modelType) {
    const specialSizes = {
    'kitchen_cabinets': 100,
    'new_kitchen': 100,
    'modern_kitchen': 100,
    'kitchen': 100,
    'kitchen1': 100,
    'kitchen2': 100,
    'kitchen_cabinets2': 100,
    'kitchen_set': 100,
    'living_room': 100, 
    'hallway': 100,
    'basic_kitchen': 100,
    'cabinet': 100,
    'kitchen_model_2': 100,
    'pigan': 100,
    'pobin': 100
  };
  
  return specialSizes[modelType] || 150;
  },

  getHeightScale: function(modelType) {
    const specialScales = {
      'living_room': 0.6,
      'kitchen_cabinets': 0.6,
      'new_kitchen': 0.6,
      'modern_kitchen': 0.6,
      'kitchen': 0.6,
      'kitchen1': 0.6,
      'kitchen2': 0.6,
      'kitchen_set': 0.6,
      'hallway': 0.6,
      'basic_kitchen': 0.6,
      'cabinet': 0.6,
      'kitchen_model_2': 0.6,
      'pigan': 0.6,
      'pobin': 0.6
    };
    
    return specialScales[modelType] || 0.6;
  },

  checkIfModelFitsInRoom: function(size, modelType) {
    const roomW = this.sceneManager.roomW;
    const roomH = this.sceneManager.roomH;
    const roomD = this.sceneManager.roomD;
    
    const roomHalfWidth = roomW / 2;
    const roomHalfDepth = roomD / 2;
    
    const fitsWidth = (size.x / 2) < roomHalfWidth;
    const fitsHeight = size.y <= roomH - 20;
    const fitsDepth = (size.z / 2) < roomHalfDepth;
    
    const result = fitsWidth && fitsHeight && fitsDepth;
    
    if (!result) {
      DebugHelper.warn(`Модель ${modelType} не помещается:`, {
        modelSize: size,
        modelHalfSize: { x: size.x / 2, z: size.z / 2 },
        roomHalfSize: { width: roomHalfWidth, depth: roomHalfDepth },
        fitsWidth: fitsWidth,
        fitsHeight: fitsHeight,
        fitsDepth: fitsDepth
      });
    }
    
    return result;
  },

  calculateAdditionalScaleForRoom: function(size, modelType) {
    const roomW = this.sceneManager.roomW;
    const roomD = this.sceneManager.roomD;
    
    const roomHalfWidth = roomW / 2;
    const roomHalfDepth = roomD / 2;
    
    const maxAllowedHalfWidth = roomHalfWidth * 0.9;
    const maxAllowedHalfDepth = roomHalfDepth * 0.9;
    
    const requiredScaleX = maxAllowedHalfWidth / (size.x / 2);
    const requiredScaleZ = maxAllowedHalfDepth / (size.z / 2);
    
    let scale = Math.min(requiredScaleX, requiredScaleZ);
    scale = Math.max(0.3, Math.min(1, scale));
    
    DebugHelper.log('Дополнительное масштабирование для ' + modelType + ':', {
      modelHalfSize: { x: size.x / 2, z: size.z / 2 },
      maxAllowedHalfWidth: maxAllowedHalfWidth,
      maxAllowedHalfDepth: maxAllowedHalfDepth,
      requiredScaleX: requiredScaleX,
      requiredScaleZ: requiredScaleZ,
      finalScale: scale
    });
    
    return scale;
  },

  emergencySizeCheck: function(size, modelType) {
    const roomW = this.sceneManager.roomW;
    const roomD = this.sceneManager.roomD;
    
    const roomHalfWidth = roomW / 2;
    const roomHalfDepth = roomD / 2;
    
    const modelHalfWidth = size.x / 2;
    const modelHalfDepth = size.z / 2;
    
    const needsReduction = modelHalfWidth > roomHalfWidth || modelHalfDepth > roomHalfDepth;
    let scale = 1;
    
    if (needsReduction) {
      const widthRatio = modelHalfWidth / roomHalfWidth;
      const depthRatio = modelHalfDepth / roomHalfDepth;
      scale = 1 / Math.max(widthRatio, depthRatio) * 0.9;
      
      DebugHelper.warn('ЭКСТРЕННОЕ УМЕНЬШЕНИЕ ' + modelType + ':', {
        modelHalfSize: { x: modelHalfWidth, z: modelHalfDepth },
        roomHalfSize: { width: roomHalfWidth, depth: roomHalfDepth },
        ratios: { width: widthRatio, depth: depthRatio },
        emergencyScale: scale
      });
    }
    
    return {
      needsReduction: needsReduction,
      scale: scale
    };
  },
calculateModelPosition: function(size, modelType) {
  const roomW = this.sceneManager.roomW;
  const roomD = this.sceneManager.roomD;
  
  const roomHalfWidth = roomW / 2;
  const roomHalfDepth = roomD / 2;
  
  const modelHalfWidth = size.x / 2;
  const modelHalfDepth = size.z / 2;
  
  // ФИКСИРОВАННЫЙ ЗАЗОР ОТ СТЕНЫ (5 единиц)
  const FIXED_WALL_GAP = 5;
  
  // Границы с учетом размера модели и фиксированного зазора
  const minX = -roomHalfWidth + modelHalfWidth + FIXED_WALL_GAP;
  const maxX = roomHalfWidth - modelHalfWidth - FIXED_WALL_GAP;
  const minZ = -roomHalfDepth + modelHalfDepth + FIXED_WALL_GAP;
  const maxZ = roomHalfDepth - modelHalfDepth - FIXED_WALL_GAP;
  
  DebugHelper.log('Размещение модели ' + modelType + ':', {
    modelSize: size,
    modelHalf: { x: modelHalfWidth, z: modelHalfDepth },
    bounds: { minX, maxX, minZ, maxZ },
    fixedGap: FIXED_WALL_GAP
  });
  
  // Если модель слишком большая
  if (minX > maxX || minZ > maxZ) {
    DebugHelper.warn('Модель ' + modelType + ' слишком большая, помещаем в центр');
    return { x: 0, z: 0 };
  }
  
  // Случайная позиция в доступной области
  const safeX = minX + Math.random() * (maxX - minX);
  const safeZ = minZ + Math.random() * (maxZ - minZ);
  
  return { x: safeX, z: safeZ };
},

  onProgress: function(xhr) {
    console.log((xhr.loaded / xhr.total * 100).toFixed(1) + '% загружено');
  },

  onError: function(error, modelType) {
    console.error('Ошибка загрузки модели:', error);
    alert('Ошибка загрузки модели: ' + modelType + '\nПроверьте консоль для подробностей.');
  }
};