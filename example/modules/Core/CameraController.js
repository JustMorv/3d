const CameraController = {
  camera: null,
  controls: null,
  
  // Предустановленные виды
  views: {
    front: { position: new THREE.Vector3(0, 150, 500), target: new THREE.Vector3(0, 150, 0) },
    back: { position: new THREE.Vector3(0, 150, -500), target: new THREE.Vector3(0, 150, 0) },
    left: { position: new THREE.Vector3(-500, 150, 0), target: new THREE.Vector3(0, 150, 0) },
    right: { position: new THREE.Vector3(500, 150, 0), target: new THREE.Vector3(0, 150, 0) },
    top: { position: new THREE.Vector3(0, 500, 0), target: new THREE.Vector3(0, 150, 0) },
    perspective: { position: new THREE.Vector3(400, 300, 500), target: new THREE.Vector3(0, 150, 0) }
  },

  init: function(container, scene) {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      1,
      5000
    );
    this.camera.position.set(400, 300, 500);
    
    this.controls = new THREE.OrbitControls(this.camera, container);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.25;
    this.controls.zoomSpeed = 0.5;
    this.controls.panSpeed = 0.5;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 2000;
    
    return this.camera;
  },

  update: function() {
    if (this.controls.enabled) {
      this.controls.update();
    }
  },

  enable: function() {
    this.controls.enabled = true;
  },

  disable: function() {
    this.controls.enabled = false;
  },

  setPosition: function(x, y, z) {
    this.camera.position.set(x, y, z);
  },

  lookAt: function(x, y, z) {
    this.camera.lookAt(x, y, z);
    if (this.controls.target) {
      this.controls.target.set(x, y, z);
    }
  },

  onWindowResize: function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  },
  
  // Новые методы для управления видами
  setView: function(viewName) {
    const view = this.views[viewName];
    if (view) {
      // Анимируем переход
      this.animateCameraTo(view.position, view.target);
    }
  },
  
  animateCameraTo: function(targetPosition, targetLookAt, duration = 500) {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Используем easing для плавности
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Интерполируем позицию
      const newX = startPosition.x + (targetPosition.x - startPosition.x) * easeProgress;
      const newY = startPosition.y + (targetPosition.y - startPosition.y) * easeProgress;
      const newZ = startPosition.z + (targetPosition.z - startPosition.z) * easeProgress;
      this.camera.position.set(newX, newY, newZ);
      
      // Интерполируем точку обзора
      const targetX = startTarget.x + (targetLookAt.x - startTarget.x) * easeProgress;
      const targetY = startTarget.y + (targetLookAt.y - startTarget.y) * easeProgress;
      const targetZ = startTarget.z + (targetLookAt.z - startTarget.z) * easeProgress;
      this.controls.target.set(targetX, targetY, targetZ);
      
      this.controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  // Быстрые виды без анимации
  setViewInstant: function(viewName) {
    const view = this.views[viewName];
    if (view) {
      this.camera.position.copy(view.position);
      this.controls.target.copy(view.target);
      this.controls.update();
    }
  },
  
  // Сброс вида
  resetView: function() {
    this.setView('perspective');
  },
  
  // Повернуть камеру на 90 градусов влево
  rotateLeft: function() {
    const currentPos = this.camera.position.clone();
    const center = this.controls.target.clone();
    const radius = currentPos.distanceTo(center);
    
    // Вычисляем новый угол
    let angle = Math.atan2(currentPos.z - center.z, currentPos.x - center.x);
    angle += Math.PI / 2; // +90 градусов
    
    const newX = center.x + radius * Math.cos(angle);
    const newZ = center.z + radius * Math.sin(angle);
    
    this.animateCameraTo(new THREE.Vector3(newX, currentPos.y, newZ), center);
  },
  
  // Повернуть камеру на 90 градусов вправо
  rotateRight: function() {
    const currentPos = this.camera.position.clone();
    const center = this.controls.target.clone();
    const radius = currentPos.distanceTo(center);
    
    let angle = Math.atan2(currentPos.z - center.z, currentPos.x - center.x);
    angle -= Math.PI / 2; // -90 градусов
    
    const newX = center.x + radius * Math.cos(angle);
    const newZ = center.z + radius * Math.sin(angle);
    
    this.animateCameraTo(new THREE.Vector3(newX, currentPos.y, newZ), center);
  }
};