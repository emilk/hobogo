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
function ai_move(state) {
    return wasm_bindgen.ai_move(board_to_wasm(state.board), player_to_wasm(state.next_player), num_players(state));
}
function is_game_over(state) {
    return wasm_bindgen.game_over(board_to_wasm(state.board), num_players(state));
}
// ----------------------------------------------------------------------------
function player_name(state, player) {
    var name;
    if (player === 0) {
        name = "blue";
    }
    else if (player === 1) {
        name = "red";
    }
    else if (player === 2) {
        name = "green";
    }
    else if (player === 3) {
        name = "yellow";
    }
    else {
        name = "p" + player;
    }
    if (player >= state.settings.num_humans) {
        name += " (AI)";
    }
    return name;
}
function player_color(player) {
    if (player === null) {
        return "#AAAAAA";
    }
    if (player === 0) {
        return "#5577FF";
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
function cell_color(state, coord) {
    var claimer = claimed_by(state, coord);
    if (claimer !== null) {
        return player_color(claimer);
    }
    var is_human = state.next_player < state.settings.num_humans;
    if (is_human && !is_valid_move(state, coord, state.next_player)) {
        // The current human can´t move here.
        return "#555555";
    }
    return "#999999"; // Free (at least for some).
}
function calc_cell_size(board) {
    return 440 / board.length;
}
function hovered_cell(board, mouse_pos) {
    var cell_size = calc_cell_size(board);
    for (var y = 0; y < board.length; ++y) {
        for (var x = 0; x < board[y].length; ++x) {
            var pad = 2;
            var left = x * cell_size + pad;
            var top_1 = y * cell_size + pad;
            var right = (x + 1) * cell_size - pad;
            var bottom = (y + 1) * cell_size - pad;
            var is_hovering = left <= mouse_pos.x && mouse_pos.x <= right &&
                top_1 <= mouse_pos.y && mouse_pos.y <= bottom;
            if (is_hovering) {
                return { x: x, y: y };
            }
        }
    }
    return null;
}
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
// From https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
function rounded_rect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    return ctx;
}
function paint_board(canvas, state, hovered) {
    if (hovered !== null) {
        state = make_move(state, hovered, state.next_player) || state; // PREVIEW!
    }
    var board = state.board;
    var ctx = canvas.getContext("2d");
    ctx.font = "20px Palatino";
    ctx.fillStyle = "#111111";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cell_size = calc_cell_size(board);
    var PAINT_INFLUENCE_CONNECTIONS = false;
    for (var y = 0; y < board.length; ++y) {
        for (var x = 0; x < board[y].length; ++x) {
            if (board[y][x] === null && PAINT_INFLUENCE_CONNECTIONS) {
                for (var dy = -1; dy <= +1; ++dy) {
                    for (var dx = -1; dx <= +1; ++dx) {
                        if (dx === 0 && dy === 0) {
                            continue;
                        }
                        var neighbor_coord = { x: x + dx, y: y + dy };
                        var neightbor_val = board_at(board, neighbor_coord);
                        if (neightbor_val !== null) {
                            var color = player_color(neightbor_val);
                            color += "80"; // Transparent
                            ctx.beginPath();
                            ctx.lineWidth = 4;
                            ctx.strokeStyle = color;
                            ctx.moveTo((x + 0.5) * cell_size, (y + 0.5) * cell_size);
                            // const f = (dx * dy === 0) ? 0.45 : 0.38;
                            // const f = 1.0;
                            var f = 0.45 / Math.sqrt(dx * dx + dy * dy);
                            ctx.lineTo((x + dx * f + 0.5) * cell_size, (y + dy * f + 0.5) * cell_size);
                            ctx.stroke();
                        }
                    }
                }
            }
        }
    }
    for (var y = 0; y < board.length; ++y) {
        for (var x = 0; x < board[y].length; ++x) {
            var center_x = (x + 0.5) * cell_size;
            var center_y = (y + 0.5) * cell_size;
            ctx.fillStyle = cell_color(state, { x: x, y: y });
            if (board_at(board, { x: x, y: y }) === null) {
                var radius = 0.25 * cell_size;
                ctx.beginPath();
                ctx.arc(center_x, center_y, radius, 0, 2 * Math.PI, false);
                ctx.fill();
            }
            else {
                var hw = 0.42 * cell_size;
                var left = center_x - hw;
                var top_2 = center_y - hw;
                var right = center_x + hw;
                var bottom = center_y + hw;
                rounded_rect(ctx, left, top_2, 2 * hw, 2 * hw, 0.45 * hw).fill();
            }
            var PAINT_INFLUENCE_CIRCLES = false;
            if (board[y][x] === null && PAINT_INFLUENCE_CIRCLES) {
                for (var dy = -1; dy <= +1; ++dy) {
                    for (var dx = -1; dx <= +1; ++dx) {
                        if (dx === 0 && dy === 0) {
                            continue;
                        }
                        var neighbor_coord = { x: x + dx, y: y + dy };
                        var neightbor_val = board_at(board, neighbor_coord);
                        if (neightbor_val !== null) {
                            var color = player_color(neightbor_val);
                            color += "80"; // Transparent
                            var f = 0.40 / Math.sqrt(dx * dx + dy * dy);
                            var cx = (x + dx * f + 0.5) * cell_size;
                            var cy = (y + dy * f + 0.5) * cell_size;
                            var radius = 3;
                            ctx.beginPath();
                            ctx.arc(cx, cy, radius, 0, 2 * Math.PI, false);
                            ctx.fillStyle = color;
                            ctx.fill();
                        }
                    }
                }
            }
        }
    }
    // Columns: A, B, C, D, ...
    for (var x = 0; x < board[0].length; ++x) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("" + column_name(x), (x + 0.5) * cell_size, board.length * cell_size + 16);
        ctx.textAlign = "start";
    }
    // Rows: 1, 2, 3, ...
    for (var y = 0; y < board[0].length; ++y) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("" + row_name(y), board[0].length * cell_size + 12, (y + 0.5) * cell_size + 8);
        ctx.textAlign = "start";
    }
    {
        var LINES_SPACING = 32;
        var y = board.length * cell_size + 64;
        if (is_game_over(state)) {
            ctx.fillStyle = "white";
            ctx.fillText("GAME OVER", 12, y);
        }
        else {
            ctx.fillStyle = player_color(state.next_player);
            ctx.fillText(player_name(state, state.next_player) + " to play", 12, y);
        }
        y += 1.5 * LINES_SPACING;
        ctx.fillStyle = "white";
        ctx.fillText("Standings:", 12, y);
        y += LINES_SPACING;
        var score = get_score(state);
        for (var pi = 0; pi < num_players(state); ++pi) {
            ctx.fillStyle = player_color(pi);
            ctx.fillText("" + player_name(state, pi), 12, y);
            ctx.textAlign = "end";
            ctx.fillText("" + score[pi], 200, y);
            ctx.textAlign = "start";
            y += LINES_SPACING;
        }
        ctx.fillStyle = "white";
    }
}
function get_mouse_pos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}
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
function influences_at(state, coord) {
    var influences = array(num_players(state), function (_) { return 0; });
    for (var dy = -1; dy <= +1; ++dy) {
        for (var dx = -1; dx <= +1; ++dx) {
            if (dx === 0 && dy === 0) {
                continue;
            }
            var neighbor_coord = { x: coord.x + dx, y: coord.y + dy };
            var neightbor_val = board_at(state.board, neighbor_coord);
            if (neightbor_val !== null) {
                influences[neightbor_val] += 1;
            }
        }
    }
    return influences;
}
// This piece of ground is by majority influenced by...
function claimed_by(state, coord) {
    var board = state.board;
    if (board[coord.y][coord.x] !== null) {
        return board[coord.y][coord.x];
    }
    var influences = influences_at(state, coord);
    for (var player = 0; player < num_players(state); ++player) {
        var somebody_else_is_as_large = false;
        for (var other = 0; other < num_players(state); ++other) {
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
function get_score(state) {
    var score = array(num_players(state), function (_) { return 0; });
    var board = state.board;
    for (var y = 0; y < board.length; ++y) {
        for (var x = 0; x < board[y].length; ++x) {
            var claimer = claimed_by(state, { x: x, y: y });
            if (claimer !== null) {
                score[claimer] += 1;
            }
        }
    }
    return score;
}
function is_valid_move(state, coord, player) {
    var board = state.board;
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
    var influences = influences_at(state, coord);
    for (var i = 0; i < num_players(state); ++i) {
        if (influences[i] > influences[player]) {
            return false;
        }
    }
    return true;
}
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
function make_move(state, coord, player) {
    var is_pass = (coord.x === -1 && coord.y === -1);
    if (!is_pass && !is_valid_move(state, coord, player)) {
        return null;
    }
    var new_state = clone(state);
    if (!is_pass) {
        new_state.board[coord.y][coord.x] = player;
    }
    new_state.next_player = (new_state.next_player + 1) % num_players(state);
    return new_state;
}
function num_players(state) {
    return state.settings.num_humans + state.settings.num_cpus;
}
// ----------------------------------------------------------------------------
var g_canvas = document.getElementById("hobo_canvas");
var g_state = {
    board: make_board(7),
    next_player: 0,
    settings: {
        board_size: 7,
        num_cpus: 1,
        num_humans: 1
    }
};
function start_game() {
    g_canvas.addEventListener("mousemove", function (evt) {
        var mouse_pos = get_mouse_pos(g_canvas, evt);
        var hovered = hovered_cell(g_state.board, mouse_pos);
        paint_board(g_canvas, g_state, hovered);
    }, false);
    g_canvas.addEventListener("mousedown", function (evt) {
        var mouse_pos = get_mouse_pos(g_canvas, evt);
        var hovered = hovered_cell(g_state.board, mouse_pos);
        try_make_move(hovered);
    }, false);
    paint_board(g_canvas, g_state, null);
}
function try_make_move(coord) {
    var new_state = make_move(g_state, coord, g_state.next_player);
    if (new_state) {
        g_state = new_state;
        paint_board(g_canvas, g_state, null);
        if (g_state.next_player >= g_state.settings.num_humans) {
            setTimeout(make_ai_move, 100);
        }
    }
    else {
        console.error("Cannot make move at " + coord_name(coord) + " for player " + player_name(g_state, g_state.next_player));
    }
}
function make_ai_move() {
    var coord = ai_move(g_state);
    console.info("AI " + player_name(g_state, g_state.next_player) + ": " + coord_name(coord));
    try_make_move(coord);
    paint_board(g_canvas, g_state, null);
}
export function on_size_change(size) {
    g_state.settings.board_size = size;
    document.getElementById("size_label").innerHTML = "Size: " + size + "x" + size;
    new_game();
}
export function on_humans_change(humans) {
    document.getElementById("humans_label").innerHTML = "Humans: " + humans;
    g_state.settings.num_humans = humans;
}
export function on_cpus_change(cpus) {
    document.getElementById("cpus_label").innerHTML = "Bots: " + cpus;
    g_state.settings.num_cpus = cpus;
}
export function new_game() {
    var board_size = g_state.settings.board_size;
    g_state.board = make_board(board_size);
    g_state.next_player = 0;
    paint_board(g_canvas, g_state, null);
    if (g_state.settings.num_humans === 0) {
        make_ai_move();
    }
}
document.on_size_change = on_size_change; // HACK
document.on_humans_change = on_humans_change; // HACK
document.on_cpus_change = on_cpus_change; // HACK
document.new_game = new_game; // HACK
