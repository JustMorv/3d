const SceneManager = {
  container: null,
  scene: null,
  renderer: null,
  stats: null,
  objects: [],
  walls: [],
  boundaryLines: [], // Для отладки границ
  
  roomW: 450,
  roomD: 450,
  roomH: 270,
  floorLevel: 0,

  init: function(container) {
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe7e7e7);
    
    this.scene.add(new THREE.AmbientLight(0x777777));
    
    const light = new THREE.SpotLight(0xffffff, 1.3);
    light.position.set(0, 500, 800);
    this.scene.add(light);
    
    this.createFloor();
    this.createWalls();
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);
    
    this.stats = new Stats();
    // this.container.appendChild(this.stats.dom);
    
    return this.scene;
  },

  createFloor: function() {
    const textureLoader = new THREE.TextureLoader();
    const floorTexture = textureLoader.load('textures/floor.jpg');
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(this.roomW / 100, this.roomD / 100);
    
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomW, this.roomD),
      new THREE.MeshLambertMaterial({ 
        map: floorTexture,
        side: THREE.DoubleSide
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
  },

  createWalls: function() {
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('textures/wall.jpg');
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(4, 2);
    
    const wallMaterial = new THREE.MeshLambertMaterial({ 
      map: wallTexture
    });

    const wallBack = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomW, this.roomH),
      wallMaterial
    );
    wallBack.position.set(0, this.roomH / 2, -this.roomD / 2);
    wallBack.userData = {
      name: 'back',
      type: 'wall',
      normal: new THREE.Vector3(0, 0, 1),
      position: 'back'
    };
    this.scene.add(wallBack);
    this.walls.push(wallBack);

    const wallFront = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomW, this.roomH),
      wallMaterial
    );
    wallFront.position.set(0, this.roomH / 2, this.roomD / 2);
    wallFront.rotation.y = Math.PI;
    wallFront.userData = {
      name: 'front',
      type: 'wall',
      normal: new THREE.Vector3(0, 0, -1),
      position: 'front'
    };
    this.scene.add(wallFront);
    this.walls.push(wallFront);

    const wallLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomD, this.roomH),
      wallMaterial
    );
    wallLeft.position.set(-this.roomW / 2, this.roomH / 2, 0);
    wallLeft.rotation.y = Math.PI / 2;
    wallLeft.userData = {
      name: 'left',
      type: 'wall',
      normal: new THREE.Vector3(1, 0, 0),
      position: 'left'
    };
    this.scene.add(wallLeft);
    this.walls.push(wallLeft);

    const wallRight = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomD, this.roomH),
      wallMaterial
    );
    wallRight.position.set(this.roomW / 2, this.roomH / 2, 0);
    wallRight.rotation.y = -Math.PI / 2;
    wallRight.userData = {
      name: 'right',
      type: 'wall',
      normal: new THREE.Vector3(-1, 0, 0),
      position: 'right'
    };
    this.scene.add(wallRight);
    this.walls.push(wallRight);
  },

  // НОВЫЙ МЕТОД: показать границы комнаты для отладки
  showRoomBoundaries: function() {
    // Удаляем старые границы, если есть
    if (this.boundaryLines) {
      this.boundaryLines.forEach(line => {
        if (line.parent) this.scene.remove(line);
        if (line.geometry) line.geometry.dispose();
      });
    }
    this.boundaryLines = [];
    
    const roomHalfW = this.roomW / 2;
    const roomHalfD = this.roomD / 2;
    const roomHalfH = this.roomH / 2;
    
    // Цвета для разных зон
    const wallColor = 0xff3333;     // Красный - стены
    const safeColor = 0x33ff33;     // Зеленый - безопасная зона
    const offsetColor = 0xffaa33;   // Оранжевый - граница с отступом
    
    const wallOffset = 15; // Тот же offset что и в CollisionManager
    
    // 1. ГРАНИЦЫ СТЕН (куда нельзя заходить)
    const wallBoundaries = [
      // Левая стена (X = -roomHalfW)
      { from: [-roomHalfW, 0, -roomHalfD], to: [-roomHalfW, roomHalfH, roomHalfD], color: wallColor },
      // Правая стена (X = roomHalfW)
      { from: [roomHalfW, 0, -roomHalfD], to: [roomHalfW, roomHalfH, roomHalfD], color: wallColor },
      // Задняя стена (Z = -roomHalfD)
      { from: [-roomHalfW, 0, -roomHalfD], to: [roomHalfW, roomHalfH, -roomHalfD], color: wallColor },
      // Передняя стена (Z = roomHalfD)
      { from: [-roomHalfW, 0, roomHalfD], to: [roomHalfW, roomHalfH, roomHalfD], color: wallColor }
    ];
    
    wallBoundaries.forEach(wall => {
      const points = [
        new THREE.Vector3(wall.from[0], wall.from[1], wall.from[2]),
        new THREE.Vector3(wall.to[0], wall.to[1], wall.to[2])
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: wall.color, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.boundaryLines.push(line);
    });
    
    // 2. БЕЗОПАСНАЯ ГРАНИЦА (с учетом отступа)
    const safeMinX = -roomHalfW + wallOffset;
    const safeMaxX = roomHalfW - wallOffset;
    const safeMinZ = -roomHalfD + wallOffset;
    const safeMaxZ = roomHalfD - wallOffset;
    
    // Рисуем прямоугольник безопасной зоны на полу
    const safeRectPoints = [
      [safeMinX, 0.05, safeMinZ],
      [safeMaxX, 0.05, safeMinZ],
      [safeMaxX, 0.05, safeMaxZ],
      [safeMinX, 0.05, safeMaxZ],
      [safeMinX, 0.05, safeMinZ]
    ];
    
    for (let i = 0; i < safeRectPoints.length - 1; i++) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(safeRectPoints[i][0], safeRectPoints[i][1], safeRectPoints[i][2]),
        new THREE.Vector3(safeRectPoints[i+1][0], safeRectPoints[i+1][1], safeRectPoints[i+1][2])
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ color: safeColor, linewidth: 3 });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);
      this.boundaryLines.push(line);
    }
    
    // 3. ОТМЕТКИ С ОТСТУПАМИ
    const markPoints = [
      { x: -roomHalfW + wallOffset, z: 0, color: offsetColor },
      { x: -roomHalfW + wallOffset, z: roomHalfD / 2, color: offsetColor },
      { x: -roomHalfW + wallOffset, z: -roomHalfD / 2, color: offsetColor },
      { x: roomHalfW - wallOffset, z: 0, color: offsetColor },
      { x: roomHalfW - wallOffset, z: roomHalfD / 2, color: offsetColor },
      { x: roomHalfW - wallOffset, z: -roomHalfD / 2, color: offsetColor },
      { x: 0, z: roomHalfD - wallOffset, color: offsetColor },
      { x: roomHalfW / 2, z: roomHalfD - wallOffset, color: offsetColor },
      { x: -roomHalfW / 2, z: roomHalfD - wallOffset, color: offsetColor },
      { x: 0, z: -roomHalfD + wallOffset, color: offsetColor },
      { x: roomHalfW / 2, z: -roomHalfD + wallOffset, color: offsetColor },
      { x: -roomHalfW / 2, z: -roomHalfD + wallOffset, color: offsetColor }
    ];
    
    markPoints.forEach(mark => {
      const sphereGeo = new THREE.SphereGeometry(4, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({ color: mark.color, emissive: mark.color, emissiveIntensity: 0.3 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(mark.x, 0.1, mark.z);
      this.scene.add(sphere);
      this.boundaryLines.push(sphere);
    });
    
    // 4. ПОЛУПРОЗРАЧНАЯ ЗОНА ОТСТУПА
    const marginZoneMat = new THREE.MeshPhongMaterial({ color: 0xff6666, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    
    const leftMarginZone = new THREE.Mesh(
      new THREE.PlaneGeometry(wallOffset, this.roomD),
      marginZoneMat
    );
    leftMarginZone.rotation.x = -Math.PI / 2;
    leftMarginZone.position.set(-roomHalfW + wallOffset/2, 0.02, 0);
    this.scene.add(leftMarginZone);
    this.boundaryLines.push(leftMarginZone);
    
    const rightMarginZone = new THREE.Mesh(
      new THREE.PlaneGeometry(wallOffset, this.roomD),
      marginZoneMat
    );
    rightMarginZone.rotation.x = -Math.PI / 2;
    rightMarginZone.position.set(roomHalfW - wallOffset/2, 0.02, 0);
    this.scene.add(rightMarginZone);
    this.boundaryLines.push(rightMarginZone);
    
    const frontMarginZone = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomW, wallOffset),
      marginZoneMat
    );
    frontMarginZone.rotation.x = -Math.PI / 2;
    frontMarginZone.position.set(0, 0.02, roomHalfD - wallOffset/2);
    this.scene.add(frontMarginZone);
    this.boundaryLines.push(frontMarginZone);
    
    const backMarginZone = new THREE.Mesh(
      new THREE.PlaneGeometry(this.roomW, wallOffset),
      marginZoneMat
    );
    backMarginZone.rotation.x = -Math.PI / 2;
    backMarginZone.position.set(0, 0.02, -roomHalfD + wallOffset/2);
    this.scene.add(backMarginZone);
    this.boundaryLines.push(backMarginZone);
    
    DebugHelper.log('Границы комнаты отображены:', {
      roomSize: { w: this.roomW, d: this.roomD },
      safeArea: { minX: safeMinX, maxX: safeMaxX, minZ: safeMinZ, maxZ: safeMaxZ },
      wallOffset: wallOffset
    });
    
    return this.boundaryLines;
  },
  
  hideRoomBoundaries: function() {
    if (this.boundaryLines) {
      this.boundaryLines.forEach(line => {
        if (line.parent) this.scene.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
      });
      this.boundaryLines = [];
      DebugHelper.log('Границы комнаты скрыты');
    }
  },

  addObject: function(object) {
    this.scene.add(object);
    this.objects.push(object);
  },

  removeObject: function(object) {
    this.scene.remove(object);
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  },

  clearAllObjects: function() {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      this.scene.remove(this.objects[i]);
    }
    this.objects = [];
  },

  getObjectByUUID: function(uuid) {
    return this.objects.find(obj => obj.uuid === uuid);
  },

  render: function(camera) {
    this.renderer.render(this.scene, camera);
  },

  update: function() {
    this.stats.update();
  },

  onWindowResize: function(camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
};