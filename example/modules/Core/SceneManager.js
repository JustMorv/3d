const SceneManager = {
  container: null,
  scene: null,
  renderer: null,
  stats: null,
  objects: [],
  walls: [],
  
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