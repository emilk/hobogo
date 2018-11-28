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

function ai_evaluate(board, player) {
  return wasm_bindgen.ai_evaluate(board_to_wasm(board), player_to_wasm(player));
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
  } else if (player === 1) {
    return "blue";
  } else {
    return `p${player}`;
  }
}

function player_color(player) {
    if (player === null) {
      return "#AAAAAA";
    } else if (player === 0) {
      return "#FF2222";
    } else {
      return "#3366FF";
    }
}

function cell_color(board, coord) {
  const owner = board_at(board, coord);
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

  const ruler = ruled_by(board, coord);
  if (ruler === null) {
    // We may not currently play here, but we might in the future!
    return "#444";
  } else {
    // We will never be able to play here:
    return "#222";
  }
}

const g_cell_size = 48;

function hovered_cell(board, mouse_pos) {
  for (let y = 0; y < board.length; ++y) {
    for (let x = 0; x < board[y].length; ++x) {
      const pad = 2;
      const left = x * g_cell_size + pad;
      const top = y * g_cell_size + pad;
      const right = (x + 1) * g_cell_size - pad;
      const bottom = (y + 1) * g_cell_size - pad;
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

const PAINT_INFLUENCE = true;

function paint_board(canvas, board, hovered) {
  const FONT = "monospace";

  board = make_move(board, hovered, g_current_player) || board; // PREVIEW!

  const context = canvas.getContext("2d");
  context.fillStyle = "#111111";
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < board.length; ++y) {
    for (let x = 0; x < board[y].length; ++x) {
      const pad = 2;
      const left = x * g_cell_size + pad;
      const top = y * g_cell_size + pad;
      const right = (x + 1) * g_cell_size - pad;
      const bottom = (y + 1) * g_cell_size - pad;

      context.fillStyle = cell_color(board, {x, y});
      context.fillRect(left, top, right - left, bottom - top);

      if (board[y][x] === null && PAINT_INFLUENCE) {
        const influences = influences_at(board, {x, y});
        if (g_num_players === 2) {
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
          for (let pi = 0; pi < g_num_players; ++pi) {
            for (let i = 0; i < influences[pi]; ++i) {
              const cx = left + g_cell_size * (1 + i) / 5;
              const cy = top + g_cell_size * (1 + pi) / (g_num_players + 1);

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

  {
    let y = board.length * g_cell_size + 16;
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
    context.fillText(`Score:`, 12, y);
    y += 16;

    const score = get_score(board);
    for (let pi = 0; pi < g_num_players; ++pi) {
      context.fillStyle = player_color(pi);
      context.fillText(`${player_name(pi)}: ${score.certain[pi]} (+ ${score.claimed[pi]} claimed)`, 12, y);
      y += 16;
    }
    context.fillStyle = "white";
    context.fillText(`parities: ${score.parities}`, 12, y);
    y += 16;
    y += 16;
    context.fillText(`AI advantages:`, 12, y);
    y += 16;

    for (let pi = 0; pi < g_num_players; ++pi) {
      const advantage = ai_evaluate(board, pi);
      context.fillStyle = player_color(pi);
      context.fillText(`${player_name(pi)}: ${advantage.toFixed(3)}`, 12, y);
      y += 16;
    }
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
const g_num_players = 2;

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
  const influences = array(g_num_players, (_) => 0);
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
  for (let pi = 0; pi < g_num_players; ++pi) {
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
  for (let player = 0; player < g_num_players; ++player) {
    let somebody_else_is_as_large = false;
    for (let other = 0; other < g_num_players; ++other) {
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
    certain: array(g_num_players, (_) => 0),
    claimed: array(g_num_players, (_) => 0),
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
  for (let i = 0; i < g_num_players; ++i) {
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

let g_board = make_board(7);
let g_current_player = 0;

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
    if (g_current_player === 1) {
      make_ai_move();
    }
    paint_board(g_canvas, g_board, hovered);
  }, false);

  paint_board(g_canvas, g_board, null);
}

function try_make_move(coord) {
    const new_board = make_move(g_board, coord, g_current_player);
    if (new_board) {
      g_board = new_board;
      g_current_player = (g_current_player + 1) % g_num_players;
    }
}

export function make_ai_move() {
  const coord = ai_move(g_board, g_current_player);
  try_make_move(coord);
  paint_board(g_canvas, g_board, null);
}

(window as any).make_ai_move = make_ai_move; // HACK
