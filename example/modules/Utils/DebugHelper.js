const DebugHelper = {
  collisionChecks: 0,

  log: function(message, data) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  },

  warn: function(message, data) {
    if (data) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  },

  error: function(message, error) {
    console.error(message, error);
  },

  incrementCollisionChecks: function() {
    this.collisionChecks++;
  },

  resetCollisionChecks: function() {
    this.collisionChecks = 0;
  },

  printCollisionStats: function() {
    console.log('Проверок столкновений:', this.collisionChecks);
  }
};