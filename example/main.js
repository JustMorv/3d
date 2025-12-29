document.addEventListener('DOMContentLoaded', function() {
  App.init();
  
  setTimeout(() => {
    if (window.app && window.app.uiManager) {
      window.app.uiManager.toggleAccordion('models-accordion');
    }
  }, 100);
});