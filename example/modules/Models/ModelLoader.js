// example\modules\Models\ModelLoader.js
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
    'basic_kitchen': 'basic_kitchen_cabinets_and_counter.glb',
    'cabinet': 'cabinet.glb',
    'hallway': 'Hallway7.glb',
    'kitchen': 'kitchen.glb',
    'kitchen1': 'kitchen1.glb',
    'kitchen2': 'Kitchen2.glb',
    'kitchen_cabinets': 'kitchen_cabinets.glb',
    'kitchen_set': 'kitchen_design_set_v.001.glb',
    'kitchen_model_2': 'kitchen_model_2.glb',
    'modern_kitchen': 'modern_kitchen.glb',
    'living_room': 'LivingRoom.glb',
    'new_kitchen': 'newchiken.glb',
    'pigan': 'pigan.glb',
    'pobin': 'pobinByLing.glb'
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

    const modelPath = '../models/kitchen/' + this.modelMap[modelType];
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
    modelGroup.add(model);

    // ЦЕНТРИРОВАНИЕ МОДЕЛИ ПЕРЕД РАСЧЕТАМИ
    const originalBox = new THREE.Box3().setFromObject(modelGroup);
    const center = new THREE.Vector3();
    originalBox.getCenter(center);
    
    // Центрируем модель относительно ее собственного центра
    modelGroup.position.sub(center);
    
    // Пересчитываем bounding box после центрирования
    const centeredBox = new THREE.Box3().setFromObject(modelGroup);
    const originalSize = centeredBox.getSize(new THREE.Vector3());
    const originalMinY = centeredBox.min.y;

    DebugHelper.log('=== ЗАГРУЗКА МОДЕЛИ: ' + modelType + ' ===');
    DebugHelper.log('Оригинальный размер после центрирования:', originalSize);
    DebugHelper.log('Центр модели после центрирования:', center);

    // ВЫЧИСЛЯЕМ МАСШТАБ С УЧЕТОМ РАЗМЕРА КОМНАТЫ
    const scale = this.calculateModelScaleWithRoomCheck(originalSize, modelType);
    modelGroup.scale.setScalar(scale);

    let box = new THREE.Box3().setFromObject(modelGroup);
    let size = box.getSize(new THREE.Vector3());
    const minY = box.min.y;

    DebugHelper.log('Размер после масштабирования:', size);
    DebugHelper.log('Размер комнаты:', {
      width: this.sceneManager.roomW,
      height: this.sceneManager.roomH,
      depth: this.sceneManager.roomD
    });

    // ПРОВЕРЯЕМ, ПОМЕЩАЕТСЯ ЛИ МОДЕЛЬ В КОМНАТУ
    const fitsInRoom = this.checkIfModelFitsInRoom(size, modelType);
    
    if (!fitsInRoom) {
      DebugHelper.warn('Модель не помещается в комнату, уменьшаем дополнительно');
      const additionalScale = this.calculateAdditionalScaleForRoom(size, modelType);
      modelGroup.scale.multiplyScalar(additionalScale);
      
      // Пересчитываем после дополнительного масштабирования
      box = new THREE.Box3().setFromObject(modelGroup);
      size = box.getSize(new THREE.Vector3());
      DebugHelper.log('Дополнительное уменьшение. Новый размер:', size);
    }

    // ЭКСТРЕННАЯ ПРОВЕРКА: ЕСЛИ МОДЕЛЬ ВСЕ ЕЩЕ СЛИШКОМ БОЛЬШАЯ
    const emergencyCheck = this.emergencySizeCheck(size, modelType);
    if (emergencyCheck.needsReduction) {
      DebugHelper.warn('Экстренное уменьшение модели!', {
        model: modelType,
        currentSize: size,
        requiredScale: emergencyCheck.scale
      });
      modelGroup.scale.multiplyScalar(emergencyCheck.scale);
      box = new THREE.Box3().setFromObject(modelGroup);
      size = box.getSize(new THREE.Vector3());
    }

    // Пересчитываем после всех масштабирований
    const finalBox = new THREE.Box3().setFromObject(modelGroup);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const finalMinY = finalBox.min.y;

    // РАСЧЕТ ПОЗИЦИИ С УЧЕТОМ РАЗМЕРА МОДЕЛИ
    const position = this.calculateModelPosition(finalSize, modelType);
    const baseYPosition = -finalMinY;
    
    modelGroup.position.set(
      position.x,
      baseYPosition,
      position.z
    );

    // Финальная проверка позиции
    finalBox.setFromObject(modelGroup);
    if (Math.abs(finalBox.min.y) > 0.1) {
      modelGroup.position.y += -finalBox.min.y;
      DebugHelper.log('Дополнительная коррекция высоты:', -finalBox.minY);
    }

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

    // Сохраняем данные модели
    const halfSize = {
      x: finalSize.x / 2,
      y: finalSize.y / 2,
      z: finalSize.z / 2
    };

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
      baseY: finalBox.min.y,
      scaleInfo: {
        originalWidth: originalSize.x,
        targetWidth: this.getTargetWidth(modelType),
        originalHeight: originalSize.y,
        appliedScale: modelGroup.scale.x
      }
    };

    // Добавляем в сцену
    this.sceneManager.addObject(modelGroup);
    
    // Обновляем коллайдеры
    if (window.app && window.app.collisionManager) {
      window.app.collisionManager.updateObjectHalfSize(modelGroup);
    }

    // Проверяем столкновения
    if (window.app && window.app.collisionManager) {
      window.app.collisionManager.checkInitialCollisions(modelGroup);
    }

    DebugHelper.log('Модель загружена:', modelType);
    DebugHelper.log('Финальный размер модели:', finalSize);
    DebugHelper.log('Финальная позиция:', modelGroup.position);
    DebugHelper.log('Помещается в комнату?', this.checkIfModelFitsInRoom(finalSize, modelType));
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
    // ОСОБЫЕ РАЗМЕРЫ ДЛЯ БОЛЬШИХ МОДЕЛЕЙ
    const specialSizes = {
      'kitchen_cabinets': 280,     // Кухонные шкафы - уменьшаем сильно
      'new_kitchen': 180,          // Новая кухня - уменьшаем сильно
      'modern_kitchen': 180,       // Современная кухня
      'kitchen': 400,              // Общая кухня
      'kitchen1': 400,             // Кухня 1
      'kitchen2': 200,             // Кухня 2
      'kitchen_cabinets2': 380,    // Кухонные шкафы 2
      'kitchen_set': 150,          // Набор кухни
      'living_room': 120,          // Гостиная
      'hallway': 160,              // Коридор
      'basic_kitchen': 400,        // Базовая кухня
      'cabinet': 320,              // Шкаф
      'kitchen_model_2': 480,      // Кухонная модель 2
      'pigan': 150,                // Пиган кухня
      'pobin': 150                 // Побин кухня
    };
    
    return specialSizes[modelType] || 200; // По умолчанию 200
  },

  getHeightScale: function(modelType) {
    // ОСОБЫЕ МАСШТАБЫ ВЫСОТЫ
    const specialScales = {
      'living_room': 0.5,          // Гостиная - меньше
      'kitchen_cabinets': 0.6,     // Кухонные шкафы
      'new_kitchen': 0.6,          // Новая кухня
      'modern_kitchen': 0.6,       // Современная кухня
      'kitchen': 0.65,             // Общая кухня
      'kitchen1': 0.65,            // Кухня 1
      'kitchen2': 0.65,            // Кухня 2
      'kitchen_set': 0.55,         // Набор кухни
      'hallway': 0.7,              // Коридор
      'basic_kitchen': 0.7,        // Базовая кухня
      'cabinet': 0.8,              // Шкаф
      'kitchen_model_2': 0.65,     // Кухонная модель 2
      'pigan': 0.7,                // Пиган кухня
      'pobin': 0.7                 // Побин кухня
    };
    
    return specialScales[modelType] || 0.7; // По умолчанию 0.7
  },

  checkIfModelFitsInRoom: function(size, modelType) {
    const roomW = this.sceneManager.roomW;
    const roomH = this.sceneManager.roomH;
    const roomD = this.sceneManager.roomD;
    
    // БЕЗОПАСНЫЕ ГРАНИЦЫ - половина размера комнаты
    const roomHalfWidth = roomW / 2;
    const roomHalfDepth = roomD / 2;
    
    // Модель помещается если ее половина размера меньше половины комнаты
    const fitsWidth = (size.x / 2) < roomHalfWidth;
    const fitsHeight = size.y <= roomH - 20; // Запас от потолка
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
    
    // РАСЧЕТ ДЛЯ ПОМЕЩЕНИЯ В КОМНАТУ - модель должна быть меньше комнаты
    const roomHalfWidth = roomW / 2;
    const roomHalfDepth = roomD / 2;
    
    // Модель поместится если ее половина размера < половины комнаты
    const maxAllowedHalfWidth = roomHalfWidth * 0.9; // 10% запас
    const maxAllowedHalfDepth = roomHalfDepth * 0.9;
    
    const requiredScaleX = maxAllowedHalfWidth / (size.x / 2);
    const requiredScaleZ = maxAllowedHalfDepth / (size.z / 2);
    
    // Берем минимальный масштаб
    let scale = Math.min(requiredScaleX, requiredScaleZ);
    
    // Ограничиваем максимальное уменьшение
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
    
    // ЭКСТРЕННЫЕ ПРОВЕРКИ - модель не должна быть больше комнаты
    const roomHalfWidth = roomW / 2;
    const roomHalfDepth = roomD / 2;
    
    const modelHalfWidth = size.x / 2;
    const modelHalfDepth = size.z / 2;
    
    const needsReduction = modelHalfWidth > roomHalfWidth || modelHalfDepth > roomHalfDepth;
    let scale = 1;
    
    if (needsReduction) {
      const widthRatio = modelHalfWidth / roomHalfWidth;
      const depthRatio = modelHalfDepth / roomHalfDepth;
      scale = 1 / Math.max(widthRatio, depthRatio) * 0.9; // Уменьшаем на 10% от предела
      
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
    
    // ИСПРАВЛЕННЫЙ РАСЧЕТ ГРАНИЦ КОМНАТЫ
    const roomHalfWidth = roomW / 2;
    const roomHalfDepth = roomD / 2;
    
    const modelHalfWidth = size.x / 2;
    const modelHalfDepth = size.z / 2;
    
    // Доступное пространство: половина комнаты минус половина модели
    const maxX = roomHalfWidth - modelHalfWidth;
    const minX = -roomHalfWidth + modelHalfWidth;
    const maxZ = roomHalfDepth - modelHalfDepth;
    const minZ = -roomHalfDepth + modelHalfDepth;
    
    DebugHelper.log('Доступное пространство для ' + modelType + ':', {
      modelSize: size,
      modelHalfSize: { x: modelHalfWidth, z: modelHalfDepth },
      roomHalfSize: { width: roomHalfWidth, depth: roomHalfDepth },
      minX: minX,
      maxX: maxX,
      minZ: minZ,
      maxZ: maxZ,
      availableWidth: maxX - minX,
      availableDepth: maxZ - minZ
    });
    
    // Если модель слишком большая для комнаты
    if (minX > maxX || minZ > maxZ) {
      DebugHelper.warn('Модель ' + modelType + ' слишком большая для комнаты, помещаем в центр');
      return { x: 0, z: 0 };
    }
    
    // Размещаем случайно в доступной области
    const safeX = minX + Math.random() * (maxX - minX);
    const safeZ = minZ + Math.random() * (maxZ - minZ);
    
    // Ограничиваем точными границами
    const finalX = Math.max(minX, Math.min(maxX, safeX));
    const finalZ = Math.max(minZ, Math.min(maxZ, safeZ));
    
    return { 
      x: finalX,
      z: finalZ
    };
  },

  onProgress: function(xhr) {
    console.log((xhr.loaded / xhr.total * 100).toFixed(1) + '% загружено');
  },

  onError: function(error, modelType) {
    console.error('Ошибка загрузки модели:', error);
    alert('Ошибка загрузки модели: ' + modelType + '\nПроверьте консоль для подробностей.');
  }
};