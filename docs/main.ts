// the `wasm_bindgen` global is set to the exports of the Rust module. Override with wasm-bindgen --no-modules-global
declare var wasm_bindgen: any;

// we'll defer our execution until the wasm is ready to go
function wasm_loaded() {
  console.log(`wasm loaded`);
  start_game();
}

// here we tell bindgen the path to the wasm file so it can start
// initialization and return to us a promise when it's done
wasm_bindgen("./hobogo_bg.wasm")
  .then(wasm_loaded)
  .catch(console.error);

function player_to_wasm(player) {
  return player === null ? -1 : player;
}

function board_to_wasm(board) {
  const wasm_board = new Int8Array(board.length * board[0].length);
  let i = 0;
  for (const row of board) {
    for (const cell of row) {
      wasm_board[i++] = player_to_wasm(cell);
    }
  }
  return wasm_board;
}

function ai_move(board, player: number) {
  return wasm_bindgen.ai_move(board_to_wasm(board), player_to_wasm(player), num_players());
}

function game_over(board) {
  return wasm_bindgen.game_over(board_to_wasm(board), num_players());
}

// ----------------------------------------------------------------------------

function player_name(player: number): string {
  let name;
  if (player === 0) {
    name = "blue  ";
  } else if (player === 1) {
    name = "red   ";
  } else if (player === 2) {
    name = "green ";
  } else if (player === 3) {
    name = "yellow";
  } else {
    name = `p${player}    `;
  }

  if (player < g_num_humans) {
    name += "     ";
  } else {
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
  } else if (player === 1) {
    return "#FF0000";
  } else if (player === 2) {
    return "#00FF00";
  } else {
     return "#DDDD00";
   }
}

// blendColors from https://stackoverflow.com/a/13542669
function blend_hex_colors(c0, c1, p) {
    const f = parseInt(c0.slice(1), 16);
    const t = parseInt(c1.slice(1), 16);
    const R1 = f >> 16;
    const G1 = f >> 8 & 0x00FF;
    const B1 = f & 0x0000FF;
    const R2 = t >> 16;
    const G2 = t >> 8 & 0x00FF;
    const B2 = t & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((R2 - R1) * p) + R1) * 0x10000 +
                  (Math.round((G2 - G1) * p) + G1) * 0x100 +
                  (Math.round((B2 - B1) * p) + B1)).toString(16).slice(1);
}

function cell_color(board, coord) {
  const owner = board_at(board, coord);
  if (owner !== null) {
    return player_color(owner);
  }

  const ruler = ruled_by(board, coord);
  if (ruler !== null) {
    return blend_hex_colors("#333333", player_color(ruler), 0.3);
  }

  const claimer = claimed_by(board, coord);
  if (claimer !== null) {
    return blend_hex_colors("#666666", player_color(claimer), 0.3);
  }

  const is_ai = g_current_player >= g_num_humans;
  if (!is_ai && !is_valid_move(board, coord, g_current_player)) {
    // The current human can´t move here.
    return "#666666";
  }

  return "#999999"; // Free (at least for some).
}

function calc_cell_size(board) {
  return 440 / board.length;
}

function hovered_cell(board, mouse_pos) {
  const cell_size = calc_cell_size(board);
  for (let y = 0; y < board.length; ++y) {
    for (let x = 0; x < board[y].length; ++x) {
      const pad = 2;
      const left = x * cell_size + pad;
      const top = y * cell_size + pad;
      const right = (x + 1) * cell_size - pad;
      const bottom = (y + 1) * cell_size - pad;
      const is_hovering =
        left <= mouse_pos.x && mouse_pos.x <= right &&
        top <= mouse_pos.y && mouse_pos.y <= bottom;
      if (is_hovering) {
        return {x, y};
      }
    }
  }
  return null;
}

const PAINT_INFLUENCE = false;

function column_name(x: number): string {
  return String.fromCharCode(x + 65);
}

function row_name(y: number): string {
  return `${y + 1}`;
}

// Chess name:
function coord_name(coord): string {
  return `${column_name(coord.x)}${row_name(coord.y)}`;
}

// From https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
function rounded_rect(ctx, x: number, y: number, width: number, height: number, radius: number) {
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

function paint_board(canvas, board, hovered) {
  const FONT = "monospace";

  if (hovered !== null) {
    board = make_move(board, hovered, g_current_player) || board; // PREVIEW!
  }

  const context = canvas.getContext("2d");
  context.fillStyle = "#111111";
  context.clearRect(0, 0, canvas.width, canvas.height);

  const cell_size = calc_cell_size(board);

  for (let y = 0; y < board.length; ++y) {
    for (let x = 0; x < board[y].length; ++x) {
      const center_x = (x + 0.5) * cell_size;
      const center_y = (y + 0.5) * cell_size;

      const hw = 0.5 * cell_size * (board_at(board, {x, y}) === null ? 0.7 : 0.85);
      const left = center_x - hw;
      const top = center_y - hw;
      const right = center_x + hw;
      const bottom = center_y + hw;

      context.fillStyle = cell_color(board, {x, y});
      rounded_rect(context, left, top, 2 * hw, 2 * hw, 0.45 * hw).fill();

      if (board[y][x] === null && PAINT_INFLUENCE) {
        const influences = influences_at(board, {x, y});
        if (num_players() === 2) {
          if (influences[0] !== influences[1]) {
            const font_size = 10;
            context.font = `${font_size}pt ${FONT}`;
            const player = influences[0] > influences[1] ? 0 : 1;
            const text =
              (influences[player] > num_neighbors(board, {x, y}) / 2) ? "X"
              : `${Math.abs(influences[player] - influences[1 - player])}`;
            context.fillStyle = player_color(player);
            context.fillText(text, (left + right) / 2 - font_size / 2, (top + bottom) / 2 + font_size / 2);
          }
        } else {
          for (let pi = 0; pi < num_players(); ++pi) {
            for (let i = 0; i < influences[pi]; ++i) {
              const cx = left + cell_size * (1 + i) / 5;
              const cy = top + cell_size * (1 + pi) / (num_players() + 1);

              const radius = 4;
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
  for (let x = 0; x < board[0].length; ++x) {
    context.font = `12pt ${FONT}`;
    context.fillStyle = "white";
    context.fillText(`${column_name(x)}`, (x + 0.5) * cell_size - 6, board.length * cell_size + 12);
  }

  // Rows: 1, 2, 3, ...
  for (let y = 0; y < board[0].length; ++y) {
    context.font = `12pt ${FONT}`;
    context.fillStyle = "white";
    context.fillText(`${row_name(y)}`, board[0].length * cell_size + 12, (y + 0.5) * cell_size + 6);
  }

  {
    let y = board.length * cell_size + 64;
    context.font = `12pt ${FONT}`;
    if (game_over(board)) {
      context.fillStyle = "white";
      context.fillText(`GAME OVER`, 12, y);
    } else {
      context.fillStyle = player_color(g_current_player);
      context.fillText(`Current player: ${player_name(g_current_player)}`, 12, y);
    }
    y += 16;
    y += 16;

    context.fillStyle = "white";
    context.fillText(`Current standing:`, 12, y);
    y += 16;

    const score = get_score(board);
    for (let pi = 0; pi < num_players(); ++pi) {
      context.fillStyle = player_color(pi);
      context.fillText(`${player_name(pi)}: ${score.certain[pi] + score.claimed[pi]}`, 12, y);
      y += 16;
    }
    context.fillStyle = "white";
  }
}

function get_mouse_pos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

const g_canvas = document.getElementById("hobo_canvas");

function array(n, value_maker) {
  const board = [];
  for (let i = 0; i < n; ++i) {
    board.push(value_maker(i));
  }
  return board;
}

function make_board(n) {
  return array(n, (_) => array(n, (__) => null));
}

function is_board_at(board, coord) {
  if (coord.x < 0 || board[0].length <= coord.x) { return false; }
  if (coord.y < 0 || board.length <= coord.y) { return false; }
  return true;
}

function board_at(board, coord) {
  return is_board_at(board, coord) ? board[coord.y][coord.x] : null;
}

function num_neighbors(board, coord) {
  let num = 0;
  for (let dy = -1; dy <= +1; ++dy) {
    for (let dx = -1; dx <= +1; ++dx) {
      if (dx === 0 && dy === 0) { continue; }
      const neighbor_coord = {x: coord.x + dx, y: coord.y + dy};
      if (is_board_at(board, neighbor_coord)) {
        num += 1;
      }
    }
  }
  return num;
}

function influences_at(board, coord) {
  const influences = array(num_players(), (_) => 0);
  for (let dy = -1; dy <= +1; ++dy) {
    for (let dx = -1; dx <= +1; ++dx) {
      if (dx === 0 && dy === 0) { continue; }
      const neighbor_coord = {x: coord.x + dx, y: coord.y + dy};
      const neightbor_val = board_at(board, neighbor_coord);
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

  const influences = influences_at(board, coord);
  for (let pi = 0; pi < num_players(); ++pi) {
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

  const influences = influences_at(board, coord);
  for (let player = 0; player < num_players(); ++player) {
    let somebody_else_is_as_large = false;
    for (let other = 0; other < num_players(); ++other) {
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
  const score = {
    certain: array(num_players(), (_) => 0),
    claimed: array(num_players(), (_) => 0),
    parities: 0,
  };

  for (let y = 0; y < board.length; ++y) {
    for (let x = 0; x < board[y].length; ++x) {
      const ruler = ruled_by(board, {x, y});
      if (ruler !== null) {
        score.certain[ruler] += 1;
      } else {
        const claimer = claimed_by(board, {x, y});
        if (claimer !== null) {
          score.claimed[claimer] += 1;
        } else {
          score.parities += 1;
        }
      }
    }
  }

  return score;
}

function fill_in(old_board) {
  const new_board = make_board(old_board.length);
  for (let y = 0; y < old_board.length; ++y) {
    for (let x = 0; x < old_board[y].length; ++x) {
      new_board[y][x] = claimed_by(old_board, {x, y});
    }
  }
  return new_board;
}

function is_valid_move(board, coord, player) {
  if (coord === null) { return false; }
  if (coord.x < 0 || board[0].length <= coord.x) { return false; }
  if (coord.y < 0 || board.length <= coord.y) { return false; }
  if (board[coord.y][coord.x] !== null) { return false; }

  const influences = influences_at(board, coord);
  for (let i = 0; i < num_players(); ++i) {
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
  const is_pass = (coord.x === -1 && coord.y === -1);
  if (is_pass) { return clone(board); }

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

let g_board_size = 7;
let g_board = make_board(g_board_size);
let g_current_player = 0;
let g_num_humans = 1;
let g_num_cpus = 1;

function num_players() {
  return g_num_humans + g_num_cpus;
}

function start_game() {
  g_canvas.addEventListener("mousemove", (evt) => {
    const mouse_pos = get_mouse_pos(g_canvas, evt);
    const hovered = hovered_cell(g_board, mouse_pos);
    paint_board(g_canvas, g_board, hovered);
  }, false);

  g_canvas.addEventListener("mousedown", (evt) => {
    const mouse_pos = get_mouse_pos(g_canvas, evt);
    const hovered = hovered_cell(g_board, mouse_pos);
    try_make_move(hovered);
  }, false);

  paint_board(g_canvas, g_board, null);
}

function try_make_move(coord) {
    const new_board = make_move(g_board, coord, g_current_player);
    if (new_board) {
      g_board = new_board;
      g_current_player = (g_current_player + 1) % num_players();
      paint_board(g_canvas, g_board, null);
      if (g_current_player >= g_num_humans) {
        setTimeout(make_ai_move, 100);
      }
    } else {
      console.error(`Cannot make move at ${coord_name(coord)} for player ${player_name(g_current_player)}`);
    }
}

function make_ai_move() {
  const coord = ai_move(g_board, g_current_player);
  console.info(`AI ${player_name(g_current_player)}: ${coord_name(coord)}`);
  try_make_move(coord);
  paint_board(g_canvas, g_board, null);
}

export function on_size_change(size: number) {
  g_board_size = size;
  document.getElementById("size_label").innerHTML = `Size: ${size}x${size}`;
  new_game();
}

export function on_humans_change(humans: number) {
  document.getElementById("humans_label").innerHTML = `Humans: ${humans}`;
  g_num_humans = humans;
}

export function on_cpus_change(cpus: number) {
  document.getElementById("cpus_label").innerHTML = `Bots: ${cpus}`;
  g_num_cpus = cpus;
}

export function new_game() {
  console.log(`Starting new ${g_board_size}x${g_board_size} game with ${g_num_humans} and  ${g_num_cpus} cpus.`);
  g_board = make_board(g_board_size);
  g_current_player = 0;
  paint_board(g_canvas, g_board, null);
  if (g_num_humans === 0) {
    make_ai_move();
  }
}

(document as any).on_size_change = on_size_change; // HACK
(document as any).on_humans_change = on_humans_change; // HACK
(document as any).on_cpus_change = on_cpus_change; // HACK
(document as any).new_game = new_game; // HACK
