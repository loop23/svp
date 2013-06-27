function $(q) {
  return document.querySelector(q);
}

function show(q) {
  $(q).classList.remove('hide');
}

function hide(q) {
  $(q).classList.add('hide');
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
  var e = $('#error');
  e.innerText = 'ERROR:' + message;
  e.classList.remove('hide');
  console.log('ERROR: ' + message);
  window.setTimeout(function() { e.innerHTML = ''; }, 5000);
}

function simulatedClick(target, op) {
  var event = target.ownerDocument.createEvent('MouseEvents'),
      options = op || {};
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
    relatedTarget:options.relatedTarget     || null
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


MediaError.prototype.toString = function mets() {
    var msg = '';
    switch (this.code) {
	case MediaError.MEDIA_ERR_ABORTED:
	  msg = 'Aborted';
	  break;
	case MediaError.MEDIA_ERR_DECODE:
	  msg = 'Decode';
	  break;
	case MediaError.MEDIA_ERR_ENCRYPTED:
	  msg = 'Encrypted';
	  break;
	case MediaError.MEDIA_ERR_NETWORK:
	  msg = 'Network';
	  break;
	case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
  	  msg = "Source not supported (media type?)";
	  break;
	default:
	  msg = "Other error:" + this.code;
    }
    return "MediaError: " + msg;
};

FileError.prototype.toString = function() {
  var msg = '';
  switch (this.code) {
    case 9:
      msg = 'Modifica non valida';
      break;
  }
  return "FileError: " + msg;
};

// Just like ruby delete
Array.prototype.delete = function(item) {
  var pos = this.indexOf(item);
  if (pos > -1)
    return this.splice(pos, 1)[0];
  else
    return null;
};

// Just like ruby include?
Array.prototype.include = function(item) {
    if (this.indexOf(item) >= 0)
	return true;
    else
	return false;
};

// Useful and okish array difference.
// Returns a new array with all elements of a2 removed from self
Array.prototype.difference = function(a2) {
  var tmp = this.slice(0);
  for (var i=0;i<a2.length;i++) {
    var v = a2[i];
    tmp.delete(v);
  }
  return tmp;
};