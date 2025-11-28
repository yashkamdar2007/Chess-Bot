// Frontend/script.js
const PIECES = {
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚'
};

let gameState = null;
let selectedSquare = null;
let pendingPromotion = null;
let boardFlipped = false;

// Initialize board
function initBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    
    for (let rank = 7; rank >= 0; rank--) {
        for (let file = 0; file < 8; file++) {
            const square = document.createElement('div');
            square.className = 'square ' + ((rank + file) % 2 === 0 ? 'dark' : 'light');
            square.dataset.square = fileRankToSquare(file, rank);
            square.addEventListener('click', handleSquareClick);
            board.appendChild(square);
        }
    }
}

function fileRankToSquare(file, rank) {
    return String.fromCharCode(97 + file) + (rank + 1);
}

function squareToFileRank(square) {
    return {
        file: square.charCodeAt(0) - 97,
        rank: parseInt(square[1]) - 1
    };
}

function flipSquare(square) {
    // Transform square coordinates for 180-degree board flip
    // a1 (0,0) -> h8 (7,7), h8 (7,7) -> a1 (0,0)
    const { file, rank } = squareToFileRank(square);
    const flippedFile = 7 - file;
    const flippedRank = 7 - rank;
    return fileRankToSquare(flippedFile, flippedRank);
}

function updateBoard() {
    if (!gameState) return;
    
    // Update board flip state
    boardFlipped = gameState.player_color === 'black';
    const board = document.getElementById('board');
    if (boardFlipped) {
        board.style.transform = 'rotate(180deg)';
    } else {
        board.style.transform = 'rotate(0deg)';
    }
    
    const squares = document.querySelectorAll('.square');
    const fen = gameState.fen.split(' ')[0];
    const rows = fen.split('/');
    
    let squareIndex = 0;
    for (let rank = 7; rank >= 0; rank--) {
        const row = rows[7 - rank];
        let file = 0;
        
        for (let char of row) {
            if (char >= '1' && char <= '8') {
                const emptySquares = parseInt(char);
                for (let i = 0; i < emptySquares; i++) {
                    const square = squares[squareIndex];
                    square.textContent = '';
                    square.classList.remove('selected', 'legal-move');
                    // Rotate pieces 180deg when board is flipped so they appear right-side up
                    if (boardFlipped) {
                        square.style.transform = 'rotate(180deg)';
                    } else {
                        square.style.transform = '';
                    }
                    squareIndex++;
                    file++;
                }
            } else {
                const square = squares[squareIndex];
                square.textContent = PIECES[char] || '';
                square.classList.remove('selected', 'legal-move');
                // Rotate pieces 180deg when board is flipped so they appear right-side up
                if (boardFlipped) {
                    square.style.transform = 'rotate(180deg)';
                } else {
                    square.style.transform = '';
                }
                squareIndex++;
                file++;
            }
        }
    }
    
    // Highlight selected square
    if (selectedSquare) {
        // selectedSquare is in standard chess notation, same as data-square attributes
        const square = document.querySelector(`[data-square="${selectedSquare}"]`);
        if (square) square.classList.add('selected');
        
        // Show legal moves from selected square
        gameState.legal_moves.forEach(uci => {
            if (uci.startsWith(selectedSquare)) {
                const toSquare = uci.substring(2, 4);
                // toSquare is in standard chess notation, same as data-square attributes
                const square = document.querySelector(`[data-square="${toSquare}"]`);
                if (square) square.classList.add('legal-move');
            }
        });
    }
}

function updateClocks() {
    if (!gameState) return;
    
    const whiteMinutes = Math.floor(gameState.clocks.white / 60);
    const whiteSeconds = gameState.clocks.white % 60;
    const blackMinutes = Math.floor(gameState.clocks.black / 60);
    const blackSeconds = gameState.clocks.black % 60;
    
    document.getElementById('whiteClock').textContent = 
        `${String(whiteMinutes).padStart(2, '0')}:${String(whiteSeconds).padStart(2, '0')}`;
    document.getElementById('blackClock').textContent = 
        `${String(blackMinutes).padStart(2, '0')}:${String(blackSeconds).padStart(2, '0')}`;
    
    // Highlight active clock
    document.querySelector('.white-clock').classList.toggle('active', gameState.active_color === 'white');
    document.querySelector('.black-clock').classList.toggle('active', gameState.active_color === 'black');
}

function updateTurnIndicator() {
    if (!gameState) return;
    
    let text = `Turn: ${gameState.turn.charAt(0).toUpperCase() + gameState.turn.slice(1)}`;
    if (gameState.is_check) {
        text += ' (Check!)';
    }
    if (gameState.is_game_over) {
        text = `Game Over - Result: ${gameState.result || 'Draw'}`;
    }
    
    document.getElementById('turnIndicator').textContent = text;
}

function updateMoveHistory() {
    if (!gameState) return;
    
    const moveList = document.getElementById('moveList');
    moveList.innerHTML = '';
    
    for (let i = 0; i < gameState.move_history.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = gameState.move_history[i];
        const blackMove = gameState.move_history[i + 1] || '';
        
        const moveDiv = document.createElement('div');
        moveDiv.className = 'move-pair';
        moveDiv.textContent = `${moveNum}. ${whiteMove} ${blackMove}`;
        moveList.appendChild(moveDiv);
    }
    
    moveList.scrollTop = moveList.scrollHeight;
}

function updateCapturedPieces() {
    if (!gameState) return;
    
    const capturedWhite = document.getElementById('capturedWhite');
    const capturedBlack = document.getElementById('capturedBlack');
    
    capturedWhite.textContent = gameState.captured.white.map(p => PIECES[p]).join(' ');
    capturedBlack.textContent = gameState.captured.black.map(p => PIECES[p]).join(' ');
}

async function fetchState() {
    try {
        const response = await fetch('/state');
        gameState = await response.json();
        updateBoard();
        updateClocks();
        updateTurnIndicator();
        updateMoveHistory();
        updateCapturedPieces();
    } catch (error) {
        console.error('Error fetching state:', error);
    }
}

async function makeMove(fromSquare, toSquare, promotion = null) {
    try {
        const response = await fetch('/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_square: fromSquare,
                to_square: toSquare,
                promotion: promotion
            })
        });
        
        if (response.ok) {
            gameState = await response.json();
            selectedSquare = null;
            updateBoard();
            updateClocks();
            updateTurnIndicator();
            updateMoveHistory();
            updateCapturedPieces();
        } else {
            const error = await response.json();
            console.error('Invalid move:', error.detail);
            selectedSquare = null;
            updateBoard();
        }
    } catch (error) {
        console.error('Error making move:', error);
        selectedSquare = null;
        updateBoard();
    }
}

function handleSquareClick(event) {
    if (!gameState || gameState.is_game_over) return;
    
    // data-square attributes are always in standard chess notation
    // CSS rotation only changes visual position, not the data-square value
    // So we use the data-square value directly - no transformation needed
    const clickedSquare = event.currentTarget.dataset.square;
    const piece = event.currentTarget.textContent;
    
    if (selectedSquare) {
        // Try to make a move
        if (clickedSquare === selectedSquare) {
            // Deselect
            selectedSquare = null;
            updateBoard();
        } else {
            // Check if this is a pawn promotion move
            // selectedSquare is in standard chess notation, same as data-square attributes
            const fromPiece = document.querySelector(`[data-square="${selectedSquare}"]`).textContent;
            const isPawn = fromPiece === '♙' || fromPiece === '♟';
            const fromRank = parseInt(selectedSquare[1]);
            const toRank = parseInt(clickedSquare[1]);
            
            // White pawn promotes from rank 7 to rank 8, black pawn from rank 2 to rank 1
            const isWhitePawn = fromPiece === '♙';
            const shouldPromote = isPawn && (
                (isWhitePawn && fromRank === 7 && toRank === 8) ||
                (!isWhitePawn && fromRank === 2 && toRank === 1)
            );
            
            if (shouldPromote) {
                // Show promotion modal
                pendingPromotion = { from: selectedSquare, to: clickedSquare };
                showPromotionModal();
            } else {
                makeMove(selectedSquare, clickedSquare);
            }
        }
    } else {
        // Select a piece
        if (piece && gameState.turn === gameState.player_color) {
            // Use direct comparison with known white pieces instead of Unicode check
            const whitePieces = ['♙', '♘', '♗', '♖', '♕', '♔'];
            const isPieceWhite = whitePieces.includes(piece);
            const isPlayerWhite = gameState.player_color === 'white';
            
            // Check if the piece belongs to the player
            if (isPieceWhite === isPlayerWhite) {
                selectedSquare = clickedSquare;
                updateBoard();
            }
        }
    }
}

function showPromotionModal() {
    // Update promotion buttons based on player color
    const isPlayerWhite = gameState && gameState.player_color === 'white';
    const promotionPieces = isPlayerWhite 
        ? { 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘' }
        : { 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞' };
    
    document.querySelectorAll('.promotion-btn').forEach(btn => {
        const piece = btn.dataset.piece;
        const pieceSymbol = promotionPieces[piece];
        const pieceName = piece === 'q' ? 'Queen' : piece === 'r' ? 'Rook' : piece === 'b' ? 'Bishop' : 'Knight';
        btn.textContent = `${pieceSymbol} ${pieceName}`;
    });
    
    document.getElementById('promotionModal').style.display = 'flex';
}

function hidePromotionModal() {
    document.getElementById('promotionModal').style.display = 'none';
}

// Event listeners
document.getElementById('applyColor').addEventListener('click', async () => {
    const color = document.getElementById('colorSelect').value;
    try {
        const response = await fetch('/set-player-color', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ color })
        });
        gameState = await response.json();
        selectedSquare = null;
        updateBoard();
        updateClocks();
        updateTurnIndicator();
        updateMoveHistory();
        updateCapturedPieces();
    } catch (error) {
        console.error('Error setting color:', error);
    }
});

document.getElementById('setTime').addEventListener('click', async () => {
    const minutes = parseInt(document.getElementById('clockMinutes').value);
    try {
        const response = await fetch(`/clock/set/${minutes}`, { method: 'POST' });
        gameState = await response.json();
        updateClocks();
    } catch (error) {
        console.error('Error setting time:', error);
    }
});

document.getElementById('pauseBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/clock/pause', { method: 'POST' });
        gameState = await response.json();
        updateClocks();
    } catch (error) {
        console.error('Error pausing:', error);
    }
});

document.getElementById('resumeBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/clock/resume', { method: 'POST' });
        gameState = await response.json();
        updateClocks();
    } catch (error) {
        console.error('Error resuming:', error);
    }
});

document.getElementById('newGame').addEventListener('click', async () => {
    try {
        const response = await fetch('/reset');
        gameState = await response.json();
        selectedSquare = null;
        updateBoard();
        updateClocks();
        updateTurnIndicator();
        updateMoveHistory();
        updateCapturedPieces();
    } catch (error) {
        console.error('Error resetting:', error);
    }
});

document.getElementById('engineMove').addEventListener('click', async () => {
    try {
        const response = await fetch('/engine-move');
        gameState = await response.json();
        updateBoard();
        updateClocks();
        updateTurnIndicator();
        updateMoveHistory();
        updateCapturedPieces();
    } catch (error) {
        console.error('Error getting engine move:', error);
    }
});

// Promotion modal handlers
document.querySelectorAll('.promotion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const piece = btn.dataset.piece;
        hidePromotionModal();
        if (pendingPromotion) {
            makeMove(pendingPromotion.from, pendingPromotion.to, piece);
            pendingPromotion = null;
        }
    });
});

// Initialize and start polling
initBoard();
fetchState();
setInterval(fetchState, 800);
