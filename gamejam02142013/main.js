var ITEMS = [
  'tuna',
  'cheese',
  'noodle',
  'onion',
  'peas'
];

var WIDTH = 15;
var HEIGHT = 8;
var COUNT = WIDTH * HEIGHT;
var BLOCK_SIZE = 64;
function rand() {
  return Math.random() * ITEMS.length >> 0;
}
$(function () {
  var canvas = $('.canvas');
  var block_stacks = [];
  var items = [];
  var scores = $('.score');
  var selected_item = null;
  canvas.width(WIDTH * BLOCK_SIZE).height(HEIGHT * BLOCK_SIZE);
  for (var i = 0; i < WIDTH; i++) {
    block_stacks[i] = [];
  }

  function getItemPos(item) {
    for (var x = 0; x < WIDTH; x++) {
      for (var y = 0; y < HEIGHT; y++) {
        if (block_stacks[x][y] === item) {
          return [x, y];
        }
      }
    }
    return null;
  }

  function goodMove() {
    return false;
  }

  function mapCoord(xy) {
    return [xy[0] * BLOCK_SIZE, (HEIGHT - 1 - xy[1]) * BLOCK_SIZE];
  }

  function newImage(type, column, row) {
    var img = document.createElement('img');
    var item = {};
    img.src = ITEMS[type] + '.jpg';
    canvas.append($(img));
    img.addEventListener('click', function (e) {
      if (item.moving) {
        return false;
      }
      if (!selected_item) {
        $(img).addClass('activated');
        selected_item = item;
      } else {

        var src_item = selected_item;
        $(selected_item.img).removeClass('activated');
        selected_item = null;

        // Toggle selection
        if (src_item === item) {
          return;
        }

        var pos1 = getItemPos(src_item);
        var pos2 = getItemPos(item);
        if (pos1 === null) {
          return;
        }

        if (Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]) == 1) {

          //swap
          src_item.src_pos = mapCoord(pos1);
          src_item.dst_pos = mapCoord(pos2);
          src_item.img.style.zIndex = 1;
          src_item.lambda = 0;
          src_item.moving = true;

          item.src_pos = mapCoord(pos2);
          item.dst_pos = mapCoord(pos1);
          item.img.style.zIndex = 0;
          item.lambda = 0;
          item.moving = true;

          item.callback = function () {
            block_stacks[pos2[0]][pos2[1]] = src_item;
            block_stacks[pos1[0]][pos1[1]] = item;
            var strip = findStrips();
            if (!strip) {
              block_stacks[pos2[0]][pos2[1]] = item;
              block_stacks[pos1[0]][pos1[1]] = src_item;

              src_item.src_pos = mapCoord(pos2);
              src_item.dst_pos = mapCoord(pos1);
              src_item.img.style.zIndex = 0;
              src_item.lambda = 0;
              src_item.moving = true;

              item.src_pos = mapCoord(pos1);
              item.dst_pos = mapCoord(pos2);
              item.img.style.zIndex = 1;
              item.lambda = 0;
              item.moving = true;
            } else {
              removeStrip(strip, function (item) {
                item.img.style.opacity = 0;
                item.img.style.zIndex = 10;
                setTimeout(function () {
                  item.img.parentNode.removeChild(item.img);
                }, 300);
              });
              dropToFill();
            }
          };
        } else {
          img.addClass('activated');
          selected_item = item;
        }
      }
    }, false);
    item.type = type;
    item.img = img;
    item.src_pos = mapCoord([column, HEIGHT]);
    item.dst_pos = mapCoord([column, row]);
    img.style.webkitTransform = 'translate3d(' + item.src_pos[0] + 'px,' + item.src_pos[1] + 'px, 0px)';
    item.lambda = 0;
    item.moving = true;
    item.speed = 1.3;
    item.callback = function () {
      item.speed = 4;
    };
    items.push(item);
    return item;
  }

  function findStrips() {
    var x, y, curr, curr_type, l;
    for (x = 0; x < WIDTH; x++) {
      for (y = 0; y < HEIGHT; y++) {
        curr = block_stacks[x][y];
        curr_type = curr.type;
        if (x + 2 < WIDTH) {
          if (block_stacks[x + 1][y].type == block_stacks[x + 2][y].type &&
            block_stacks[x + 2][y].type == curr_type) {
            l = 3;
            while (x + l < WIDTH && block_stacks[x + l][y].type == curr_type) {
              l++;
            }
            return [x, y, 0, l];
          }
        }
        if (y + 2 < HEIGHT) {
          if (block_stacks[x][y + 1].type == block_stacks[x][y + 2].type &&
            block_stacks[x][y + 2].type == curr_type) {
            l = 3;
            while (y + l < HEIGHT && block_stacks[x][y + l].type == curr_type) {
              l++;
            }
            return [x, y, 1, l];
          }
        }
      }
    }
    return null;
  }

  function removeStrip(strip, onRemove) {
    var x = strip[0];
    var y = strip[1];
    var type = strip[2];
    var l = strip[3];
    var i;
    scores[block_stacks[x][y].type].innerHTML = +(scores[block_stacks[x][y].type].innerHTML) + (l - 2) * (l - 2);
    if (type == 0) {
      for (i = x; i < x + l; i++) {
        onRemove(block_stacks[i][y]);
        block_stacks[i].splice(y, 1);
      }
    } else {
      for (i = y; i < y + l; i++) {
        onRemove(block_stacks[x][i]);

      }
      block_stacks[x].splice(y, l);
    }
  }

  function dropToFill() {
    do {
      for (var i = 0; i < WIDTH; i++) {
        while (block_stacks[i].length < HEIGHT) {
          var type = rand();
          block_stacks[i].push(newImage(type, i, block_stacks[i].length));
        }
      }

      for (var x = 0; x < WIDTH; x++) {
        for (var y = 0; y < HEIGHT; y++) {
          var curr = block_stacks[x][y];
          curr.dst_pos = [x * BLOCK_SIZE, (HEIGHT - 1 - y) * BLOCK_SIZE];
          if (!curr.moving && curr.src_pos[0] != curr.dst_pos[0] ||
            curr.src_pos[1] != curr.dst_pos[1]) {
            curr.moving = true;
            curr.speed = 1.3;
            curr.lambda = 0;
            curr.callback = function () {
              this.speed = 4;
            };
          }
        }
      }
      var strip = findStrips();
      if (strip) {
        removeStrip(strip, function (item) {
          item.img.remove();
        });
        setTimeout(dropToFill, 1000);
      }
    } while (strip);
  }

  function update(dt) {
    items.forEach(function (item) {
      if (item.moving) {
        item.lambda += dt * item.speed;
        if (item.lambda > 1) {
          item.lambda = 1;
        }
        var lambda = (1 - Math.cos(item.lambda * Math.PI)) / 2;
        item.img.style.webkitTransform = 'translate3d(' +
          (item.src_pos[0] + (item.dst_pos[0] - item.src_pos[0]) * lambda) + 'px,' +
          (item.src_pos[1] + (item.dst_pos[1] - item.src_pos[1]) * lambda) + 'px, 0px)';
        if (item.lambda == 1) {
          item.moving = false;
          item.src_pos = item.dst_pos.slice(0);
          if (item.callback) {
            item.callback(item);
            item.callback = null;
          }
        }
      }
    });
  }

  var lastTime = +new Date();

  function onUpdate() {
    var dt = (new Date() - lastTime) / 1000;
    lastTime = +new Date();
    update(dt);
  }

  dropToFill();
  scores.html('0');
  setInterval(onUpdate, 15);
});