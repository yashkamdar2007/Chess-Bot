(function() {
  'use strict';
  
  const API_BASE = '';
  let currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  let selectedSquare = null;
  let legalMoves = [];
  let playerColor = 'white';
  let boardFlipped = false;
  
  const pieceSymbols = {
      'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
      'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚'
  };
  
  function initBoard() {
      const board = document.getElementById('chessboard');
      board.innerHTML = '';
      
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
      
      if (boardFlipped) {
          ranks.reverse();
          files.reverse();
      }
      
      for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
              const square = document.createElement('div');
              const squareName = files[f] + ranks[r];
              square.className = 'square ' + ((r + f) % 2 === 0 ? 'light' : 'dark');
              square.dataset.square = squareName;
              square.addEventListener('click', handleSquareClick);
              board.appendChild(square);
          }
      }
      
      updateBoard();
  }
  
  function updateBoard() {
      const pieces = fenToPieces(currentFen);
      const squares = document.querySelectorAll('.square');
      
      squares.forEach(square => {
          const squareName = square.dataset.square;
          square.textContent = pieces[squareName] || '';
          square.classList.remove('selected', 'legal-move');
      });
      
      if (selectedSquare) {
          const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
          if (selectedEl) {
              selectedEl.classList.add('selected');
          }
          
          const movesFromSelected = legalMoves.filter(m => m.startsWith(selectedSquare));
          movesFromSelected.forEach(move => {
              const toSquare = move.substring(2, 4);
              const toEl = document.querySelector(`[data-square="${toSquare}"]`);
              if (toEl) {
                  toEl.classList.add('legal-move');
              }
          });
      }
  }
  
  function fenToPieces(fen) {
      const pieces = {};
      const parts = fen.split(' ');
      const rows = parts[0].split('/');
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      
      rows.forEach((row, rankIdx) => {
          let fileIdx = 0;
          for (let char of row) {
              if (char >= '1' && char <= '8') {
                  fileIdx += parseInt(char);
              } else {
                  const rank = 8 - rankIdx;
                  const square = files[fileIdx] + rank;
                  pieces[square] = pieceSymbols[char] || char;
                  fileIdx++;
              }
          }
      });
      
      return pieces;
  }
  
  async function handleSquareClick(e) {
      const clickedSquare = e.currentTarget.dataset.square;
      
      if (selectedSquare) {
          const moveUci = selectedSquare + clickedSquare;
          if (legalMoves.includes(moveUci) || legalMoves.some(m => m.startsWith(moveUci))) {
              let promotion = null;
              
              // Check if pawn promotion
              const movingPiece = fenToPieces(currentFen)[selectedSquare];
              const fromRank = selectedSquare[1];
              const toRank = clickedSquare[1];
              if ((movingPiece === '♙' && fromRank === '7' && toRank === '8') ||
                  (movingPiece === '♟' && fromRank === '2' && toRank === '1')) {
                  promotion = prompt('Promote to (q/r/b/n):', 'q') || 'q';
              }
              
              await makeMove(selectedSquare, clickedSquare, promotion);
              selectedSquare = null;
          } else {
              // Check if clicking a piece of the same color
              const clickedPiece = fenToPieces(currentFen)[clickedSquare];
              if (clickedPiece && isPlayerPiece(clickedPiece)) {
                  selectedSquare = clickedSquare;
              } else {
                  selectedSquare = null;
              }
          }
      } else {
          // Select piece if it belongs to player
          const piece = fenToPieces(currentFen)[clickedSquare];
          if (piece && isPlayerPiece(piece)) {
              selectedSquare = clickedSquare;
          }
      }
      
      updateBoard();
  }
  
  function isPlayerPiece(piece) {
      const isWhitePiece = ['♙', '♘', '♗', '♖', '♕', '♔'].includes(piece);
      return (playerColor === 'white' && isWhitePiece) || (playerColor === 'black' && !isWhitePiece);
  }
  
  async function makeMove(fromSquare, toSquare, promotion) {
      try {
          const response = await fetch(`${API_BASE}/move`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  from_square: fromSquare,
                  to_square: toSquare,
                  promotion: promotion
              })
          });
          
          if (!response.ok) {
              const error = await response.json();
              alert(error.detail || 'Invalid move');
              return;
          }
          
          const data = await response.json();
          updateState(data);
      } catch (err) {
          console.error('Move error:', err);
      }
  }
  
  async function fetchState() {
      try {
          const response = await fetch(`${API_BASE}/state`);
          const data = await response.json();
          updateState(data);
      } catch (err) {
          console.error('State fetch error:', err);
      }
  }
  
  async function fetchBoard() {
      try {
          const response = await fetch(`${API_BASE}/board`);
          const data = await response.json();
          legalMoves = data.legal_moves || [];
          updateState(data);
      } catch (err) {
          console.error('Board fetch error:', err);
      }
  }
  
  function updateState(data) {
      currentFen = data.fen;
      playerColor = data.player_color;
      
      // Update clocks
      const whiteTime = formatTime(data.clocks.white);
      const blackTime = formatTime(data.clocks.black);
      
      const topClock = document.getElementById('topClock');
      const bottomClock = document.getElementById('bottomClock');
      
      if (boardFlipped) {
          topClock.textContent = whiteTime;
          bottomClock.textContent = blackTime;
          topClock.classList.toggle('active', data.active_color === 'white');
          bottomClock.classList.toggle('active', data.active_color === 'black');
      } else {
          topClock.textContent = blackTime;
          bottomClock.textContent = whiteTime;
          topClock.classList.toggle('active', data.active_color === 'black');
          bottomClock.classList.toggle('active', data.active_color === 'white');
      }
      
      // Update turn label
      let turnText = `Turn: ${data.turn.charAt(0).toUpperCase() + data.turn.slice(1)}`;
      if (data.is_check) turnText += ' (check)';
      if (data.is_game_over && data.result) turnText = data.result;
      document.getElementById('turnLabel').textContent = turnText;
      
      // Update move history
      updateMoveHistory(data.move_history);
      
      updateBoard();
  }
  
  function updateMoveHistory(moves) {
      const moveList = document.getElementById('moveList');
      moveList.innerHTML = '';
      
      for (let i = 0; i < moves.length; i += 2) {
          const moveNum = Math.floor(i / 2) + 1;
          const whiteMove = moves[i];
          const blackMove = moves[i + 1] || '';
          
          const moveDiv = document.createElement('div');
          moveDiv.className = 'move-pair';
          moveDiv.textContent = `${moveNum}. ${whiteMove} ${blackMove}`;
          moveList.appendChild(moveDiv);
      }
      
      moveList.scrollTop = moveList.scrollHeight;
  }
  
  function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Event handlers
  document.getElementById('applyColorBtn').addEventListener('click', async () => {
      const color = document.getElementById('colorSelect').value;
      try {
          const response = await fetch(`${API_BASE}/set-player-color`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ color })
          });
          const data = await response.json();
          boardFlipped = (color === 'black');
          initBoard();
          updateState(data);
          await fetchBoard();
      } catch (err) {
          console.error('Color change error:', err);
      }
  });
  
  document.getElementById('setClockBtn').addEventListener('click', async () => {
      const minutes = parseInt(document.getElementById('clockMinutes').value);
      if (minutes < 1 || minutes > 60) {
          alert('Minutes must be between 1 and 60');
          return;
      }
      try {
          const response = await fetch(`${API_BASE}/clock/set/${minutes}`, {
              method: 'POST'
          });
          const data = await response.json();
          updateState(data);
      } catch (err) {
          console.error('Clock set error:', err);
      }
  });
  
  document.getElementById('pauseBtn').addEventListener('click', async () => {
      try {
          await fetch(`${API_BASE}/clock/pause`, { method: 'POST' });
      } catch (err) {
          console.error('Pause error:', err);
      }
  });
  
  document.getElementById('resumeBtn').addEventListener('click', async () => {
      try {
          await fetch(`${API_BASE}/clock/resume`, { method: 'POST' });
      } catch (err) {
          console.error('Resume error:', err);
      }
  });
  
  document.getElementById('newGameBtn').addEventListener('click', async () => {
      try {
          const response = await fetch(`${API_BASE}/reset`);
          const data = await response.json();
          selectedSquare = null;
          updateState(data);
          await fetchBoard();
      } catch (err) {
          console.error('Reset error:', err);
      }
  });
  
  document.getElementById('engineMoveBtn').addEventListener('click', async () => {
      try {
          const response = await fetch(`${API_BASE}/engine-move`);
          const data = await response.json();
          updateState(data);
          await fetchBoard();
      } catch (err) {
          console.error('Engine move error:', err);
      }
  });
  
  // Initialize
  initBoard();
  fetchBoard();
  
  // Poll state every 800ms
  setInterval(fetchState, 800);
})();