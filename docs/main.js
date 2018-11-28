// we'll defer our execution until the wasm is ready to go
function wasm_loaded() {
    console.log("wasm loaded");
    start_game();
}
// here we tell bindgen the path to the wasm file so it can start
// initialization and return to us a promise when it's done
wasm_bindgen("./hobogo_bg.wasm")
    .then(wasm_loaded)["catch"](console.error);
function player_to_wasm(player) {
    return player === null ? -1 : player;
}
function board_to_wasm(board) {
    var wasm_board = new Int8Array(board.length * board[0].length);
    var i = 0;
    for (var _i = 0, board_1 = board; _i < board_1.length; _i++) {
        var row = board_1[_i];
        for (var _a = 0, row_1 = row; _a < row_1.length; _a++) {
            var cell = row_1[_a];
            wasm_board[i++] = player_to_wasm(cell);
        }
    }
    return wasm_board;
}
function ai_move(board, player) {
    return wasm_bindgen.ai_move(board_to_wasm(board), player_to_wasm(player));
}
function game_over(board) {
    return wasm_bindgen.game_over(board_to_wasm(board));
}
// ----------------------------------------------------------------------------
function player_name(player) {
    if (player === 0) {
        return "red ";
    }
    else if (player === 1) {
        return "blue";
    }
    else {
        return "p" + player;
    }
}
function player_color(player) {
    if (player === null) {
        return "#AAAAAA";
    }
    else if (player === 0) {
        return "#FF2222";
    }
    else {
        return "#3366FF";
    }
}
function cell_color(board, coord) {
    var owner = board_at(board, coord);
    if (owner !== null) {
        return player_color(owner);
    }
    // if (is_hovering && is_valid_move(board, coord, g_current_player)) {
    //   // TODO: proper preview
    //   return player_color(g_current_player);
    // }
    if (is_valid_move(board, coord, g_current_player)) {
        return "#777";
    }
    var ruler = ruled_by(board, coord);
    if (ruler === null) {
        // We may not currently play here, but we might in the future!
        return "#444";
    }
    else {
        // We will never be able to play here:
        return "#222";
    }
}
var g_cell_size = 48;
function hovered_cell(board, mouse_pos) {
    for (var y = 0; y < board.length; ++y) {
        for (var x = 0; x < board[y].length; ++x) {
            var pad = 2;
            var left = x * g_cell_size + pad;
            var top_1 = y * g_cell_size + pad;
            var right = (x + 1) * g_cell_size - pad;
            var bottom = (y + 1) * g_cell_size - pad;
            var is_hovering = left <= mouse_pos.x && mouse_pos.x <= right &&
                top_1 <= mouse_pos.y && mouse_pos.y <= bottom;
            if (is_hovering) {
                return { x: x, y: y };
            }
        }
    }
    return null;
}
var PAINT_INFLUENCE = true;
function paint_board(canvas, board, hovered) {
    var FONT = "monospace";
    board = make_move(board, hovered, g_current_player) || board; // PREVIEW!
    var context = canvas.getContext("2d");
    context.fillStyle = "#111111";
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < board.length; ++y) {
        for (var x = 0; x < board[y].length; ++x) {
            var pad = 2;
            var left = x * g_cell_size + pad;
            var top_2 = y * g_cell_size + pad;
            var right = (x + 1) * g_cell_size - pad;
            var bottom = (y + 1) * g_cell_size - pad;
            context.fillStyle = cell_color(board, { x: x, y: y });
            context.fillRect(left, top_2, right - left, bottom - top_2);
            if (board[y][x] === null && PAINT_INFLUENCE) {
                var influences = influences_at(board, { x: x, y: y });
                if (g_num_players === 2) {
                    if (influences[0] !== influences[1]) {
                        var font_size = 10;
                        context.font = font_size + "pt " + FONT;
                        var player = influences[0] > influences[1] ? 0 : 1;
                        var text = (influences[player] > num_neighbors(board, { x: x, y: y }) / 2) ? "X"
                            : "" + Math.abs(influences[player] - influences[1 - player]);
                        context.fillStyle = player_color(player);
                        context.fillText(text, (left + right) / 2 - font_size / 2, (top_2 + bottom) / 2 + font_size / 2);
                    }
                }
                else {
                    for (var pi = 0; pi < g_num_players; ++pi) {
                        for (var i = 0; i < influences[pi]; ++i) {
                            var cx = left + g_cell_size * (1 + i) / 5;
                            var cy = top_2 + g_cell_size * (1 + pi) / (g_num_players + 1);
                            var radius = 4;
                            context.beginPath();
                            context.arc(cx, cy, radius, 0, 2 * Math.PI, false);
                            context.fillStyle = player_color(pi);
                            context.fill();
                        }
                    }
                }
            }
        }
    }
    // Columns: A, B, C, D, ...
    for (var x = 0; x < board[0].length; ++x) {
        context.font = "12pt " + FONT;
        context.fillStyle = "white";
        context.fillText("" + String.fromCharCode(x + 65), (x + 0.5) * g_cell_size - 6, board.length * g_cell_size + 12);
    }
    // Rows: 1, 2, 3, ...
    for (var y = 0; y < board[0].length; ++y) {
        context.font = "12pt " + FONT;
        context.fillStyle = "white";
        context.fillText("" + (y + 1), board[0].length * g_cell_size + 12, (y + 0.5) * g_cell_size);
    }
    {
        var y = board.length * g_cell_size + 64;
        context.font = "12pt " + FONT;
        if (game_over(board)) {
            context.fillStyle = "white";
            context.fillText("GAME OVER", 12, y);
        }
        else {
            context.fillStyle = player_color(g_current_player);
            context.fillText("Current player: " + player_name(g_current_player), 12, y);
        }
        y += 16;
        y += 16;
        context.fillStyle = "white";
        context.fillText("Score:", 12, y);
        y += 16;
        var score = get_score(board);
        for (var pi = 0; pi < g_num_players; ++pi) {
            context.fillStyle = player_color(pi);
            context.fillText(player_name(pi) + ": " + score.certain[pi] + " (+ " + score.claimed[pi] + " claimed)", 12, y);
            y += 16;
        }
        context.fillStyle = "white";
        context.fillText("parities: " + score.parities, 12, y);
    }
}
function get_mouse_pos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}
var g_canvas = document.getElementById("hobo_canvas");
var g_num_players = 2;
function array(n, value_maker) {
    var board = [];
    for (var i = 0; i < n; ++i) {
        board.push(value_maker(i));
    }
    return board;
}
function make_board(n) {
    return array(n, function (_) { return array(n, function (__) { return null; }); });
}
function is_board_at(board, coord) {
    if (coord.x < 0 || board[0].length <= coord.x) {
        return false;
    }
    if (coord.y < 0 || board.length <= coord.y) {
        return false;
    }
    return true;
}
function board_at(board, coord) {
    return is_board_at(board, coord) ? board[coord.y][coord.x] : null;
}
function num_neighbors(board, coord) {
    var num = 0;
    for (var dy = -1; dy <= +1; ++dy) {
        for (var dx = -1; dx <= +1; ++dx) {
            if (dx === 0 && dy === 0) {
                continue;
            }
            var neighbor_coord = { x: coord.x + dx, y: coord.y + dy };
            if (is_board_at(board, neighbor_coord)) {
                num += 1;
            }
        }
    }
    return num;
}
function influences_at(board, coord) {
    var influences = array(g_num_players, function (_) { return 0; });
    for (var dy = -1; dy <= +1; ++dy) {
        for (var dx = -1; dx <= +1; ++dx) {
            if (dx === 0 && dy === 0) {
                continue;
            }
            var neighbor_coord = { x: coord.x + dx, y: coord.y + dy };
            var neightbor_val = board_at(board, neighbor_coord);
            if (neightbor_val !== null) {
                influences[neightbor_val] += 1;
            }
        }
    }
    return influences;
}
// This piece of land can never be taken by anyone but...
function ruled_by(board, coord) {
    if (board[coord.y][coord.x] !== null) {
        return board[coord.y][coord.x];
    }
    var influences = influences_at(board, coord);
    for (var pi = 0; pi < g_num_players; ++pi) {
        if (influences[pi] > num_neighbors(board, coord) / 2) {
            // Player WILL win this, no matter what.
            return pi;
        }
    }
    return null;
}
// This piece of ground is by majority influenced by...
function claimed_by(board, coord) {
    if (board[coord.y][coord.x] !== null) {
        return board[coord.y][coord.x];
    }
    var influences = influences_at(board, coord);
    for (var player = 0; player < g_num_players; ++player) {
        var somebody_else_is_as_large = false;
        for (var other = 0; other < g_num_players; ++other) {
            if (player !== other && influences[other] >= influences[player]) {
                somebody_else_is_as_large = true;
            }
        }
        if (!somebody_else_is_as_large) {
            return player;
        }
    }
    return null;
}
function get_score(board) {
    var score = {
        certain: array(g_num_players, function (_) { return 0; }),
        claimed: array(g_num_players, function (_) { return 0; }),
        parities: 0
    };
    for (var y = 0; y < board.length; ++y) {
        for (var x = 0; x < board[y].length; ++x) {
            var ruler = ruled_by(board, { x: x, y: y });
            if (ruler !== null) {
                score.certain[ruler] += 1;
            }
            else {
                var claimer = claimed_by(board, { x: x, y: y });
                if (claimer !== null) {
                    score.claimed[claimer] += 1;
                }
                else {
                    score.parities += 1;
                }
            }
        }
    }
    return score;
}
function fill_in(old_board) {
    var new_board = make_board(old_board.length);
    for (var y = 0; y < old_board.length; ++y) {
        for (var x = 0; x < old_board[y].length; ++x) {
            new_board[y][x] = claimed_by(old_board, { x: x, y: y });
        }
    }
    return new_board;
}
function is_valid_move(board, coord, player) {
    if (coord === null) {
        return false;
    }
    if (coord.x < 0 || board[0].length <= coord.x) {
        return false;
    }
    if (coord.y < 0 || board.length <= coord.y) {
        return false;
    }
    if (board[coord.y][coord.x] !== null) {
        return false;
    }
    var influences = influences_at(board, coord);
    for (var i = 0; i < g_num_players; ++i) {
        if (influences[i] > influences[player]) {
            return false;
        }
    }
    return true;
}
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
function make_move(board, coord, player) {
    if (!is_valid_move(board, coord, player)) {
        return null;
    }
    board = clone(board);
    board[coord.y][coord.x] = player;
    if (game_over(board)) {
        board = fill_in(board);
    }
    return board;
}
var g_board = make_board(7);
var g_current_player = 0;
function start_game() {
    g_canvas.addEventListener("mousemove", function (evt) {
        var mouse_pos = get_mouse_pos(g_canvas, evt);
        var hovered = hovered_cell(g_board, mouse_pos);
        paint_board(g_canvas, g_board, hovered);
    }, false);
    g_canvas.addEventListener("mousedown", function (evt) {
        var mouse_pos = get_mouse_pos(g_canvas, evt);
        var hovered = hovered_cell(g_board, mouse_pos);
        try_make_move(hovered);
        if (g_current_player === 1) {
            make_ai_move();
        }
        paint_board(g_canvas, g_board, hovered);
    }, false);
    paint_board(g_canvas, g_board, null);
}
function try_make_move(coord) {
    var new_board = make_move(g_board, coord, g_current_player);
    if (new_board) {
        g_board = new_board;
        g_current_player = (g_current_player + 1) % g_num_players;
    }
}
export function make_ai_move() {
    var coord = ai_move(g_board, g_current_player);
    try_make_move(coord);
    paint_board(g_canvas, g_board, null);
}
window.make_ai_move = make_ai_move; // HACK
