from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chess
import os
import time
from typing import Optional, List
from engine_player import EnginePlayer

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Game state
board = chess.Board()
engine_player = EnginePlayer()
move_history_san: List[str] = []
player_color = "white"
engine_color = "black"

# Clock state
clock_white = 300  # 5 minutes in seconds
clock_black = 300
active_color = "white"
last_clock_update = time.time()
clock_paused = False

def reset_clocks(minutes: int = 5):
    global clock_white, clock_black, last_clock_update, clock_paused, active_color
    clock_white = minutes * 60
    clock_black = minutes * 60
    last_clock_update = time.time()
    clock_paused = False
    active_color = "white"

def update_active_clock():
    global clock_white, clock_black, last_clock_update
    if clock_paused:
        return
    now = time.time()
    elapsed = now - last_clock_update
    last_clock_update = now
    if active_color == "white":
        clock_white = max(0, clock_white - elapsed)
    else:
        clock_black = max(0, clock_black - elapsed)

def switch_active_clock():
    global active_color
    update_active_clock()
    active_color = "black" if active_color == "white" else "white"

def get_state_dict():
    update_active_clock()
    turn_color = "white" if board.turn == chess.WHITE else "black"
    result = None
    if board.is_game_over():
        if board.is_checkmate():
            result = "Black wins" if board.turn == chess.WHITE else "White wins"
        elif board.is_stalemate():
            result = "Draw (stalemate)"
        elif board.is_insufficient_material():
            result = "Draw (insufficient material)"
        elif board.is_fifty_moves():
            result = "Draw (50 moves)"
        elif board.is_repetition():
            result = "Draw (repetition)"
        else:
            result = "Draw"
    
    return {
        "fen": board.fen(),
        "turn": turn_color,
        "move_history": move_history_san,
        "is_check": board.is_check(),
        "is_game_over": board.is_game_over(),
        "result": result,
        "clocks": {
            "white": int(clock_white),
            "black": int(clock_black)
        },
        "active_color": active_color,
        "player_color": player_color,
        "engine_color": engine_color
    }

class MoveRequest(BaseModel):
    from_square: str
    to_square: str
    promotion: Optional[str] = None

class ColorRequest(BaseModel):
    color: str

class ClockSetRequest(BaseModel):
    minutes: int

# Mount static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "Frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")
app.mount("/assets", StaticFiles(directory=frontend_path), name="assets")

@app.get("/")
async def serve_index():
    index_path = os.path.join(frontend_path, "index.html")
    return FileResponse(index_path)

@app.get("/state")
async def get_state():
    return get_state_dict()

@app.get("/board")
async def get_board():
    state = get_state_dict()
    legal_moves = [move.uci() for move in board.legal_moves]
    state["legal_moves"] = legal_moves
    return state

@app.post("/move")
async def make_move(move_req: MoveRequest):
    global move_history_san
    
    try:
        from_sq = chess.parse_square(move_req.from_square)
        to_sq = chess.parse_square(move_req.to_square)
    except:
        raise HTTPException(status_code=400, detail="Invalid square notation")
    
    # Check if it's player's turn
    current_color = "white" if board.turn == chess.WHITE else "black"
    if current_color != player_color:
        raise HTTPException(status_code=400, detail="Not player's turn")
    
    # Build move
    promotion_piece = None
    if move_req.promotion:
        promotion_map = {"q": chess.QUEEN, "r": chess.ROOK, "b": chess.BISHOP, "n": chess.KNIGHT}
        promotion_piece = promotion_map.get(move_req.promotion.lower())
    
    move = chess.Move(from_sq, to_sq, promotion=promotion_piece)
    
    # Validate legality
    if move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Illegal move")
    
    # Apply move
    san = board.san(move)
    board.push(move)
    move_history_san.append(san)
    switch_active_clock()
    
    # Engine reply if game not over
    engine_move_made = None
    if not board.is_game_over():
        engine_turn_color = "white" if board.turn == chess.WHITE else "black"
        if engine_turn_color == engine_color:
            engine_move = engine_player.best_move_for_board(board)
            if engine_move:
                san_engine = board.san(engine_move)
                board.push(engine_move)
                move_history_san.append(san_engine)
                engine_move_made = engine_move.uci()
                switch_active_clock()
    
    state = get_state_dict()
    state["engine_move"] = engine_move_made
    return state

@app.get("/engine-move")
async def engine_move():
    global move_history_san
    
    if board.is_game_over():
        return get_state_dict()
    
    current_color = "white" if board.turn == chess.WHITE else "black"
    if current_color != engine_color:
        raise HTTPException(status_code=400, detail="Not engine's turn")
    
    move = engine_player.best_move_for_board(board)
    if move:
        san = board.san(move)
        board.push(move)
        move_history_san.append(san)
        switch_active_clock()
    
    return get_state_dict()

@app.get("/reset")
async def reset_game():
    global board, move_history_san
    board = chess.Board()
    move_history_san = []
    reset_clocks()
    
    # If engine is white, make first move
    if engine_color == "white":
        move = engine_player.best_move_for_board(board)
        if move:
            san = board.san(move)
            board.push(move)
            move_history_san.append(san)
            switch_active_clock()
    
    return get_state_dict()

@app.post("/set-player-color")
async def set_player_color(color_req: ColorRequest):
    global player_color, engine_color, board, move_history_san
    
    if color_req.color not in ["white", "black"]:
        raise HTTPException(status_code=400, detail="Color must be 'white' or 'black'")
    
    player_color = color_req.color
    engine_color = "black" if player_color == "white" else "white"
    
    # Reset game
    board = chess.Board()
    move_history_san = []
    reset_clocks()
    
    # If engine is white, make first move
    if engine_color == "white":
        move = engine_player.best_move_for_board(board)
        if move:
            san = board.san(move)
            board.push(move)
            move_history_san.append(san)
            switch_active_clock()
    
    return get_state_dict()

@app.post("/clock/pause")
async def pause_clock():
    global clock_paused
    update_active_clock()
    clock_paused = True
    return {"status": "paused"}

@app.post("/clock/resume")
async def resume_clock():
    global clock_paused, last_clock_update
    clock_paused = False
    last_clock_update = time.time()
    return {"status": "resumed"}

@app.post("/clock/set/{minutes}")
async def set_clock(minutes: int):
    if minutes < 1 or minutes > 60:
        raise HTTPException(status_code=400, detail="Minutes must be between 1 and 60")
    reset_clocks(minutes)
    return get_state_dict()