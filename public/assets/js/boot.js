(function () {
  var root = document.documentElement;
  if (!root) { return; }

  root.classList.add('js');

  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('reduce-motion');
    }
  } catch (e) {}

  try {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && connection.saveData) {
      root.classList.add('save-data');
    }
  } catch (e) {}

  try {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      root.classList.add('coarse-pointer');
    }
  } catch (e) {}

  try {
    var memory = navigator.deviceMemory;
    var cores = navigator.hardwareConcurrency;
    if ((typeof memory === 'number' && memory <= 4) || (typeof cores === 'number' && cores <= 4)) {
      root.classList.add('low-power');
    }
  } catch (e) {}
})();