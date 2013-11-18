playList = function(args) {
  this.current = 0;
}

playList.prototype = Array.prototype;

// Need that to display
playList.prototype.asHtmlList = function() {
  var out = '<ul class="playlist">';
  for (var i = 0; i < this.length; i ++) {
    out += '<li>' + (this.current == i ? '&gt; ' : '  ') + this[i] + '</li>';
  };
  out += '</ul>'
  return out;
}

// Proper pl management: getNext and getCurrent
playList.prototype.getNext = function() {
  this.current += 1;
  if (this.current >= this.length)
    this.current = 0;
  console.log("GetNext su %o ha indice a %i", this, this.current);
  return this.getCurrent();
}

playList.prototype.getCurrent = function() {
  return this[this.current];
}
