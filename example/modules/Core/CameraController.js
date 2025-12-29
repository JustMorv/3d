const CameraController = {
  camera: null,
  controls: null,

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
  },

  onWindowResize: function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
};