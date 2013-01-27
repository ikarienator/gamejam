Number.prototype.toMoney = function (decimals, decimal_sep, thousands_sep) {
  var n = this,
    c = isNaN(decimals) ? 2 : Math.abs(decimals),
    d = decimal_sep || '.',
    t = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
    sign = (n < 0) ? '-' : '',
    i = parseInt(n = Math.abs(n).toFixed(c)) + '',
    j;
  j = ((j = i.length) > 3) ? j % 3 : 0;
  return sign + (j ? i.substr(0, j) + t : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : '');
};

Array.prototype.removeAll = function (toDelete) {
  var i = 0, j = 0, k = 0;
  for (; i < this.length; i++) {
    if (this[i] === toDelete[k]) {
      k++;
    } else {
      this[j++] = this[i];
    }
  }
  this.length = j;
};

var WIDTH = 34;
var HEIGHT = 20;
var BLOCK_SIZE = 30;
var SCORE_OFFSET_X = 40;
var BULLET_SPEED = 1;
var BULLET_RADIUS = 4;
var ENEMY_SPEED = 0.05;
var ENEMY_RADIUS = 10;
var CANVAS_WIDTH = WIDTH * BLOCK_SIZE;
var CANVAS_HEIGHT = HEIGHT * BLOCK_SIZE;
var entrance = [
  [WIDTH - 1, HEIGHT / 2]
];
var earning = 300;
var cursor_x = 0;
var cursor_y = 0;
var field = [];
var blocked = [];

var dxs = [-1, 0, 1, 0];
var dys = [0, 1, 0, -1];


function initCheckerBoard() {
  for (var x = 0; x < WIDTH; x++) {
    var arr = [], arr2 = [];
    for (var y = 0; y < HEIGHT; y++) {
      arr[y] = false;
      arr2[y] = {
        distance: Infinity,
        vx: 0,
        vy: -1
      };
    }
    blocked[x] = arr;
    field[x] = arr2;
  }
}

initCheckerBoard();

function updateField() {
  var queue = [], queue_top = 0, obj, x, y, dist;
  for (x = 0; x < WIDTH; x++) {
    for (y = 0; y < HEIGHT; y++) {
      field[x][y].distance = Infinity;
    }
  }
  var d, new_x, new_y;
  queue.push({x: 0, y: 0});
  field[0][0].distance = 0;
  while (queue_top < queue.length) {
    obj = queue[queue_top++];
    x = obj.x;
    y = obj.y;
    dist = field[x][y].distance;
    for (d = 0; d < 4; d++) {
      new_x = dxs[d] + x;
      new_y = dys[d] + y;
      if (new_x < 0 || new_x >= WIDTH) {
        continue;
      }
      if (new_y < 0 || new_y >= HEIGHT) {
        continue;
      }
      if (blocked[new_x][new_y]) {
        continue;
      }
      if (field[new_x][new_y].distance > dist + 1) {
        field[new_x][new_y].distance = dist + 1;
        field[new_x][new_y].vx = -dxs[d];
        field[new_x][new_y].vy = -dys[d];
        queue.push({
          x: new_x,
          y: new_y
        })
      }
    }
  }
}

updateField();

function validate() {
  for (var i = 0, l = entrance.length; i < l; i++) {
    var en = entrance[i];
    if (blocked[en[0]][en[1]]) {
      return false;
    }
    if (!isFinite(field[en[0]][en[1]].distance)) {
      return false;
    }
  }
  for (i = 0, l = enemies.length; i < l; i++) {
    en = enemies[i];
    if (blocked[en.idx_x][en.idx_y]) {
      return false;
    }
    if (blocked[en.target_x][en.target_y]) {
      return false;
    }
    if (!isFinite(field[en.idx_x][en.idx_y].distance)) {
      return false;
    }
    if (!isFinite(field[en.target_x][en.target_y].distance)) {
      return false;
    }
  }

  return true;
}

function testPlacement(x, y) {
  if (x < 0) {
    return false;
  }
  if (x + 1 >= WIDTH) {
    return false;
  }
  if (y + 1 >= HEIGHT) {
    return false;
  }
  if (blocked[x][y] || blocked[x][y + 1] || blocked[x + 1][y] || blocked[x + 1][y + 1]) {
    return null;
  }

  blocked[x][y] = true;
  blocked[x + 1][y] = true;
  blocked[x][y + 1] = true;
  blocked[x + 1][y + 1] = true;
  updateField();
  var ok = validate();
  blocked[x][y] = false;
  blocked[x + 1][y] = false;
  blocked[x][y + 1] = false;
  blocked[x + 1][y + 1] = false;
  updateField();
  return ok;
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

var sentinels = new Registry(Sentinel);
var bullets = new Registry(Bullet);
var enemies = new Registry(Enemy);

/**
 * Sentinel class
 * @param x
 * @param y
 * @constructor
 */
function Sentinel(x, y) {
  this.x = x * BLOCK_SIZE + BLOCK_SIZE;
  this.y = y * BLOCK_SIZE + BLOCK_SIZE;
  this.direction = 0;
  this.next_time = +new Date() + 1000;
  blocked[x][y] = true;
  blocked[x + 1][y] = true;
  blocked[x][y + 1] = true;
  blocked[x + 1][y + 1] = true;
  updateField();
}
Sentinel.prototype.range = 8;
Sentinel.prototype.draw = function (ctx) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'black';
  ctx.fillStyle = '#999';
  var x = this.x;
  var y = this.y;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2, false);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 25 * Math.cos(this.direction), y + 25 * Math.sin(this.direction));
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};
Sentinel.prototype.update = function () {
  var sentinel = this;
  var x = this.x;
  var y = this.y;
  var nearest_enemy = null;
  var nearest = Infinity;
  var range = sentinel.range * BLOCK_SIZE;
  enemies.forEach(function (enemy) {
    var path = field[enemy.idx_x][enemy.idx_y].distance;
    var dx = x - enemy.x;
    var dy = y - enemy.y;
    if (nearest > path) {
      if (dx * dx + dy * dy < range * range) {
        nearest = path;
        nearest_enemy = enemy;
      }
    }
  });
  if (nearest_enemy) {
    sentinel.direction = Math.atan2(nearest_enemy.y - y, nearest_enemy.x - x);
    if (sentinel.next_time < +new Date()) {
      sentinel.next_time = +new Date() + 1000;
      bullets.create(
        x + 20 * Math.cos(sentinel.direction),
        y + 20 * Math.sin(sentinel.direction),
        BULLET_SPEED * Math.cos(sentinel.direction),
        BULLET_SPEED * Math.sin(sentinel.direction)
      );
    }
  }
  return true;
};
Sentinel.create = function (x, y) {
  if (earning < 100) {
    return null;
  }
  if (!testPlacement(x, y)) {
    return null;
  }

  earning -= 100;
  return new Sentinel(x, y);
};

/**
 * Bullet class
 * @param x
 * @param y
 * @param vx
 * @param vy
 * @constructor
 */
function Bullet(x, y, vx, vy) {
  this.x = x;
  this.y = y;
  this.vx = vx;
  this.vy = vy;
}
Bullet.prototype.draw = function (ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(this.x, this.y, 8, 0, Math.PI * 2, false);
  ctx.fillStyle = 'black';
  ctx.fill();
  ctx.restore();
};
Bullet.prototype.update = function (dt) {
  var rad = ENEMY_RADIUS + BULLET_RADIUS;
  var bullet = this;
  bullet.x += bullet.vx * dt;
  bullet.y += bullet.vy * dt;
  if (bullet.x < 0 || bullet.y < 0 || bullet.x > CANVAS_WIDTH || bullet.y > CANVAS_HEIGHT) {
    return false;
  }
  for (var i = 0; i < enemies.length; i++) {
    var enemy = enemies[i];
    var dx = enemy.x - bullet.x;
    var dy = enemy.y - bullet.y;
    if (dx * dx + dy * dy < rad * rad) {
      enemy.life -= 20;
      return false;
    }
  }
  return true;
};
Bullet.create = function (x, y, vx, vy) {
  return new Bullet(x, y, vx, vy);
};

function Enemy(idx_x, idx_y) {
  this.idx_x = idx_x;
  this.idx_y = idx_y;
  this.target_x = field[idx_x][idx_y].vx + idx_x;
  this.target_y = field[idx_x][idx_y].vy + idx_y;
  this.x = idx_x * BLOCK_SIZE + 0.5 * BLOCK_SIZE;
  this.y = idx_y * BLOCK_SIZE + 0.5 * BLOCK_SIZE;
}
Enemy.prototype.life = 300;
Enemy.prototype.draw = function (ctx) {
  ctx.save();

  ctx.lineWidth = 3;
  ctx.strokeStyle = 'black';
  ctx.fillStyle = '#F99';
  ctx.beginPath();
  ctx.arc(this.x, this.y, ENEMY_RADIUS, 0, Math.PI * 2, false);
  ctx.moveTo(this.x, this.y);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};
Enemy.prototype.update = function (dt) {
  var enemy = this;
  if (enemy.life <= 0) {
    earning += 150;
    return false;
  }
  var x = Math.round(this.x / BLOCK_SIZE - 0.5);
  var y = Math.round(this.y / BLOCK_SIZE - 0.5);
  if (x == 0 && y == 0) {
    return false;
  }
  var target_x = (this.target_x + 0.5) * BLOCK_SIZE;
  var target_y = (this.target_y + 0.5) * BLOCK_SIZE;
  var vx = this.target_x - this.idx_x;
  var vy = this.target_y - this.idx_y;
  if ((target_x - this.x) * vx < 0 || (target_y - this.y) * vy < 0) {
    this.idx_x = this.target_x;
    this.idx_y = this.target_y;
    this.x = (this.idx_x + 0.5) * BLOCK_SIZE;
    this.y = (this.idx_y + 0.5) * BLOCK_SIZE;
    var fe = field[this.idx_x][this.idx_y];
    vx = fe.vx;
    vy = fe.vy;
    this.target_x += vx;
    this.target_y += vy;
  }
  var speed = dt * ENEMY_SPEED;
  this.x += speed * vx;
  this.y += speed * vy;
  return true;
};
Enemy.create = function (x, y) {
  return new Enemy(x, y);
};

$(document).ready(function () {
  var $canvas = $('#canvas');
  var canvas = $canvas[0];
  var ctx = canvas.getContext('2d');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  $canvas.mousemove(function (e) {
    var x = e.offsetX,
      y = e.offsetY;
    cursor_x = Math.floor(x / BLOCK_SIZE + 0.5);
    cursor_y = Math.floor(y / BLOCK_SIZE + 0.5);
  });

  $canvas.click(function (e) {
    var x = e.offsetX,
      y = e.offsetY;
    x = Math.floor(x / BLOCK_SIZE - 0.5);
    y = Math.floor(y / BLOCK_SIZE - 0.5);
    sentinels.create(x, y);
  });

  function clear() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawBoard() {
    ctx.save();
    for (var x = 0; x < WIDTH; x++) {
      for (var y = 0; y < HEIGHT; y++) {
        ctx.fillStyle = ((x + y) % 2 == 0) ? '#DDD' : '#FFF';
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawScore() {
    ctx.save();
    ctx.font = "30px Courier";
    ctx.fillStyle = "#ff0";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.textAlign = 'right';
    ctx.beginPath();
    ctx.strokeText('$' + earning.toMoney(), CANVAS_WIDTH - SCORE_OFFSET_X, 40);
    ctx.fillText('$' + earning.toMoney(), CANVAS_WIDTH - SCORE_OFFSET_X, 40);
    ctx.restore();
  }

  function drawCursor() {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "none";
    ctx.strokeStyle = "rgba(255,0,0,0.3)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cursor_x * BLOCK_SIZE, cursor_y * BLOCK_SIZE, BLOCK_SIZE * 0.8, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    clear();
    drawBoard();
    drawScore();
    drawCursor();
    sentinels.draw(ctx);
    bullets.draw(ctx);
    enemies.draw(ctx);
  }

  var lastTime = +new Date();
  var next_enemy = +new Date();

  function update() {
    var dt = +new Date() - lastTime;
    lastTime = +new Date();
    bullets.update(dt);
    sentinels.update(dt);
    enemies.update(dt);
    if (next_enemy < +new Date()) {
      next_enemy = +new Date() + 3000;
      entrance.forEach(function (ent) {
        enemies.create(ent[0], ent[1]);
      });

    }
    draw();
    setTimeout(update, 15);
  }

  setTimeout(update, 15);
});