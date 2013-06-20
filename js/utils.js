function $(q) {
  return document.querySelector(q);
}

function show(q) {
  $(q).classList.remove('hide');
}

function hide(q) {
  $(q).classList.add('hide');
}

function validFileName(path) {
  if (!path.length) {
    error('Empty name was given.');
    return false;
  }
  if (path.indexOf('/') >= 0) {
    error('File name should not contain any slash (/): "' + path + '"');
    return false;
  }
  return true;
}

function log(msg) {
  $('#log').innerHTML = msg;
  console.log(msg, arguments);
}

function createElement(name, attributes) {
  var elem = document.createElement(name);
  for (var key in attributes) {
    if (key == 'id')
      elem.id = attributes[key];
    else if (key == 'innerText')
      elem.innerText = attributes[key];
    else
      elem.setAttribute(key, attributes[key]);
  }
  return elem;
}

function info(msg) {
  console.log('INFO: ', arguments);
  var e = document.getElementById('info');
  e.innerText = msg;
  e.classList.remove('hide');
  window.setTimeout(function() { e.innerHTML = ''; }, 5000);
}

function error(msg) {
  console.log('ERROR: ', arguments);
  var message = '';
  for (var i = 0; i < arguments.length; i++) {
    var description = '';
    if (arguments[i] instanceof FileError) {
      switch (arguments[i].code) {
        case FileError.QUOTA_EXCEEDED_ERR:
          description = 'QUOTA_EXCEEDED_ERR';
          break;
        case FileError.NOT_FOUND_ERR:
          description = 'NOT_FOUND_ERR';
          break;
        case FileError.SECURITY_ERR:
          description = 'SECURITY_ERR';
          break;
        case FileError.INVALID_MODIFICATION_ERR:
          description = 'INVALID_MODIFICATION_ERR';
          break;
        case FileError.INVALID_STATE_ERR:
          description = 'INVALID_STATE_ERR';
          break;
        default:
          description = 'Unknown Error';
          break;
      }
      message += ': ' + description;
    } else if (arguments[i].fullPath) {
      message += arguments[i].fullPath + ' ';
    } else {
      message += arguments[i] + ' ';
    }
  }
  message += "At:" + this.caller;
  var e = $('#error');
  e.innerText = 'ERROR:' + message;
  e.classList.remove('hide');
  console.log('ERROR: ' + message);
  window.setTimeout(function() { e.innerHTML = ''; }, 5000);
}

function simulatedClick(target, options) {
  var event = target.ownerDocument.createEvent('MouseEvents'),
      options = options || {};
  //Set your default options to the right of ||
  var opts = {
    type: options.type                  || 'click',
    canBubble:options.canBubble             || true,
    cancelable:options.cancelable           || true,
    view:options.view                       || target.ownerDocument.defaultView,
    detail:options.detail                   || 1,
    screenX:options.screenX                 || 0, //The coordinates within the entire page
    screenY:options.screenY                 || 0,
    clientX:options.clientX                 || 0, //The coordinates within the viewport
    clientY:options.clientY                 || 0,
    ctrlKey:options.ctrlKey                 || false,
    altKey:options.altKey                   || false,
    shiftKey:options.shiftKey               || false,
    metaKey:options.metaKey                 || false, //I *think* 'meta' is 'Cmd/Apple' on Mac, and 'Windows key' on Win. Not sure, though!
    button:options.button                   || 0, //0 = left, 1 = middle, 2 = right
    relatedTarget:options.relatedTarget     || null,
  };

  //Pass in the options
  event.initMouseEvent(
    opts.type,
    opts.canBubble,
    opts.cancelable,
    opts.view,
    opts.detail,
    opts.screenX,
    opts.screenY,
    opts.clientX,
    opts.clientY,
    opts.ctrlKey,
    opts.altKey,
    opts.shiftKey,
    opts.metaKey,
    opts.button,
    opts.relatedTarget
  );

  //Fire the event
  target.dispatchEvent(event);
}
