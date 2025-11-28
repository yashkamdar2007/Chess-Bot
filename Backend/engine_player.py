# Backend/engine_player.py
import chess
import chess.engine
import shutil
import os
import logging
from typing import Optional
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EnginePlayer:
    def __init__(self, engine_path: Optional[str] = None):
        self.engine = None
        self.use_fallback = False
        
        # Try to find Stockfish
        if engine_path:
            paths_to_try = [engine_path]
        else:
            # Check for locally installed Stockfish first
            script_dir = os.path.dirname(os.path.abspath(__file__))
            local_stockfish = os.path.join(script_dir, "bin", "stockfish")
            local_stockfish_exe = os.path.join(script_dir, "bin", "stockfish.exe")
            
            paths_to_try = [
                local_stockfish,
                local_stockfish_exe,
                "/opt/homebrew/bin/stockfish",
                "/usr/local/bin/stockfish",
                "/usr/bin/stockfish",
                os.environ.get("STOCKFISH_EXECUTABLE", ""),
                shutil.which("stockfish") or ""
            ]
        
        for path in paths_to_try:
            if path and os.path.exists(path):
                try:
                    self.engine = chess.engine.SimpleEngine.popen_uci(path)
                    logger.info(f"Stockfish engine loaded from: {path}")
                    return
                except Exception as e:
                    logger.warning(f"Failed to load engine from {path}: {e}")
        
        # Fallback mode
        logger.warning("Stockfish not found. Using fallback deterministic move selection.")
        self.use_fallback = True
    
    def best_move_for_board(self, board: chess.Board) -> Optional[chess.Move]:
        """Get best move for current board position."""
        if board.is_game_over():
            return None
        
        if self.use_fallback:
            return self._fallback_move(board)
        
        try:
            result = self.engine.play(board, chess.engine.Limit(time=0.1))
            return result.move
        except Exception as e:
            logger.error(f"Engine error: {e}")
            return self._fallback_move(board)
    
    def _fallback_move(self, board: chess.Board) -> Optional[chess.Move]:
        """Deterministic fallback move selector."""
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return None
        
        # Prioritize: captures > center control > random
        captures = [m for m in legal_moves if board.is_capture(m)]
        if captures:
            return captures[0]
        
        center_squares = [chess.E4, chess.D4, chess.E5, chess.D5]
        center_moves = [m for m in legal_moves if m.to_square in center_squares]
        if center_moves:
            return center_moves[0]
        
        return legal_moves[0]
    
    def quit(self):
        """Clean up engine resources."""
        if self.engine:
            try:
                self.engine.quit()
            except Exception as e:
                logger.error(f"Error quitting engine: {e}")