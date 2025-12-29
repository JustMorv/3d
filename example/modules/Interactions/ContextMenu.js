const ContextMenu = {
  contextMenu: null,

  init: function(selectionManager, rotationManager) {
    this.contextMenu = document.getElementById('context-menu');
    this.bindEvents();
  },

  bindEvents: function() {
    document.addEventListener('click', (e) => {
      if (this.contextMenu && this.contextMenu.style.display === 'block' && 
          !this.contextMenu.contains(e.target) && 
          (!window.app.selectionManager.gearIcon || !window.app.selectionManager.gearIcon.contains(e.target))) {
        this.hide();
      }
    });
  },

  show: function(x, y) {
    if (this.contextMenu) {
      this.contextMenu.style.display = 'block';
      this.contextMenu.style.left = x + 'px';
      this.contextMenu.style.top = y + 'px';
    }
  },

  hide: function() {
    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }
    
    if (window.app.selectionManager.isWidthMode) {
      window.app.selectionManager.disableWidthMode();
    }
  }
};