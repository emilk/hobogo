// import * as hobogo from './pkg/hobogo';

function player_name(player) {
  if (player === 0) {
    return "red";
  } else if (player == 1) {
    return "blue";
  } else {
    return `p${player}`;
  }
}

function player_color(player) {
    if (player === null) {
      return "#AAAAAA";
    } else if (player === 0) {
      return "#DD0000";
    } else {
      return "#5555FF";
    }
}

function cell_color(board, coord, is_hovering)
{
  const owner = board_at(board, coord);
  if (owner !== null) {
    return player_color(owner);
  }

  if (is_hovering && is_valid_move(board, coord, g_current_player)) {
    // TODO: proper preview
    return player_color(g_current_player);
  }

  if (is_valid_move(board, coord, g_current_player)) {
    return "#AAAAAA";
  }

  const ruler = ruled_by(board, coord);
  if (ruler === null) {
    // We may not currently play here, but we might in the future!
    return "#666666";
  } else {
    // We will never be able to play here:
    return "#444444";
  }
}

function paint_board(canvas, board, mouse_pos) {
  const message = 'Mouse position: ' + mouse_pos.x + ',' + mouse_pos.y;

  const context = canvas.getContext('2d');
  context.fillStyle = "#111111";
  context.clearRect(0, 0, canvas.width, canvas.height);

  const cell_size = 48;

  let hovered = null;

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
        hovered = {x, y};
      }

      context.fillStyle = player_color(board[y][x]);
      context.fillRect(left, top, right - left, bottom - top);

      context.fillStyle = cell_color(board, {x,y}, is_hovering);
      context.fillRect(left, top, right - left, bottom - top);

      // if (is_valid_move(board, {x,y}, g_current_player)) {
      //   const lw = 4;
      //   context.beginPath();
      //   context.rect(left - lw / 2, top - lw / 2, right - left + lw, bottom - top + lw);
      //   context.lineWidth = lw;
      //   context.strokeStyle = player_color(g_current_player);
      //   context.stroke();
      // }

      if (board[y][x] === null) {
        const influences = influences_at(board, {x, y});
        if (g_num_players == 2) {
          if (influences[0] != influences[1]) {
            const font_size = 14;
            context.font = `${font_size}pt Calibri`;
            const player = influences[0] > influences[1] ? 0 : 1;
            const text =
              (influences[player] > num_neighbors(board, {x,y}) / 2) ? 'X'
              : `${Math.abs(influences[player] - influences[1 - player])}`;
            context.fillStyle = player_color(player);
            context.fillText(text, (left + right) / 2 - font_size / 2, (top + bottom) / 2 + font_size / 2);
          }
        } else {
          for (let pi = 0; pi < g_num_players; ++pi) {
            for (let i = 0; i < influences[pi]; ++i) {
              const cx = left + cell_size * (1 + i) / 5;
              const cy = top + cell_size * (1 + pi) / (g_num_players + 1);

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

  let y = board.length * cell_size + 16;
  context.font = '12pt Calibri';
  context.fillStyle = player_color(g_current_player);
  // context.fillText(`5 + 3 = ${emil_add(5, 4)}`, 10, 25);
  context.fillText(`Current player: ${player_name(g_current_player)}`, 12, y);
  y += 16;
  y += 16;

  context.fillStyle = 'white';
  context.fillText(`Score:`, 12, y);
  y += 16;

  const s = score(board);
  for (let pi = 0; pi < g_num_players; ++pi) {
    context.fillStyle = player_color(pi);
    context.fillText(`${player_name(pi)}: ${s.certain[pi]}`, 12, y);
    y += 16;
  }
  context.fillStyle = 'white';
  context.fillText(`Uncertain: ${s.uncertain}`, 12, y);
  y += 16;

  return hovered;
}

function get_mouse_pos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

const g_canvas = document.getElementById('hobo_canvas');
const g_num_players = 2;

function array(n, value_maker) {
  let board = [];
  for (let i = 0; i < n; ++i) {
    board.push(value_maker(i));
  }
  return board;
}

function new_board(n) {
  return array(n, (_) => array(n, (_) => null));
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
  let num_neighbors = 0;
  for (let dy = -1; dy <= +1; ++dy) {
    for (let dx = -1; dx <= +1; ++dx) {
      if (dx == 0 && dy == 0) { continue; }
      let neighbor_coord = {x: coord.x + dx, y: coord.y + dy};
      if (is_board_at(board, neighbor_coord)) {
        num_neighbors += 1;
      }
    }
  }
  return num_neighbors;
}

function influences_at(board, coord) {
  let influences = array(g_num_players, (_) => 0);
  for (let dy = -1; dy <= +1; ++dy) {
    for (let dx = -1; dx <= +1; ++dx) {
      if (dx == 0 && dy == 0) { continue; }
      let neighbor_coord = {x: coord.x + dx, y: coord.y + dy};
      const neightbor_val = board_at(board, neighbor_coord);
      if (neightbor_val !== null) {
        influences[neightbor_val] += 1;
      }
    }
  }
  return influences;
}

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

function score(board) {
  let score = {
    certain: array(g_num_players, (_) => 0),
    uncertain: 0,
  };

  for (let y = 0; y < board.length; ++y) {
    for (let x = 0; x < board[y].length; ++x) {
      const player = ruled_by(board, {x,y});
      if (player === null) {
        score.uncertain += 1;
      } else {
        score.certain[player] += 1;
      }
    }
  }

  return score;
}

function is_valid_move(board, coord, player) {
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

let g_board = new_board(7);
let g_current_player = 0;

g_canvas.addEventListener('mousemove', function(evt) {
  const mouse_pos = get_mouse_pos(g_canvas, evt);
  paint_board(g_canvas, g_board, mouse_pos);
}, false);

g_canvas.addEventListener('mousedown', function(evt) {
  const mouse_pos = get_mouse_pos(g_canvas, evt);
  const hovered = paint_board(g_canvas, g_board, mouse_pos);
  if (hovered !== null && is_valid_move(g_board, hovered, g_current_player)) {
    g_board[hovered.y][hovered.x] = g_current_player;
    g_current_player = (g_current_player + 1) % g_num_players;
  }
  paint_board(g_canvas, g_board, mouse_pos);
}, false);

paint_board(g_canvas, g_board, {x: 0, y: 0});
