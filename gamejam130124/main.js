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

var dxs = [-1, -1, 0, 1, 1, 1, 0, -1];
var dys = [0, 1, 1, 1, 0, -1, -1, -1];


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
  var d, new_x, new_y, l;
  queue.push({x: 0, y: 0});
  field[0][0].distance = 0;
  while (queue_top < queue.length) {
    obj = queue[queue_top++];
    x = obj.x;
    y = obj.y;
    dist = field[x][y].distance;
    for (d = 0; d < 8; d++) {
      new_x = dxs[d] + x;
      new_y = dys[d] + y;
      l = Math.sqrt(dxs[d] * dxs[d] + dys[d] * dys[d]);
      if (new_x < 0 || new_x >= WIDTH) {
        continue;
      }
      if (new_y < 0 || new_y >= HEIGHT) {
        continue;
      }
      if (blocked[new_x][new_y]) {
        continue;
      }
      if (field[new_x][new_y].distance > dist + l) {
        field[new_x][new_y].distance = dist + l;
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
    return false;
  }

  blocked[x][y] = true;
  blocked[x + 1][y] = true;
  blocked[x][y + 1] = true;
  blocked[x + 1][y + 1] = true;
  var ok = true,
    ds = new DisjointSet(WIDTH * HEIGHT),
    i, j, l, source;
  for (j = 0; j < HEIGHT; j++) {
    for (i = 0; i < WIDTH; i++) {
      if (!blocked[i][j]) {
        if (i + 1 < WIDTH) {
          if (!blocked[i + 1][j]) {
            ds.join(i + j * WIDTH, i + 1 + j * WIDTH);
          }
        }
        if (j + 1 < HEIGHT) {
          if (!blocked[i ][j + 1]) {
            ds.join(i + j * WIDTH, i + j * WIDTH + WIDTH);
          }
        }
      }
    }
  }
  source = ds.get(0);
  for (i = 0, l = enemies.length; i < l; i++) {
    if (source !== ds.get(enemies[i].idx_x + enemies[i].idx_y * WIDTH)) {
      ok = false;
      break;
    }
    if (source !== ds.get(enemies[i].target_x + enemies[i].target_y * WIDTH)) {
      ok = false;
      break;
    }
  }
  if (ok) {
    for (i = 0, l = entrance.length; i < l; i++) {
      if (source !== ds.get(entrance[i][0] + entrance[i][1] * WIDTH)) {
        ok = false;
        break;
      }
    }
  }

  blocked[x][y] = false;
  blocked[x + 1][y] = false;
  blocked[x][y + 1] = false;
  blocked[x + 1][y + 1] = false;
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
var roadMarks = new Registry(RoadMark);

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
  var l = Math.sqrt(vx * vx + vy * vy);
  var speed = dt * ENEMY_SPEED / l;
  this.x += speed * vx;
  this.y += speed * vy;
  return true;
};
Enemy.create = function (x, y) {
  return new Enemy(x, y);
};

function RoadMark(idx_x, idx_y) {
  this.lambda = 0;
  this.idx_x = idx_x;
  this.idx_y = idx_y;
  this.target_x = idx_x + field[idx_x][idx_y].vx;
  this.target_y = idx_y + field[idx_x][idx_y].vy;
}
RoadMark.prototype.update = function (dt) {
  this.lambda += dt / 1000 * 4;
  if (this.lambda > 1) {
    var idx_x = this.target_x;
    var idx_y = this.target_y;
    if (idx_x === 0 && idx_y === 0) {
      return false;
    }
    if (!isFinite(field[idx_x][idx_y].distance)) {
      return false;
    }
    this.idx_x = idx_x;
    this.idx_y = idx_y;
    this.target_x = idx_x + field[idx_x][idx_y].vx;
    this.target_y = idx_y + field[idx_x][idx_y].vy;
    this.lambda = 0;
  }
  return true;
};
function placeRoadMark(ctx, x, y) {
  var el = field[x][y];
  var vx = el.vx;
  var vy = el.vy;
  var pixel_x = (x + 0.5) * BLOCK_SIZE;
  var pixel_y = (y + 0.5) * BLOCK_SIZE;
  ctx.save();
  ctx.beginPath();
  ctx.translate(pixel_x, pixel_y);
  ctx.rotate(Math.atan2(vy, vx));
  for (var i = 0; i < 3; i++) {
    ctx.translate(5, 0);
    ctx.moveTo(0, 5);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, -5);
  }
  ctx.stroke();
  ctx.restore();
}
RoadMark.prototype.draw = function (ctx) {
  ctx.save();
  ctx.strokeStyle = 'grey';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 1 - this.lambda;
  placeRoadMark(ctx, this.idx_x, this.idx_y);
  ctx.globalAlpha = this.lambda;
  placeRoadMark(ctx, this.target_x, this.target_y);
  ctx.restore();
};
RoadMark.create = function (idx_x, idx_y) {
  return new RoadMark(idx_x, idx_y);
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

  ctx.lineWidth = 3;
  ctx.strokeStyle = 'black';
  function draw() {
    clear();
    drawScore();
    drawCursor();
    roadMarks.draw(ctx);
    ctx.fillStyle = '#999';
    sentinels.draw(ctx);
    ctx.fillStyle = 'black';
    bullets.draw(ctx);
    ctx.fillStyle = '#F99';
    enemies.draw(ctx);
  }

  var lastTime = +new Date();
  var next_enemy = +new Date();
  var next_road_mark = +new Date();
  roadMarks.create(WIDTH - 1, HEIGHT / 2);
  function update() {
    var dt = +new Date() - lastTime;
    lastTime = +new Date();
    roadMarks.update(dt);
    bullets.update(dt);
    sentinels.update(dt);
    enemies.update(dt);
    if (next_enemy < +new Date()) {
      next_enemy = +new Date() + 3000;
      entrance.forEach(function (ent) {
        enemies.create(ent[0], ent[1]);
      });
    }
    if (next_road_mark < +new Date()) {
      next_road_mark = +new Date() + 1200;
      entrance.forEach(function (ent) {
        roadMarks.create(ent[0], ent[1]);
      });
    }
    draw();
    setTimeout(update, 15);
  }

  setTimeout(update, 15);
});