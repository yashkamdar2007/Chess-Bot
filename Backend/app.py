# Backend/app.py
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import chess
import chess.pgn
from typing import Optional, List, Dict
import time
from pathlib import Path
from engine_player import EnginePlayer

app = FastAPI()

# Mount Frontend at both /static and /assets
frontend_path = Path(__file__).parent.parent / "Frontend"
app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")
app.mount("/assets", StaticFiles(directory=str(frontend_path)), name="assets")

# Game state
board = chess.Board()
engine = EnginePlayer()

# Clock state (seconds)
clock_white = 300  # 5 minutes default
clock_black = 300
clock_paused = False
last_switch_time = time.time()
active_color = "white"  # who's currently on the clock

# Player/engine colors
player_color = "white"
engine_color = "black"


class MoveRequest(BaseModel):
    from_square: str
    to_square: str
    promotion: Optional[str] = None


class ColorRequest(BaseModel):
    color: str


def _update_clock():
    """Update the active clock based on elapsed time."""
    global clock_white, clock_black, last_switch_time
    
    if clock_paused or board.is_game_over():
        return
    
    elapsed = time.time() - last_switch_time
    
    if active_color == "white":
        clock_white = max(0, clock_white - elapsed)
    else:
        clock_black = max(0, clock_black - elapsed)
    
    last_switch_time = time.time()


def _switch_clock():
    """Switch active clock to the other side."""
    global active_color, last_switch_time
    
    _update_clock()
    active_color = "black" if board.turn == chess.BLACK else "white"
    last_switch_time = time.time()


def _get_captured_pieces() -> Dict[str, List[str]]:
    """Calculate captured pieces based on material difference."""
    white_pieces = {"p": 8, "n": 2, "b": 2, "r": 2, "q": 1}
    black_pieces = {"p": 8, "n": 2, "b": 2, "r": 2, "q": 1}
    
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece:
            piece_symbol = piece.symbol().lower()
            if piece.color == chess.WHITE:
                if piece_symbol in white_pieces:
                    white_pieces[piece_symbol] -= 1
            else:
                if piece_symbol in black_pieces:
                    black_pieces[piece_symbol] -= 1
    
    captured_white = []
    captured_black = []
    
    for piece_type, count in white_pieces.items():
        captured_white.extend([piece_type.upper()] * count)
    
    for piece_type, count in black_pieces.items():
        captured_black.extend([piece_type.lower()] * count)
    
    return {"white": captured_white, "black": captured_black}


def _get_move_history() -> List[str]:
    """Get move history in SAN notation."""
    temp_board = chess.Board()
    history = []
    
    for move in board.move_stack:
        san = temp_board.san(move)
        history.append(san)
        temp_board.push(move)
    
    return history


def _get_state() -> dict:
    """Get complete game state."""
    _update_clock()
    
    result = None
    if board.is_game_over():
        outcome = board.outcome()
        if outcome:
            result = outcome.result()
    
    legal_moves = [move.uci() for move in board.legal_moves]
    
    return {
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "move_history": _get_move_history(),
        "is_check": board.is_check(),
        "is_game_over": board.is_game_over(),
        "result": result,
        "clocks": {
            "white": int(clock_white),
            "black": int(clock_black)
        },
        "active_color": active_color,
        "player_color": player_color,
        "engine_color": engine_color,
        "legal_moves": legal_moves,
        "captured": _get_captured_pieces()
    }


@app.get("/")
async def read_root():
    return FileResponse(str(frontend_path / "index.html"))


@app.get("/state")
async def get_state():
    return _get_state()


@app.get("/board")
async def get_board():
    return _get_state()


@app.post("/move")
async def make_move(move_request: MoveRequest):
    global board
    
    if board.is_game_over():
        raise HTTPException(status_code=400, detail="Game is over")
    
    current_turn = "white" if board.turn == chess.WHITE else "black"
    if current_turn != player_color:
        raise HTTPException(status_code=400, detail="Not your turn")
    
    # Parse move
    try:
        from_sq = chess.parse_square(move_request.from_square)
        to_sq = chess.parse_square(move_request.to_square)
        
        # Check for promotion
        promotion_piece = None
        if move_request.promotion:
            promotion_map = {"q": chess.QUEEN, "r": chess.ROOK, "b": chess.BISHOP, "n": chess.KNIGHT}
            promotion_piece = promotion_map.get(move_request.promotion.lower())
        
        # Try to find the move
        move = None
        for legal_move in board.legal_moves:
            if legal_move.from_square == from_sq and legal_move.to_square == to_sq:
                if promotion_piece:
                    if legal_move.promotion == promotion_piece:
                        move = legal_move
                        break
                else:
                    if legal_move.promotion is None:
                        move = legal_move
                        break
        
        if not move:
            # If promotion is needed but not specified, default to queen
            piece = board.piece_at(from_sq)
            if piece and piece.piece_type == chess.PAWN:
                rank = chess.square_rank(to_sq)
                if (piece.color == chess.WHITE and rank == 7) or (piece.color == chess.BLACK and rank == 0):
                    for legal_move in board.legal_moves:
                        if legal_move.from_square == from_sq and legal_move.to_square == to_sq and legal_move.promotion == chess.QUEEN:
                            move = legal_move
                            break
        
        if not move:
            raise HTTPException(status_code=400, detail="Illegal move")
        
        board.push(move)
        _switch_clock()
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid move: {str(e)}")
    
    state = _get_state()
    
    # Engine response
    engine_move_san = None
    if not board.is_game_over() and board.turn == (chess.WHITE if engine_color == "white" else chess.BLACK):
        engine_move = engine.best_move_for_board(board)
        if engine_move:
            engine_move_san = board.san(engine_move)
            board.push(engine_move)
            _switch_clock()
            state = _get_state()
    
    state["engine_move"] = engine_move_san
    return state


@app.get("/engine-move")
async def engine_move():
    if board.is_game_over():
        raise HTTPException(status_code=400, detail="Game is over")
    
    current_turn = "white" if board.turn == chess.WHITE else "black"
    if current_turn != engine_color:
        raise HTTPException(status_code=400, detail="Not engine's turn")
    
    move = engine.best_move_for_board(board)
    if move:
        board.push(move)
        _switch_clock()
    
    return _get_state()


@app.get("/reset")
async def reset_game():
    global board, clock_white, clock_black, active_color, last_switch_time, clock_paused
    
    board = chess.Board()
    clock_white = 300
    clock_black = 300
    active_color = "white"
    last_switch_time = time.time()
    clock_paused = False
    
    # If engine is white, make first move
    if engine_color == "white":
        move = engine.best_move_for_board(board)
        if move:
            board.push(move)
            _switch_clock()
    
    return _get_state()


@app.post("/set-player-color")
async def set_player_color(color_request: ColorRequest):
    global player_color, engine_color, board, clock_white, clock_black, active_color, last_switch_time, clock_paused
    
    if color_request.color not in ["white", "black"]:
        raise HTTPException(status_code=400, detail="Color must be 'white' or 'black'")
    
    player_color = color_request.color
    engine_color = "black" if player_color == "white" else "white"
    
    # Reset game
    board = chess.Board()
    clock_white = 300
    clock_black = 300
    active_color = "white"
    last_switch_time = time.time()
    clock_paused = False
    
    # If engine is white, make first move
    if engine_color == "white":
        move = engine.best_move_for_board(board)
        if move:
            board.push(move)
            _switch_clock()
    
    return _get_state()


@app.post("/clock/pause")
async def pause_clock():
    global clock_paused
    _update_clock()
    clock_paused = True
    return _get_state()


@app.post("/clock/resume")
async def resume_clock():
    global clock_paused, last_switch_time
    clock_paused = False
    last_switch_time = time.time()
    return _get_state()


@app.post("/clock/set/{minutes}")
async def set_clock(minutes: int):
    global clock_white, clock_black, last_switch_time
    
    if minutes < 1 or minutes > 60:
        raise HTTPException(status_code=400, detail="Minutes must be between 1 and 60")
    
    clock_white = minutes * 60
    clock_black = minutes * 60
    last_switch_time = time.time()
    
    return _get_state()


@app.on_event("shutdown")
async def shutdown():
    engine.quit()
