var context = new (window.AudioContext || window.webkitAudioContext)();
function onError(message) {
  alert(message);
}

function loadSound(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function () {
    context.decodeAudioData(xhr.response, function (buffer) {
      callback(url, buffer);
    }, function (error) {
      onError('Failed to load ' + url + ': ' + error);
    });
  };
  xhr.send(null);
}

function loadSounds(urls, callback) {
  var loaded = 0;
  var len = urls.length;
  var buffers = [];
  for (var i = 0; i < len; i++) {
    (function (i) {
      loadSound(urls[i], function (url, buffer) {
        loaded++;
        buffers[i] = buffer;
        buffer.url = url;
        if (loaded === len) {
          callback(buffers);
        }
      });
    })(i);
  }
}

function createSource(buffer) {
  var source = context.createBufferSource();
  // Create a gain node.
  var gainNode = context.createGainNode();
  source.buffer = buffer;
  // Turn on looping.
  source.loop = false;
  // Connect source to gain.
  source.connect(gainNode);
  // Connect gain to destination.
  gainNode.connect(context.destination);

  return {
    source: source,
    gainNode: gainNode
  };
}

function playSound(buffer, time, gain) {
  var source = createSource(buffer);
  source.gainNode.gain.value = gain;
  source.source.noteOn(context.currentTime + time);
}

function Registry(type) {
  this.type = type;
}
Registry.prototype = [];
Registry.prototype.create = function () {
  var obj = this.type.create.apply(this.type, arguments);
  if (obj) {
    this.push(obj);
  }
  return obj;
};
Registry.prototype.draw = function (ctx) {
  for (var i = 0, l = this.length; i < l; i++) {
    this[i].draw(ctx);
  }
};
Registry.prototype.update = function (dt) {
  for (var i = 0, j = 0, l = this.length; i < l; i++) {
    if (this[i].update(dt) !== false) {
      this[j++] = this[i];
    }
  }
  this.length = j;
};


function Reflector(buffer, radius, shift) {
  this.deleted = false;
  this.buffer = buffer;
  this.radius = radius;
  this.shift = shift;
  this.excite = 0;
}

Reflector.RADIUS = 40;
Reflector.prototype.update = function (dt) {
  if (this.deleted) {
    return false;
  }
  this.excite /= Math.exp(dt * 10);
};

Reflector.prototype.draw = function (ctx) {
  ctx.save();
  ctx.beginPath();
  var excite = Math.min(this.radius / 2, Math.max(0, this.excite));
  ctx.arc(this.x, this.y, this.radius - excite / 2, 0, Math.PI * 2, false);

  ctx.fillStyle = "#444";
  ctx.fill();

  ctx.lineWidth = excite;
  ctx.strokeStyle = 'orange';
  ctx.stroke();
  ctx.restore();
};

Reflector.create = function (buffer, radius, shift) {
  return new Reflector(buffer, radius, shift);
};

function Ball(x, y, vx, vy) {
  this.x = x;
  this.y = y;
  this.vx = vx;
  this.vy = vy;
  this.life = 1;
}

Ball.RADIUS = 10;
Ball.prototype.update = function (dt) {
  this.life -= dt / 3;
  if (this.life < 0) {
    return false;
  }
  var me = this;
  this.x += this.vx * dt;
  this.y += this.vy * dt + 450 * dt * dt;
  this.vy += 900 * dt;
  var x = this.x;
  var y = this.y;
  var vx = this.vx;
  var vy = this.vy;
  var speed = Math.sqrt(vx * vx + vy * vy);
  var result;
  reflectors.forEach(function (reflector) {
    var r2 = Ball.RADIUS + reflector.radius;
    r2 *= r2;
    var dx = x - reflector.x;
    var dy = y - reflector.y;
    if (dx * dx + dy * dy < r2) {
      var dir = Math.atan2(dy, dx);
      vx = speed * Math.cos(dir);
      vy = speed * Math.sin(dir);
      reflector.excite = 10;
      playSound(reflector.buffer, 0, 0.3 * me.life);
    }
  });
  this.vx = vx;
  this.vy = vy;
  if (!result) {
    return result;
  }

  if (this.x - Ball.RADIUS > WIDTH) {
    return false;
  }
  if (this.y - Ball.RADIUS > HEIGHT) {
    return false;
  }
};
Ball.prototype.draw = function (ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(this.x, this.y, Ball.RADIUS, 0, Math.PI * 2, false);

  ctx.globalAlpha = this.life;
  ctx.fillStyle = "#999";
  ctx.fill();

  ctx.strokeStyle = 'black';
  ctx.stroke();
  ctx.restore();
};
Ball.create = function (x, y, vx, vy) {
  return new Ball(x, y, vx, vy);
};

var balls = new Registry(Ball);
var reflectors = new Registry(Reflector);


// Init

$(function () {
  var BUFFERS;
  loadSounds(['c.wav', 'd.wav', 'e.wav', 'g.wav', 'a.wav'], function (buffers) {
    BUFFERS = buffers;

    var canvas = $('canvas');
    var ctx = canvas[0].getContext('2d');
    var WIDTH = canvas.width();
    var HEIGHT = canvas.height();
    canvas[0].width = WIDTH;
    canvas[0].height = HEIGHT;

    var lastTime = +new Date();

    function draw() {
      ctx.fillStyle = '#EEE';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      balls.draw(ctx);
      reflectors.draw(ctx);
    }

    function update() {
      var dt = (+new Date() - lastTime) / 1000;
      lastTime = +new Date();
      balls.update(dt);
      reflectors.update(dt);
      draw();
      setTimeout(update, 15);
    }

    function newBall() {
      balls.create(0, 0, 400, 0);
    }

    canvas[0].addEventListener('mousedown', function (e) {
      var x = e.offsetX;
      var y = e.offsetY;
      var ref = reflectors.create(BUFFERS[reflectors.length % BUFFERS.length], 20 + Math.random() * 30);
      ref.x = x;
      ref.y = y;
    }, false);

    setTimeout(update, 15);
    setInterval(newBall, 500);
  });
});