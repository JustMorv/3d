const UIManager = {
  init: function() {
    this.initAccordions();
    this.bindEvents();
  },

  initAccordions: function() {
    setTimeout(() => {
      this.toggleAccordion('models-accordion');
    }, 100);
  },

  toggleAccordion: function(id) {
    const content = document.getElementById(id);
    const title = content.previousElementSibling;
    
    if (content && title) {
      content.classList.toggle('expanded');
      title.classList.toggle('expanded');
    }
  },

  bindEvents: function() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        EventManager.emit('escape-pressed');
      }
    });
  },

  updateCollisionStatus: function(enabled) {
    const statusText = enabled ? 'ВКЛ' : 'ВЫКЛ';
    const statusElement = document.getElementById('collision-status');
    if (statusElement) {
      statusElement.textContent = 'Точные столкновения: ' + statusText;
    }
  },

  showNotification: function(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = message;
    
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '8px';
    notification.style.background = type === 'error' ? '#ff4444' : 
                                  type === 'warning' ? '#ffaa00' : 
                                  type === 'success' ? '#44cc44' : 
                                  '#4a6ee0';
    notification.style.color = 'white';
    notification.style.zIndex = '3000';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
    notification.style.fontSize = '14px';
    notification.style.fontWeight = '500';
    notification.style.maxWidth = '400px';
    notification.style.wordWrap = 'break-word';
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
    
    // Кнопка закрытия
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '10px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.opacity = '0.8';
    
    closeBtn.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
    
    notification.appendChild(closeBtn);
  }
};