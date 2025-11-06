import chess
import chess.engine
import shutil
import os

class EnginePlayer:
    def __init__(self, engine_path=None, time_limit=0.1):
        """
        Uses Stockfish if available (UCI). Fallback is a deterministic legal-move picker.
        """
        self.time_limit = time_limit
        engine_path = (
            engine_path
            or os.environ.get("STOCKFISH_EXECUTABLE")
            or shutil.which("stockfish")
        )
        if engine_path is None:
            print(
                "Warning: Stockfish not found. Falling back to simple legal-move engine.\n"
                "Install Stockfish (e.g. `brew install stockfish`) or set STOCKFISH_EXECUTABLE."
            )
            self.engine = None
        else:
            try:
                self.engine = chess.engine.SimpleEngine.popen_uci(engine_path)
                print(f"Stockfish loaded from: {engine_path}")
            except Exception as e:
                print(f"Warning: failed to start Stockfish at {engine_path}: {e}")
                print("Falling back to simple legal-move engine.")
                self.engine = None

    def best_move_for_board(self, board: chess.Board):
        if self.engine is not None:
            limit = chess.engine.Limit(time=self.time_limit)
            result = self.engine.play(board, limit)
            return result.move
        else:
            legal = list(board.legal_moves)
            if not legal:
                return None
            return legal[len(legal) // 2]

    def quit(self):
        try:
            if self.engine is not None:
                self.engine.quit()
        except Exception:
            pass
