const $ = require('jquery');

export function preventRightClickOnImages() {
  $(document).on('contextmenu', 'img', (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    return false;
  });
  $(document).on('dragstart mousedown', 'img', (evt) => {
    evt.preventDefault();
    return false;
  });
}

export function isMobilePlatform() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
