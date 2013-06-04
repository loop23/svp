function playList() {

  this.circulate = function() {
    var tmp = this.shift();
    if (tmp)
      this.push(tmp);
    return tmp;
  };
}

playList.prototype = Array.prototype;
