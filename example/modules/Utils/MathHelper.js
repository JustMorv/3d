const MathHelper = {
  createVector: function(x, y, z) {
    return new THREE.Vector3(x, y, z);
  },

  distance: function(v1, v2) {
    return v1.distanceTo(v2);
  },

  normalize: function(vector) {
    return vector.clone().normalize();
  },

  spheresIntersect: function(center1, radius1, center2, radius2) {
    const distance = this.distance(center1, center2);
    return distance < (radius1 + radius2);
  },

  randomInRange: function(min, max) {
    return min + Math.random() * (max - min);
  },

  degreesToRadians: function(degrees) {
    return degrees * (Math.PI / 180);
  },

  radiansToDegrees: function(radians) {
    return radians * (180 / Math.PI);
  },

  clamp: function(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
};