# ♟️ Chess Bot — Play Against Stockfish (FastAPI + JavaScript)

A modern, web-based chess game where you can play against the Stockfish chess engine.  
All moves, logic, and engine communication are handled through a Python FastAPI backend, while the board UI is fully browser-based.

---

## 🚀 Features

### 🧠 **Powerful Chess Engine**
- Uses **Stockfish** (bundled inside `/Backend/bin`)  
- Fast and strong engine response  
- Supports legal move validation using `python-chess`

### 🎮 **Frontend Web Chess UI**
- Play directly in your browser  
- Clean chessboard with smooth piece movement  
- Choose **White** or **Black**  
- Auto-rotate board when playing as Black  
- Highlights legal moves  
- AI instantly replies with its best move

### ⏱️ **Clock & Game Management**
- Player clocks included  
- Clock flips automatically when switching turns  
- Track active player and last move time  

### 🔌 **FastAPI Backend**
- Engine logic handled by Python  
- Endpoints for:
  - Getting AI moves  
  - Resetting game  
  - Getting board state  
- Serves static frontend files (`index.html`, JS, CSS)

---

## 📁 Project Structure
│
├── Backend/
│ ├── app.py # FastAPI server
│ ├── engine_player.py # Stockfish engine wrapper
│ ├── requirements.txt # Python dependencies
│ ├── bin/
│ │ └── stockfish.exe # Stockfish engine (manually added)
│ └── pycache/
│
├── Frontend/
│ ├── index.html # Web UI
│ ├── script.js # Game logic + API calls
│ └── style.css # Styling & board theme
│
└── README.md # Project documentation





