document.addEventListener("DOMContentLoaded", () => {
  console.log("🎮 页面加载完成");

  const gameBoard = document.getElementById("game-board");
  const statusText = document.getElementById("status");
  const startBtn = document.getElementById("start-game");
  const resetBtn = document.getElementById("reset");
  const restartBtn = document.getElementById("restart");
  const colorChoice = document.getElementById("color-choice");

  let board = Array(15).fill().map(() => Array(15).fill(0));
  let currentPlayer = 1;
  let gameOver = false;
  let playerColor = 1;
  let aiColor = 2;

  // 🧬 遗传优化评分基因
  const SCORES = {
    FIVE: 1000000000,
    LIVE4: 1500000,
    DEAD4: 300000,
    LIVE3: 50000,
    DEAD3: 1000,
    LIVE2: 600,
    DEAD2: 50,
    BLOCKED: -50
  };

  // ⭐ 中心权重
  const POSITION_WEIGHTS = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,3,3,3,3,3,3,3,3,3,3,3,2,1],
    [1,2,3,4,4,4,4,4,4,4,4,4,3,2,1],
    [1,2,3,4,5,5,5,5,5,5,5,4,3,2,1],
    [1,2,3,4,5,6,6,6,6,6,5,4,3,2,1],
    [1,2,3,4,5,6,7,7,7,6,5,4,3,2,1],
    [1,2,3,4,5,6,7,5,7,6,5,4,3,2,1],
    [1,2,3,4,5,6,7,7,7,6,5,4,3,2,1],
    [1,2,3,4,5,6,6,6,6,6,5,4,3,2,1],
    [1,2,3,4,5,5,5,5,5,5,5,4,3,2,1],
    [1,2,3,4,4,4,4,4,4,4,4,4,3,2,1],
    [1,2,3,3,3,3,3,3,3,3,3,3,3,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];

  const SEARCH_DEPTH = 3;

  function createBoard() {
    gameBoard.innerHTML = "";
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.addEventListener("click", handleCellClick);
        gameBoard.appendChild(cell);
      }
    }
  }

  function handleCellClick(e) {
    if (gameOver) return;
    if (currentPlayer !== playerColor) return;

    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);

    if (board[row][col] !== 0) return;

    makeMove(row, col);
    console.log(`🖱️ 玩家落子: (${row},${col})`);

    if (!gameOver && !checkWin(row, col)) {
      setTimeout(() => aiMove(), 600);
    }
  }

  function makeMove(row, col) {
    // ✅ 安全防护：防止重复落子或游戏已结束
    if (board[row][col] !== 0 || gameOver) return;

    board[row][col] = currentPlayer;
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const piece = document.createElement("div");
    piece.classList.add("piece", currentPlayer === 1 ? "black" : "white");
    cell.appendChild(piece);

    // ✅ 检查是否获胜
    if (checkWin(row, col)) {
      gameOver = true;
      statusText.textContent = currentPlayer === playerColor ? "你赢了！" : "AI获胜！";
      setTimeout(() => alert(currentPlayer === playerColor ? "🎉 恭喜你获胜！" : "🤖 AI获胜，再试一次？"), 200);
    } else {
      currentPlayer = 3 - currentPlayer;
      statusText.textContent = currentPlayer === playerColor ? "你的回合" : "AI思考中...";
    }
  }

  function checkWin(row, col) {
    const player = board[row][col];
    const directions = [[1,0], [0,1], [1,1], [1,-1]];
    for (let [dx, dy] of directions) {
      let count = 1;
      for (let i = 1; i < 5; i++) {
        const r = row + i * dx, c = col + i * dy;
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) count++;
        else break;
      }
      for (let i = 1; i < 5; i++) {
        const r = row - i * dx, c = col - i * dy;
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) count++;
        else break;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  function evaluateDirection(row, col, dx, dy, player) {
    let count = 1;
    let leftFree = false, rightFree = false;

    for (let i = 1; i <= 4; i++) {
      const r = row - i * dx, c = col - i * dy;
      if (r < 0 || r >= 15 || c < 0 || c >= 15) break;
      if (board[r][c] === player) count++;
      else if (board[r][c] === 0) { leftFree = true; break; }
      else break;
    }

    for (let i = 1; i <= 4; i++) {
      const r = row + i * dx, c = col + i * dy;
      if (r < 0 || r >= 15 || c < 0 || c >= 15) break;
      if (board[r][c] === player) count++;
      else if (board[r][c] === 0) { rightFree = true; break; }
      else break;
    }

    if (count >= 5) return SCORES.FIVE;
    if (count === 4) return leftFree && rightFree ? SCORES.LIVE4 : SCORES.DEAD4;
    if (count === 3) return leftFree && rightFree ? SCORES.LIVE3 : SCORES.DEAD3;
    if (count === 2) return leftFree && rightFree ? SCORES.LIVE2 : 0;
    return 0;
  }

  function evaluateBoard() {
    let score = 0;
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        if (board[row][col] === aiColor) {
          const directions = [[1,0], [0,1], [1,1], [1,-1]];
          for (let [dx, dy] of directions) {
            score += evaluateDirection(row, col, dx, dy, aiColor);
          }
          score += POSITION_WEIGHTS[row][col] * 20;
        } else if (board[row][col] === playerColor) {
          const directions = [[1,0], [0,1], [1,1], [1,-1]];
          for (let [dx, dy] of directions) {
            score -= evaluateDirection(row, col, dx, dy, playerColor);
          }
          score -= POSITION_WEIGHTS[row][col] * 20;
        }
      }
    }
    return score;
  }

  function getAvailableMoves() {
    const moves = [];
    const visited = Array(15).fill().map(() => Array(15).fill(false));

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c] !== 0) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && board[nr][nc] === 0) {
                visited[nr][nc] = true;
              }
            }
          }
        }
      }
    }

    if (board.every(row => row.every(c => c === 0))) {
      return [{ row: 7, col: 7 }];
    }

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (visited[r][c]) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }

  function minimax(depth, alpha, beta, maximizing) {
    if (depth === 0 || gameOver) {
      return evaluateBoard();
    }

    const moves = getAvailableMoves();
    if (moves.length === 0) return evaluateBoard();

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        if (board[move.row][move.col] !== 0) continue;
        board[move.row][move.col] = aiColor;
        currentPlayer = 3 - currentPlayer;

        const win = checkWin(move.row, move.col);
        if (win) {
          board[move.row][move.col] = 0;
          currentPlayer = 3 - currentPlayer;
          return Infinity;
        }

        const evalScore = minimax(depth - 1, alpha, beta, false);
        board[move.row][move.col] = 0;
        currentPlayer = 3 - currentPlayer;

        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        if (board[move.row][move.col] !== 0) continue;
        board[move.row][move.col] = playerColor;
        currentPlayer = 3 - currentPlayer;

        const win = checkWin(move.row, move.col);
        if (win) {
          board[move.row][move.col] = 0;
          currentPlayer = 3 - currentPlayer;
          return -Infinity;
        }

        const evalScore = minimax(depth - 1, alpha, beta, true);
        board[move.row][move.col] = 0;
        currentPlayer = 3 - currentPlayer;

        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // ✅ 完美修复版 aiMove：解决绝杀无法落子问题
  function aiMove() {
    if (gameOver || currentPlayer !== aiColor) return;

    const moves = getAvailableMoves();
    if (moves.length === 0) return;

    // 🚩 第一步：检查 AI 是否有“绝杀”机会
    for (const move of moves) {
      if (board[move.row][move.col] !== 0) continue;

      // 模拟 AI 落子
      board[move.row][move.col] = aiColor;

      // 检查是否获胜
      if (checkWin(move.row, move.col)) {
        // ✅ 关键修复：先撤销模拟，再真实落子
        board[move.row][move.col] = 0;

        // 现在棋盘干净，makeMove 可以安全执行
        makeMove(move.row, move.col);
        console.log(`🎯 AI 绝杀: (${move.row}, ${move.col})`);
        return;
      }

      // 撤销模拟（非绝杀）
      board[move.row][move.col] = 0;
    }

    // 🚩 第二步：正常搜索最佳走法
    let bestMove = moves[0];
    let bestScore = -Infinity;

    console.log("🤖 AI 开始思考（进化版基因）...");

    for (const move of moves) {
      if (board[move.row][move.col] !== 0) continue;

      board[move.row][move.col] = aiColor;
      currentPlayer = 3 - currentPlayer;

      const score = minimax(SEARCH_DEPTH - 1, -Infinity, Infinity, false);

      // 撤销模拟
      board[move.row][move.col] = 0;
      currentPlayer = 3 - currentPlayer;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    // 执行真实落子
    makeMove(bestMove.row, bestMove.col);
    console.log(`✅ AI 落子: (${bestMove.row}, ${bestMove.col}), 评分: ${bestScore}`);
  }

  // ===== 事件监听器 =====
  startBtn.addEventListener("click", () => {
    console.log("▶️ 用户点击开始游戏");
    playerColor = colorChoice.value === "black" ? 1 : 2;
    aiColor = 3 - playerColor;
    currentPlayer = 1;
    gameOver = false;
    board = Array(15).fill().map(() => Array(15).fill(0));
    createBoard();
    statusText.textContent = currentPlayer === playerColor ? "你的回合" : "AI先手";
    if (currentPlayer !== playerColor) {
      setTimeout(aiMove, 600);
    }
  });

  resetBtn.addEventListener("click", () => {
    console.log("🔄 重置游戏");
    board = Array(15).fill().map(() => Array(15).fill(0));
    gameOver = false;
    currentPlayer = 1;
    createBoard();
    statusText.textContent = currentPlayer === playerColor ? "你的回合" : "AI思考中...";
    if (currentPlayer !== playerColor) {
      setTimeout(aiMove, 600);
    }
  });

  restartBtn.addEventListener("click", () => {
    console.log("🔁 换边重来");
    playerColor = 3 - playerColor;
    aiColor = 3 - aiColor;
    currentPlayer = 1;
    gameOver = false;
    board = Array(15).fill().map(() => Array(15).fill(0));
    createBoard();
    statusText.textContent = currentPlayer === playerColor ? "你的回合" : "AI先手";
    if (currentPlayer !== playerColor) {
      setTimeout(aiMove, 600);
    }
  });

  // 初始化棋盘
  createBoard();
});