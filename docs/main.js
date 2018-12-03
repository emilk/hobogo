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
    return wasm_bindgen.ai_move(board_to_wasm(board), player_to_wasm(player), num_players());
}
function game_over(board) {
    return wasm_bindgen.game_over(board_to_wasm(board), num_players());
}
// ----------------------------------------------------------------------------
function player_name(player) {
    var name;
    if (player === 0) {
        name = "blue  ";
    }
    else if (player === 1) {
        name = "red   ";
    }
    else if (player === 2) {
        name = "green ";
    }
    else if (player === 3) {
        name = "yellow";
    }
    else {
        name = "p" + player + "    ";
    }
    if (player < g_num_humans) {
        name += " (human)";
    }
    else {
        name += " (AI)   ";
    }
    return name;
}
function player_color(player) {
    if (player === null) {
        return "#AAAAAA";
    }
    if (player === 0) {
        return "#6666FF";
    }
    else if (player === 1) {
        return "#FF0000";
    }
    else if (player === 2) {
        return "#00FF00";
    }
    else {
        return "#DDDD00";
    }
}
// blendColors from https://stackoverflow.com/a/13542669
function blend_hex_colors(c0, c1, p) {
    var f = parseInt(c0.slice(1), 16);
    var t = parseInt(c1.slice(1), 16);
    var R1 = f >> 16;
    var G1 = f >> 8 & 0x00FF;
    var B1 = f & 0x0000FF;
    var R2 = t >> 16;
    var G2 = t >> 8 & 0x00FF;
    var B2 = t & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((R2 - R1) * p) + R1) * 0x10000 +
        (Math.round((G2 - G1) * p) + G1) * 0x100 +
        (Math.round((B2 - B1) * p) + B1)).toString(16).slice(1);
}
function cell_color(board, coord) {
    var owner = board_at(board, coord);
    if (owner !== null) {
        return player_color(owner);
    }
    var ruler = ruled_by(board, coord);
    if (ruler !== null) {
        return blend_hex_colors("#333333", player_color(ruler), 0.2);
    }
    var claimer = claimed_by(board, coord);
    if (claimer !== null) {
        return blend_hex_colors("#555555", player_color(claimer), 0.2);
    }
    var is_ai = g_current_player >= g_num_humans;
    if (!is_ai && !is_valid_move(board, coord, g_current_player)) {
        // The current human can´t move here.
        return "#555555";
    }
    return "#888888"; // Free (at least for some).
    // const is_ai = g_current_player >= g_num_humans;
    // if (is_ai || is_valid_move(board, coord, g_current_player)) {
    //   return "#777";
    // }
    // if (ruled_by(board, coord) !== null) {
    //   return "#222"; // Locked in, can´t change color. TODO: TINT?
    // }
    // // We may not currently play here, but we might in the future!
    // return "#444";
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
var PAINT_INFLUENCE = false;
function column_name(x) {
    return String.fromCharCode(x + 65);
}
function row_name(y) {
    return "" + (y + 1);
}
// Chess name:
function coord_name(coord) {
    return "" + column_name(coord.x) + row_name(coord.y);
}
function paint_board(canvas, board, hovered) {
    var FONT = "monospace";
    if (hovered !== null) {
        board = make_move(board, hovered, g_current_player) || board; // PREVIEW!
    }
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
                if (num_players() === 2) {
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
                    for (var pi = 0; pi < num_players(); ++pi) {
                        for (var i = 0; i < influences[pi]; ++i) {
                            var cx = left + g_cell_size * (1 + i) / 5;
                            var cy = top_2 + g_cell_size * (1 + pi) / (num_players() + 1);
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
        context.fillText("" + column_name(x), (x + 0.5) * g_cell_size - 6, board.length * g_cell_size + 12);
    }
    // Rows: 1, 2, 3, ...
    for (var y = 0; y < board[0].length; ++y) {
        context.font = "12pt " + FONT;
        context.fillStyle = "white";
        context.fillText("" + row_name(y), board[0].length * g_cell_size + 12, (y + 0.5) * g_cell_size);
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
        for (var pi = 0; pi < num_players(); ++pi) {
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
    var influences = array(num_players(), function (_) { return 0; });
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
    for (var pi = 0; pi < num_players(); ++pi) {
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
    for (var player = 0; player < num_players(); ++player) {
        var somebody_else_is_as_large = false;
        for (var other = 0; other < num_players(); ++other) {
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
        certain: array(num_players(), function (_) { return 0; }),
        claimed: array(num_players(), function (_) { return 0; }),
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
    for (var i = 0; i < num_players(); ++i) {
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
    var is_pass = (coord.x === -1 && coord.y === -1);
    if (is_pass) {
        return clone(board);
    }
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
var g_board_size = 7;
var g_board = make_board(g_board_size);
var g_current_player = 0;
var g_num_humans = 1;
var g_num_cpus = 1;
function num_players() {
    return g_num_humans + g_num_cpus;
}
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
    }, false);
    paint_board(g_canvas, g_board, null);
}
function try_make_move(coord) {
    var new_board = make_move(g_board, coord, g_current_player);
    if (new_board) {
        g_board = new_board;
        g_current_player = (g_current_player + 1) % num_players();
        paint_board(g_canvas, g_board, null);
        if (g_current_player >= g_num_humans) {
            setTimeout(make_ai_move, 100);
        }
    }
    else {
        console.error("Cannot make move at " + coord_name(coord) + " for player " + player_name(g_current_player));
    }
}
function make_ai_move() {
    var coord = ai_move(g_board, g_current_player);
    console.info("AI " + player_name(g_current_player) + ": " + coord_name(coord));
    try_make_move(coord);
    paint_board(g_canvas, g_board, null);
}
export function on_size_change(size) {
    g_board_size = size;
    document.getElementById("size_label").innerHTML = "Size: " + size + "x" + size;
    new_game();
}
export function on_humans_change(humans) {
    document.getElementById("humans_label").innerHTML = "Number of human players: " + humans;
    g_num_humans = humans;
}
export function on_cpus_change(cpus) {
    document.getElementById("cpus_label").innerHTML = "Number of AI players: " + cpus;
    g_num_cpus = cpus;
}
export function new_game() {
    console.log("Starting new " + g_board_size + "x" + g_board_size + " game with " + g_num_humans + " and  " + g_num_cpus + " cpus.");
    g_board = make_board(g_board_size);
    g_current_player = 0;
    paint_board(g_canvas, g_board, null);
    if (g_num_humans === 0) {
        make_ai_move();
    }
}
document.on_size_change = on_size_change; // HACK
document.on_humans_change = on_humans_change; // HACK
document.on_cpus_change = on_cpus_change; // HACK
document.new_game = new_game; // HACK
