use std::collections::VecDeque;

use emigui::{label, math::*, types::*, widgets::*, Align, Region, TextStyle};

use crate::hobogo::{Board, Coord, Player};

#[derive(Clone, Copy, Deserialize, PartialEq, Serialize)]
pub struct Settings {
    board_size: usize,
    num_humans: usize,
    num_bots: usize,
    humans_first: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            board_size: 9,
            num_humans: 1,
            num_bots: 1,
            humans_first: true,
        }
    }
}

impl Settings {
    fn num_players(&self) -> usize {
        (self.num_humans + self.num_bots) as usize
    }
}

#[derive(Clone, Deserialize, Serialize)]
pub struct State {
    settings: Settings,
    board: Board,
    next_player: Player,
}

impl State {
    fn new(settings: Settings) -> Self {
        let first_player = if settings.humans_first {
            0
        } else {
            settings.num_humans as Player
        };
        State {
            settings,
            board: Board::new(settings.board_size as i32, settings.board_size as i32),
            next_player: first_player,
        }
    }

    pub fn is_valid(&self) -> bool {
        self.settings.num_players() >= 2 && (self.next_player as usize) < self.num_players()
    }

    pub fn from_local_storage() -> Option<Self> {
        let state: Option<State> = emigui_wasm::local_storage_get("hobogo_state")
            .map(|s| serde_json::from_str(&s).ok())?;
        if let Some(state) = state {
            if state.is_valid() {
                return Some(state);
            }
        }
        None
    }

    pub fn save_to_local_storage(&self) -> bool {
        serde_json::to_string(&self)
            .map(|s| emigui_wasm::local_storage_set("hobogo_state", &s))
            .is_ok()
    }

    pub fn new_or_restore() -> Self {
        State::from_local_storage().unwrap_or_else(|| State::new(Settings::default()))
    }
}

#[derive(Clone, Deserialize, Serialize)]
pub struct App {
    state: State,

    #[serde(skip_serializing)]
    undo_stack: VecDeque<State>,
}

impl Default for App {
    fn default() -> Self {
        let settings = Settings::default();
        App {
            state: State::new(settings),
            undo_stack: Default::default(),
        }
    }
}

impl App {
    pub fn restore_or_new() -> Self {
        App {
            state: State::new_or_restore(),
            undo_stack: Default::default(),
        }
    }

    pub fn show_gui(&mut self, gui: &mut Region) {
        gui.add(label!("Hobogo: a board game").text_style(TextStyle::Heading));
        self.show_settings(gui);

        gui.vertical(Align::Center, |gui| {
            self.state.show_whos_next(gui);
        });

        let cmds = self.show_board_and_interact(gui);
        gui.add_paint_cmds(cmds);

        gui.columns(2, |cols| {
            if cols[0].add(Button::new("New Game")).clicked {
                if !self.state.board.is_empty() {
                    self.undo_stack.push_back(self.state.clone());
                }
                self.state = State::new(self.state.settings);
                self.state.save_to_local_storage();
            }
            if !self.undo_stack.is_empty() && cols[0].add(Button::new("Undo")).clicked {
                self.state = self.undo_stack.pop_back().unwrap();
            }
            self.state.show_standings(&mut cols[1]);
        });
    }

    fn show_settings(&mut self, gui: &mut Region) {
        let mut settings = self.state.settings;
        gui.columns(2, |cols| {
            cols[0].add(Slider::usize(&mut settings.num_humans, 0, 4).text("Humans"));
            cols[0].add(Slider::usize(&mut settings.num_bots, 0, 4).text("Bots"));
            cols[1].add(Slider::usize(&mut settings.board_size, 5, 17).text("Size"));
            cols[1]
                .add(Checkbox::new(&mut settings.humans_first, "Humans go first"))
                .tooltip_text("Going first is a big advantage");
        });

        while settings.num_players() < 2 {
            settings.num_humans += 1;
        }

        if settings != self.state.settings {
            if !self.state.board.is_empty() {
                self.undo_stack.push_back(self.state.clone());
            }
            self.state = State::new(settings);
            self.state.save_to_local_storage();
        }
    }

    fn show_board_and_interact(&mut self, gui: &mut Region) -> Vec<PaintCmd> {
        let board_id = gui.make_child_id(&"board");
        let size = gui.width() - 32.0; // Leave space for row numbers
        let board_interact = gui.reserve_space(vec2(size, size), Some(board_id));
        let rect = board_interact.rect;

        // HACK: Add some spacing for the column names
        gui.reserve_space(vec2(gui.width(), 32.0), None);

        let state = &mut self.state;

        if !state.board.is_game_over(state.num_players()) {
            if state.next_player_is_human() {
                if board_interact.hovered {
                    if let Some(mouse_pos) = gui.input().mouse_pos {
                        if let Some(hovered_coord) = hovered_coord(&state.board, &rect, mouse_pos) {
                            if state.board.is_valid_move(
                                hovered_coord,
                                state.next_player,
                                state.num_players(),
                            ) {
                                if board_interact.clicked {
                                    self.undo_stack.push_back(state.clone());
                                    state.board[hovered_coord] = Some(state.next_player);
                                    state.next_player =
                                        (state.next_player + 1) % (state.num_players() as u8);
                                    state.save_to_local_storage();
                                } else {
                                    let mut preview = state.clone();
                                    preview.board[hovered_coord] = Some(state.next_player);
                                    return preview.show_board(rect, gui);
                                }
                            }
                        }
                    }
                }
            } else {
                if gui.data().any_active() {
                    // Don't do anything slow while the user is e.g. dragging a slider
                } else {
                    // This is slow. TODO: run in background thread... when wasm supports it.
                    if let Some(coord) = state.board.ai_move(state.next_player, state.num_players())
                    {
                        state.board[coord] = Some(state.next_player);
                    }
                    state.next_player = (state.next_player + 1) % (state.num_players() as u8);
                }
            }
        }

        state.show_board(rect, gui)
    }
}

impl State {
    pub fn show_whos_next(&mut self, gui: &mut Region) {
        if self.board.is_game_over(self.num_players()) {
            gui.add(label!("Game over!"));
        } else {
            let player_color = player_color(self.next_player);
            let player_name = self.player_name(self.next_player);
            if self.next_player_is_human() {
                gui.add(label!("{} to play", player_name).text_color(player_color));
            } else {
                gui.add(label!("{} is thinking...", player_name).text_color(player_color));
            }
        }
    }

    pub fn show_standings(&mut self, gui: &mut Region) {
        gui.add(label!("Standings:"));
        gui.indent(|gui| {
            gui.columns(2, |cols| {
                let score = self.board.points();
                for pi in 0..self.num_players() {
                    let player_color = player_color(pi as Player);
                    let player_name = self.player_name(pi as Player);
                    cols[0].add(label!("{}", player_name).text_color(player_color));
                    cols[1].add(label!("{}", score[pi]).text_color(player_color));
                }
            });
        });
    }

    fn num_players(&self) -> usize {
        self.settings.num_players()
    }

    fn is_human(&self, player: Player) -> bool {
        (player as usize) < self.settings.num_humans
    }

    fn next_player_is_human(&self) -> bool {
        self.is_human(self.next_player) && !self.board.is_game_over(self.num_players())
    }

    fn player_name(&self, player: Player) -> String {
        let mut name = match player {
            0 => "yellow".to_string(),
            1 => "pink".to_string(),
            2 => "green".to_string(),
            3 => "purple".to_string(),
            i => i.to_string(),
        };

        if !self.is_human(player) {
            name += " (AI)";
        }

        name
    }

    fn show_board(&self, rect: Rect, gui: &mut Region) -> Vec<PaintCmd> {
        let board = &self.board;
        let spacing = rect.size.x / (board.width as f32);
        let volatile = board.volatile_cells(self.num_players());

        let mut cmds = vec![];

        if self.next_player_is_human() {
            // Highlight who is to play next
            cmds.push(PaintCmd::Rect {
                corner_radius: 16.0,
                fill_color: None,
                outline: Some(Outline {
                    width: 2.0,
                    color: player_color(self.next_player),
                }),
                rect,
            });
        }

        for c in board.coords() {
            let center = rect.pos + spacing * vec2(c.x as f32 + 0.5, c.y as f32 + 0.5);

            let is_volatile = volatile[board.index(c).unwrap()];
            let fill_color = Some(self.cell_color(c, is_volatile));

            if let Some(_player) = board[c] {
                let side = spacing * 0.84;
                cmds.push(PaintCmd::Rect {
                    corner_radius: side * 0.35,
                    fill_color,
                    outline: None,
                    rect: Rect::from_center_size(center, vec2(side, side)),
                });
            } else {
                cmds.push(PaintCmd::Circle {
                    center,
                    fill_color,
                    outline: None,
                    radius: 0.2 * spacing,
                });
            }
        }

        let text_color = srgba(100, 100, 100, 255);

        // Name chess column names:
        for x in 0..board.width {
            gui.floating_text(
                rect.pos + vec2((x as f32 + 0.5) * spacing, rect.height() + 4.0),
                &column_name(x),
                TextStyle::Body,
                (Align::Center, Align::Min),
                Some(text_color),
            );
        }

        // Name chess row names:
        for y in 0..board.height {
            gui.floating_text(
                rect.pos + vec2(rect.width() + 4.0, (y as f32 + 0.5) * spacing),
                &row_name(y),
                TextStyle::Body,
                (Align::Min, Align::Center),
                Some(text_color),
            );
        }

        cmds
    }

    fn cell_color(&self, c: Coord, is_volatile: bool) -> Color {
        let influence = self.board.influence(c);
        if let Some(claimer) = influence.player() {
            let color = player_color(claimer);
            if !is_volatile && !influence.is_occupied() {
                srgba(color.r, color.g, color.b, 127) // Transparent
            } else {
                color
            }
        } else {
            if self.next_player_is_human()
                && !self
                    .board
                    .is_valid_move(c, self.next_player, self.num_players())
            {
                // The currant human can't move here
                srgba(70, 70, 100, 255)
            } else {
                // Free (at least for some)
                srgba(130, 130, 150, 255)
            }
        }
    }
}

fn player_color(player: Player) -> Color {
    match player {
        // 0 => srgba(85, 119, 255, 255),
        // 1 => srgba(205, 0, 0, 255),
        // 2 => srgba(0, 255, 0, 255),
        // _ => srgba(221, 221, 0, 255),
        0 => srgba(239, 169, 0, 255),
        1 => srgba(242, 73, 117, 255),
        2 => srgba(31, 187, 171, 255),
        _ => srgba(121, 68, 219, 255),
    }
}

/// Chess coordinate name
fn column_name(x: i32) -> String {
    ((65 + (x as u8)) as char).to_string()
}

/// Chess coordinate name
fn row_name(y: i32) -> String {
    y.to_string()
}

fn hovered_coord(board: &Board, rect: &Rect, mouse_pos: Vec2) -> Option<Coord> {
    let spacing = rect.size.x / (board.width as f32);
    for c in board.coords() {
        let x = c.x as f32 * spacing + rect.pos.x;
        let y = c.y as f32 * spacing + rect.pos.y;
        let left = x;
        let top = y;
        let right = x + spacing;
        let bottom = y + spacing;
        let is_hovering = left <= mouse_pos.x
            && mouse_pos.x <= right
            && top <= mouse_pos.y
            && mouse_pos.y <= bottom;
        if is_hovering {
            return Some(c);
        }
    }
    None
}
