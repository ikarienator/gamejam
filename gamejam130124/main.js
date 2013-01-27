Number.prototype.toMoney = function (decimals, decimal_sep, thousands_sep) {
    var n = this,
        c = isNaN(decimals) ? 2 : Math.abs(decimals), //if decimal is zero we must take it, it means user does not want to show any decimal
        d = decimal_sep || '.', //if no decimal separator is passed we use the dot as default decimal separator (we MUST use a decimal separator)

    /*
     according to [http://stackoverflow.com/questions/411352/how-best-to-determine-if-an-argument-is-not-sent-to-the-javascript-function]
     the fastest way to check for not defined parameter is to use typeof value === 'undefined'
     rather than doing value === undefined.
     */
        t = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep, //if you don't want to use a thousands separator you can pass empty string as thousands_sep value

        sign = (n < 0) ? '-' : '',

    //extracting the absolute value of the integer part of the number and converting to string
        i = parseInt(n = Math.abs(n).toFixed(c)) + '',

        j;
    j = ((j = i.length) > 3) ? j % 3 : 0;
    return sign + (j ? i.substr(0, j) + t : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : '');
};

$(document).ready(function () {
    var $canvas = $('#canvas');
    var canvas = $canvas[0];
    var ctx = canvas.getContext('2d');
    var WIDTH = 17;
    var HEIGHT = 10;
    var BLOCK_SIZE = 60;
    var CANVAS_WIDTH = canvas.width = WIDTH * BLOCK_SIZE;
    var CANVAS_HEIGHT = canvas.height = HEIGHT * BLOCK_SIZE;
    var SCORE_OFFSET_X = 40;
    var BULLET_SPEED = 0.3;
    var ENEMY_SPEED = 0.05;
    var sentinels = [];
    var bullets = [];
    var enemies = [];
    var earning = 1000;
    var operation = 'create';
    var cursor_x = 0;
    var cursor_y = 0;
    ctx.font = "30px Courier";
    $canvas.mousemove(function (e) {
        var x = e.offsetX,
            y = e.offsetY;
        cursor_x = Math.floor(x / BLOCK_SIZE);
        cursor_y = Math.floor(y / BLOCK_SIZE);
    });
    $canvas.click(function (e) {
        var x = e.offsetX,
            y = e.offsetY;
        x = Math.floor(x / BLOCK_SIZE);
        y = Math.floor(y / BLOCK_SIZE);
        if (earning <= 0) {
            return;
        }
        for (var i = 0; i < sentinels.length; i++) {
            if (sentinels[i].x == x && sentinels[i].y == y) {
                return;
            }
        }
        earning -= 100;
        sentinels.push({
            x:x,
            y:y,
            next_time:+new Date() + 1000,
            direction:0,
            life:3000
        })
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
        ctx.restore();
    }

    function drawScore() {
        ctx.save();
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
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cursor_x * BLOCK_SIZE + BLOCK_SIZE / 2, cursor_y * BLOCK_SIZE + BLOCK_SIZE / 2, BLOCK_SIZE * 0.8 / 2, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.restore();
    }

    function drawBullets() {
        ctx.save();
        ctx.beginPath();
        bullets.forEach(function (bullet) {
            ctx.arc(bullet.x, bullet.y, 8, 0, Math.PI * 2, false);
        });
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.restore();
    }

    function drawSentinels() {
        ctx.save();

        ctx.lineWidth = 3;
        ctx.strokeStyle = 'black';
        ctx.fillStyle = '#999';
        sentinels.forEach(function (sentinel) {
            var x = sentinel.x * BLOCK_SIZE + BLOCK_SIZE / 2;
            var y = sentinel.y * BLOCK_SIZE + BLOCK_SIZE / 2;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2, false);
            ctx.moveTo(x, y);
            ctx.lineTo(x + 25 * Math.cos(sentinel.direction), y + 25 * Math.sin(sentinel.direction));
            ctx.fill();
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawEnemies() {
        ctx.save();

        ctx.lineWidth = 3;
        ctx.strokeStyle = 'black';
        ctx.fillStyle = '#F99';
        enemies.forEach(function (enemy) {
            var x = enemy.x;
            var y = enemy.y;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2, false);
            ctx.moveTo(x, y);
            ctx.fill();
            ctx.stroke();
        });
        ctx.restore();
    }

    function draw() {
        clear();
        drawBoard();
        drawScore();
        drawCursor();
        drawSentinels();
        drawBullets();
        drawEnemies();
    }

    var lastTime = +new Date();
    var next_enemy = +new Date();

    function updateBullets(dt) {
        bullets.forEach(function (bullet) {
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
        });
    }

    function updateSentinels(dt) {
        sentinels.forEach(function (sentinel) {
            var x = sentinel.x * BLOCK_SIZE + BLOCK_SIZE / 2;
            var y = sentinel.y * BLOCK_SIZE + BLOCK_SIZE / 2;
            var nearest_enemy = null;
            var nearest = Infinity;
            enemies.forEach(function (enemy) {
                var dx = enemy.x - x;
                var dy = enemy.y - y;
                if (nearest > dx * dx + dy * dy) {
                    nearest = dx * dx + dy * dy;
                    nearest_enemy = enemy;
                }
            });
            if (nearest_enemy) {
                sentinel.direction = Math.atan2(nearest_enemy.y - y, nearest_enemy.x - x);
                if (sentinel.next_time < +new Date()) {
                    sentinel.next_time = +new Date() + 1000;
                    bullets.push({
                        x:x + 20 * Math.cos(sentinel.direction),
                        y:y + 20 * Math.sin(sentinel.direction),
                        vx:BULLET_SPEED * Math.cos(sentinel.direction),
                        vy:BULLET_SPEED * Math.sin(sentinel.direction)
                    })
                }
            }
        });
    }

    function updateEnemies(dt) {
        var toDelete = [];
        enemies.forEach(function (enemy) {
            if (enemy.life <= 0) {
                toDelete.push(enemy);
                return;
            }
            var nearest_x = 0;
            var nearest_y = 0;
            var nearest = Infinity;
            var nearest_sentinel = null;
            sentinels.forEach(function (sentinel) {
                var x = sentinel.x * BLOCK_SIZE + BLOCK_SIZE / 2;
                var y = sentinel.y * BLOCK_SIZE + BLOCK_SIZE / 2;
                var dx = x - enemy.x;
                var dy = y - enemy.y;
                if (dx * dx + dy * dy < nearest) {
                    nearest_sentinel = sentinel;
                    nearest = dx * dx + dy * dy;
                    nearest_x = x;
                    nearest_y = y;
                }
            });
            if (!isFinite(nearest)) {
                nearest = enemy.x * enemy.x + enemy.y * enemy.y;
            }
            if (nearest < BLOCK_SIZE * BLOCK_SIZE) {
                if (nearest_sentinel) {
                    nearest_sentinel.life -= dt;
                    if (nearest_sentinel.life < 0) {
                        for (var i = 0; i < sentinels.length; i++) {
                            if (sentinels[i] == nearest_sentinel) {
                                sentinels.splice(i, 1);
                                break;
                            }
                        }
                    }
                } else {
                    toDelete.push(enemy);
                }
            } else {
                var q = ENEMY_SPEED * dt / Math.sqrt(nearest);
                enemy.x += q * (nearest_x - enemy.x);
                enemy.y += q * (nearest_y - enemy.y);
            }
        });
        for (var i = 0, j = 0, k = 0; i < enemies.length; i++) {
            if (enemies[i] === toDelete[k]) {
                k++;
            } else {
                enemies[j++] = enemies[i];
            }
        }
        enemies.length = j;
        if (next_enemy < +new Date()) {
            next_enemy = +new Date() + 6000;
            enemies.push({
                x:CANVAS_WIDTH,
                y:CANVAS_HEIGHT * 0.5,
                life:100
            });
        }
    }

    function update() {
        var dt = +new Date() - lastTime;
        lastTime = +new Date();
        updateBullets(dt);
        updateSentinels(dt);
        updateEnemies(dt);
        draw();
        setTimeout(update, 15);
    }

    setTimeout(update, 15);
});