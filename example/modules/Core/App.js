const App = {
  sceneManager: SceneManager,
  cameraController: CameraController,
  uiManager: UIManager,
  modelLoader: null,
  modelManager: null,
  collisionManager: null,
  dragManager: null,
  selectionManager: null,
  rotationManager: null,
  wallManager: null,

  init: function() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    this.sceneManager.init(container);
    this.cameraController.init(container, this.sceneManager.scene);
    this.uiManager.init();
    
    this.modelLoader = ModelLoader;
    this.modelLoader.init(this.sceneManager);
    
    this.modelManager = ModelManager;
    this.modelManager.init(this.sceneManager);
    
    this.collisionManager = CollisionManager;
    this.collisionManager.init(this.sceneManager);
    
    this.wallManager = WallManager;
    this.wallManager.init(this.sceneManager);
    
    this.dragManager = DragManager;
    this.dragManager.init(
      this.sceneManager,
      this.cameraController,
      this.collisionManager,
      this.wallManager,
      this.selectionManager
    );
    
    this.selectionManager = SelectionManager;
    this.selectionManager.init(
      this.sceneManager,
      this.uiManager,
      this.modelManager,
      this.collisionManager,
      this.dragManager
    );
    
    this.rotationManager = RotationManager;
    this.rotationManager.init(this.sceneManager, this.selectionManager);
    
    this.dragManager.setSelectionManager(this.selectionManager);
    
    ContextMenu.init(this.selectionManager, this.rotationManager);
    
    this.setupEventListeners();
    this.animate();
    
    window.app = this;
  },

  setupEventListeners: function() {
    window.addEventListener('resize', () => {
      this.sceneManager.onWindowResize(this.cameraController.camera);
      this.cameraController.onWindowResize();
      EventManager.emit('window-resize');
    });
    
    EventManager.on('window-resize', () => {
      if (this.selectionManager.selectedObject) {
        this.selectionManager.updateGearIconPosition();
        if (this.rotationManager.isRotationMode) {
          this.rotationManager.updateRotationCirclePosition();
        }
      }
    });
    
    EventManager.on('escape-pressed', () => {
      this.selectionManager.disableWidthMode();
      ContextMenu.hide();
    });
  },

  animate: function() {
    requestAnimationFrame(() => this.animate());
    this.cameraController.update();
    this.sceneManager.render(this.cameraController.camera);
    this.sceneManager.update();
  }
};