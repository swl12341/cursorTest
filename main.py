import sys
import random
import pygame


# Grid configuration
GRID_COLS = 10
GRID_ROWS = 20
CELL_SIZE = 32  # pixels
SIDEBAR_WIDTH = 8  # cells

WINDOW_WIDTH = (GRID_COLS + SIDEBAR_WIDTH) * CELL_SIZE
WINDOW_HEIGHT = GRID_ROWS * CELL_SIZE
FPS = 60


# Colors
BLACK = (0, 0, 0)
WHITE = (245, 245, 245)
GRAY = (40, 40, 40)
LIGHT_GRAY = (80, 80, 80)

COLORS = {
    'I': (0, 228, 255),
    'J': (0, 102, 255),
    'L': (255, 148, 0),
    'O': (255, 203, 0),
    'S': (0, 204, 102),
    'T': (170, 0, 255),
    'Z': (255, 51, 51),
}


# Tetromino definitions in 4x4 matrices
TETROMINO_SHAPES = {
    'I': [
        [[0, 0, 0, 0],
         [1, 1, 1, 1],
         [0, 0, 0, 0],
         [0, 0, 0, 0]],
        [[0, 0, 1, 0],
         [0, 0, 1, 0],
         [0, 0, 1, 0],
         [0, 0, 1, 0]],
    ],
    'J': [
        [[1, 0, 0],
         [1, 1, 1],
         [0, 0, 0]],
        [[0, 1, 1],
         [0, 1, 0],
         [0, 1, 0]],
        [[0, 0, 0],
         [1, 1, 1],
         [0, 0, 1]],
        [[0, 1, 0],
         [0, 1, 0],
         [1, 1, 0]],
    ],
    'L': [
        [[0, 0, 1],
         [1, 1, 1],
         [0, 0, 0]],
        [[0, 1, 0],
         [0, 1, 0],
         [0, 1, 1]],
        [[0, 0, 0],
         [1, 1, 1],
         [1, 0, 0]],
        [[1, 1, 0],
         [0, 1, 0],
         [0, 1, 0]],
    ],
    'O': [
        [[1, 1],
         [1, 1]],
    ],
    'S': [
        [[0, 1, 1],
         [1, 1, 0],
         [0, 0, 0]],
        [[0, 1, 0],
         [0, 1, 1],
         [0, 0, 1]],
    ],
    'T': [
        [[0, 1, 0],
         [1, 1, 1],
         [0, 0, 0]],
        [[0, 1, 0],
         [0, 1, 1],
         [0, 1, 0]],
        [[0, 0, 0],
         [1, 1, 1],
         [0, 1, 0]],
        [[0, 1, 0],
         [1, 1, 0],
         [0, 1, 0]],
    ],
    'Z': [
        [[1, 1, 0],
         [0, 1, 1],
         [0, 0, 0]],
        [[0, 0, 1],
         [0, 1, 1],
         [0, 1, 0]],
    ],
}


def rotate_shape(shape):
    return [list(row) for row in zip(*shape[::-1])]


class Piece:
    def __init__(self, kind: str):
        self.kind = kind
        self.rotations = [r for r in TETROMINO_SHAPES[kind]]
        # Normalize to have 4 rotations for ease
        while len(self.rotations) < 4:
            self.rotations.append(rotate_shape(self.rotations[-1]))
        self.rotation_index = 0
        self.x = GRID_COLS // 2 - 2
        self.y = -2

    @property
    def color(self):
        return COLORS[self.kind]

    @property
    def matrix(self):
        return self.rotations[self.rotation_index]

    def rotate(self):
        self.rotation_index = (self.rotation_index + 1) % 4


class Tetris:
    def __init__(self):
        self.grid = [[None for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
        self.score = 0
        self.level = 1
        self.lines_cleared = 0
        self.game_over = False
        self.paused = False
        self.current = self._generate_piece()
        self.next_piece = self._generate_piece()
        self.drop_timer = 0.0
        self.drop_interval = self._level_to_interval(self.level)

    def _generate_piece(self) -> Piece:
        kind = random.choice(list(TETROMINO_SHAPES.keys()))
        return Piece(kind)

    def _level_to_interval(self, level: int) -> float:
        return max(0.1, 0.8 - (level - 1) * 0.07)

    def can_move(self, dx: int, dy: int, rotation_delta: int = 0) -> bool:
        next_rotation = (self.current.rotation_index + rotation_delta) % 4
        matrix = self.current.rotations[next_rotation]
        for r, row in enumerate(matrix):
            for c, val in enumerate(row):
                if not val:
                    continue
                new_x = self.current.x + c + dx
                new_y = self.current.y + r + dy
                if new_x < 0 or new_x >= GRID_COLS or new_y >= GRID_ROWS:
                    return False
                if new_y >= 0 and self.grid[new_y][new_x] is not None:
                    return False
        return True

    def lock_piece(self):
        for r, row in enumerate(self.current.matrix):
            for c, val in enumerate(row):
                if not val:
                    continue
                gx = self.current.x + c
                gy = self.current.y + r
                if 0 <= gy < GRID_ROWS:
                    self.grid[gy][gx] = self.current.color
                else:
                    self.game_over = True
        cleared = self.clear_lines()
        self.update_score(cleared)
        self.current = self.next_piece
        self.next_piece = self._generate_piece()
        if not self.can_move(0, 0, 0):
            self.game_over = True

    def hard_drop(self):
        while self.can_move(0, 1):
            self.current.y += 1
        self.lock_piece()

    def soft_drop(self):
        if self.can_move(0, 1):
            self.current.y += 1
            return True
        else:
            self.lock_piece()
            return False

    def clear_lines(self) -> int:
        new_grid = []
        cleared = 0
        for row in self.grid:
            if all(cell is not None for cell in row):
                cleared += 1
            else:
                new_grid.append(row)
        for _ in range(cleared):
            new_grid.insert(0, [None for _ in range(GRID_COLS)])
        self.grid = new_grid
        self.lines_cleared += cleared
        if cleared:
            self.level = 1 + self.lines_cleared // 10
            self.drop_interval = self._level_to_interval(self.level)
        return cleared

    def update_score(self, lines: int):
        scores = {0: 0, 1: 100, 2: 300, 3: 500, 4: 800}
        self.score += scores.get(lines, 0) * self.level

    def update(self, dt: float):
        if self.game_over or self.paused:
            return
        self.drop_timer += dt
        if self.drop_timer >= self.drop_interval:
            moved = self.soft_drop()
            self.drop_timer = 0.0
            if not moved:
                # piece locked; handled in soft_drop
                pass


def draw_grid(surface, grid_origin_x: int):
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            x = grid_origin_x + c * CELL_SIZE
            y = r * CELL_SIZE
            pygame.draw.rect(surface, LIGHT_GRAY, (x, y, CELL_SIZE, CELL_SIZE), 1)


def draw_cells(surface, grid_origin_x: int, grid):
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            color = grid[r][c]
            if color is None:
                continue
            x = grid_origin_x + c * CELL_SIZE
            y = r * CELL_SIZE
            pygame.draw.rect(surface, color, (x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2))


def draw_piece(surface, grid_origin_x: int, piece: Piece):
    for r, row in enumerate(piece.matrix):
        for c, val in enumerate(row):
            if not val:
                continue
            x = grid_origin_x + (piece.x + c) * CELL_SIZE
            y = (piece.y + r) * CELL_SIZE
            if y < 0:
                continue
            pygame.draw.rect(surface, piece.color, (x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2))


def draw_sidebar(surface, game: Tetris, origin_x: int):
    font = pygame.font.SysFont("consolas", 22)
    small = pygame.font.SysFont("consolas", 18)

    # Panel
    pygame.draw.rect(surface, LIGHT_GRAY, (origin_x, 0, SIDEBAR_WIDTH * CELL_SIZE, WINDOW_HEIGHT), 1)

    # Score and level
    text_score = font.render(f"Score: {game.score}", True, WHITE)
    text_level = font.render(f"Level: {game.level}", True, WHITE)
    surface.blit(text_score, (origin_x + 16, 16))
    surface.blit(text_level, (origin_x + 16, 48))

    # Next piece label
    surface.blit(font.render("Next:", True, WHITE), (origin_x + 16, 92))

    # Draw next piece
    preview_origin_x = origin_x + 16
    preview_origin_y = 120
    matrix = game.next_piece.matrix
    color = game.next_piece.color
    for r, row in enumerate(matrix):
        for c, val in enumerate(row):
            if not val:
                continue
            x = preview_origin_x + c * (CELL_SIZE - 6)
            y = preview_origin_y + r * (CELL_SIZE - 6)
            pygame.draw.rect(surface, color, (x, y, CELL_SIZE - 8, CELL_SIZE - 8))

    # Help
    controls = [
        "Arrows: Move/Rotate",
        "Down: Soft drop",
        "Space: Hard drop",
        "P: Pause",
        "Esc: Quit",
    ]
    for i, line in enumerate(controls):
        surface.blit(small.render(line, True, WHITE), (origin_x + 16, 220 + i * 22))


def draw_game_over(surface):
    font = pygame.font.SysFont("consolas", 48)
    sub = pygame.font.SysFont("consolas", 24)
    overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT), pygame.SRCALPHA)
    overlay.fill((0, 0, 0, 180))
    surface.blit(overlay, (0, 0))
    text = font.render("GAME OVER", True, WHITE)
    subtext = sub.render("Press R to Restart", True, WHITE)
    surface.blit(text, (WINDOW_WIDTH // 2 - text.get_width() // 2, WINDOW_HEIGHT // 2 - 40))
    surface.blit(subtext, (WINDOW_WIDTH // 2 - subtext.get_width() // 2, WINDOW_HEIGHT // 2 + 10))


def main():
    pygame.init()
    pygame.display.set_caption("Tetris")
    screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
    clock = pygame.time.Clock()

    game = Tetris()

    grid_origin_x = 0
    sidebar_origin_x = GRID_COLS * CELL_SIZE

    move_cooldown = 0.1
    move_timer = 0.0

    while True:
        dt = clock.tick(FPS) / 1000.0
        move_timer += dt

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit(0)
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit(0)
                if event.key == pygame.K_p and not game.game_over:
                    game.paused = not game.paused
                if event.key == pygame.K_r and game.game_over:
                    game = Tetris()
                if game.game_over or game.paused:
                    continue
                if event.key == pygame.K_UP:
                    if game.can_move(0, 0, 1):
                        game.current.rotate()
                if event.key == pygame.K_SPACE:
                    game.hard_drop()

        # Continuous movement with arrow keys
        keys = pygame.key.get_pressed()
        if not game.game_over and not game.paused:
            moved_horizontal = False
            if move_timer >= move_cooldown:
                if keys[pygame.K_LEFT] and game.can_move(-1, 0):
                    game.current.x -= 1
                    moved_horizontal = True
                if keys[pygame.K_RIGHT] and game.can_move(1, 0):
                    game.current.x += 1
                    moved_horizontal = True
                move_timer = 0.0 if moved_horizontal else move_timer

            if keys[pygame.K_DOWN]:
                game.soft_drop()

        game.update(dt)

        # Render
        screen.fill(GRAY)
        draw_grid(screen, grid_origin_x)
        draw_cells(screen, grid_origin_x, game.grid)
        if not game.game_over:
            draw_piece(screen, grid_origin_x, game.current)
        draw_sidebar(screen, game, sidebar_origin_x)
        if game.game_over:
            draw_game_over(screen)

        pygame.display.flip()


if __name__ == "__main__":
    main()


