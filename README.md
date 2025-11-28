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




---

## 🛠️ Installation & Running

### 1️⃣ **Clone the Repository**
```bash
git clone https://github.com/yash171009/Chess-Bot
cd Chess-Bot/Backend
2️⃣ Create Virtual Environment
bash
Copy code
python -m venv venv
venv\Scripts\activate
3️⃣ Install Dependencies
bash
Copy code
pip install -r requirements.txt
4️⃣ Run the Backend Server
bash
Copy code
uvicorn app:app --reload
Backend will run on:
http://127.0.0.1:8000

5️⃣ Run the Frontend
Simply open:

bash
Copy code
Chess-Bot/Frontend/index.html
Or right-click → Open With Live Server in VS Code.

🧩 API Endpoints (FastAPI)
Method	Endpoint	Description
POST	/move	Send a move and get AI response
GET	/state	Get current board state
POST	/reset	Restart the game

🧠 Stockfish Engine Setup
Stockfish is included inside:

bash
Copy code
Backend/bin/stockfish.exe
If missing, download from:
https://stockfishchess.org/download/

Then place the .exe into /Backend/bin and rename to:

Copy code
stockfish.exe
🎯 Future Improvements (Planned)
Skill level slider for Stockfish

Engine depth/strength settings

Move history + PGN export

Sound effects for moves

Online multiplayer (WebSockets)

Opening book integration

🤝 Contributing
Pull requests are welcome!
If you want to improve UI, engine strength, or features, feel free to open an issue.

📜 License
This project uses the Stockfish engine (GPL license).
Your frontend/backends scripts are custom and owned by you.

⭐ Support
If you like the project, star the repo on GitHub!
It motivates development and improvements 😊

yaml
Copy code

---

If you'd like, I can also:

✅ Add images/screenshots to the README  
✅ Create a **GitHub Pages website** for your chess bot  
✅ Make your repo SUPER professional like a portfolio project  

Just tell me!






