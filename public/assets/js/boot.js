(function () {
  var root = document.documentElement;
  if (!root) { return; }

  try {
    var hash = window.location.hash || '';
    var path = window.location.pathname || '/';
    var hasIdentityToken = /(^|[?#&])(invite_token|confirmation_token|recovery_token|email_change_token)=/i.test(hash);

    if (hasIdentityToken && !/^\/sawlper(?:\/|$)/i.test(path)) {
      window.location.replace('/sawlper/' + (window.location.search || '') + hash);
      return;
    }
  } catch (e) {}

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
