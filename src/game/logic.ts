export type Color = 'white' | 'black';
export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Position {
  r: number;
  c: number;
}

export class BoardLogic {
  private board: (Piece | null)[][] = [];
  private turn: Color = 'white';
  private winner: string | null = null;
  private moveHistory: string[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    this.turn = 'white';
    this.winner = null;
    this.moveHistory = [];
    this.setupBoard();
  }

  private setupBoard() {
    const layout: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    
    // Pieces
    for (let i = 0; i < 8; i++) {
      this.board[0][i] = { type: layout[i], color: 'black' };
      this.board[1][i] = { type: 'pawn', color: 'black' };
      this.board[6][i] = { type: 'pawn', color: 'white' };
      this.board[7][i] = { type: layout[i], color: 'white' };
    }
  }

  getBoard() { return this.board; }
  getTurn() { return this.turn; }
  getWinner() { return this.winner; }
  getMoveHistory() { return this.moveHistory; }

  move(from: Position, to: Position): { success: boolean; captured: boolean } {
    const piece = this.board[from.r][from.c];
    if (!piece || piece.color !== this.turn) return { success: false, captured: false };

    const validMoves = this.getValidMoves(from);
    const isValid = validMoves.some(m => m.r === to.r && m.c === to.c);

    if (isValid) {
      const captured = this.board[to.r][to.c] !== null;
      
      // Perform move
      const targetPiece = this.board[to.r][to.c];
      this.board[to.r][to.c] = piece;
      this.board[from.r][from.c] = null;

      // Handle pawn promotion (automatic to queen for simplicity)
      if (piece.type === 'pawn' && (to.r === 0 || to.r === 7)) {
        piece.type = 'queen';
      }

      // Record move
      this.moveHistory.push(this.toNotation(piece, from, to, captured));

      // Switch turn
      this.turn = this.turn === 'white' ? 'black' : 'white';

      // Check for checkmate
      if (this.isCheckmate(this.turn)) {
        this.winner = this.turn === 'white' ? 'black' : 'white';
      }

      return { success: true, captured };
    }

    return { success: false, captured: false };
  }

  getValidMoves(pos: Position): Position[] {
    const piece = this.board[pos.r][pos.c];
    if (!piece) return [];

    let moves: Position[] = [];
    const { r, c } = pos;

    switch (piece.type) {
      case 'pawn':
        const dir = piece.color === 'white' ? -1 : 1;
        // Forward 1
        if (this.isEmpty(r + dir, c)) {
          moves.push({ r: r + dir, c });
          // Forward 2
          const startRow = piece.color === 'white' ? 6 : 1;
          if (r === startRow && this.isEmpty(r + 2 * dir, c)) {
            moves.push({ r: r + 2 * dir, c });
          }
        }
        // Captures
        [ -1, 1 ].forEach(dc => {
          if (this.isEnemy(r + dir, c + dc, piece.color)) {
            moves.push({ r: r + dir, c: c + dc });
          }
        });
        break;

      case 'rook':
        moves = this.getSlidingMoves(pos, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
        break;

      case 'bishop':
        moves = this.getSlidingMoves(pos, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
        break;

      case 'queen':
        moves = this.getSlidingMoves(pos, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
        break;

      case 'knight':
        const kMoves = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
        kMoves.forEach(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          if (this.inBounds(nr, nc) && !this.isAlly(nr, nc, piece.color)) {
            moves.push({ r: nr, c: nc });
          }
        });
        break;

      case 'king':
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (this.inBounds(nr, nc) && !this.isAlly(nr, nc, piece.color)) {
              moves.push({ r: nr, c: nc });
            }
          }
        }
        break;
    }

    // Filter moves that leave the king in check
    return moves.filter(move => !this.moveLeavesKingInCheck(pos, move));
  }

  private getSlidingMoves(pos: Position, dirs: number[][]): Position[] {
    const piece = this.board[pos.r][pos.c]!;
    const moves: Position[] = [];
    dirs.forEach(([dr, dc]) => {
      let nr = pos.r + dr, nc = pos.c + dc;
      while (this.inBounds(nr, nc)) {
        if (this.isEmpty(nr, nc)) {
          moves.push({ r: nr, c: nc });
        } else {
          if (this.isEnemy(nr, nc, piece.color)) {
            moves.push({ r: nr, c: nc });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    });
    return moves;
  }

  private moveLeavesKingInCheck(from: Position, to: Position): boolean {
    const piece = this.board[from.r][from.c];
    const target = this.board[to.r][to.c];
    
    // Simulate
    this.board[to.r][to.c] = piece;
    this.board[from.r][from.c] = null;
    const color = piece!.color;
    
    const inCheck = this.isKingInCheck(color);
    
    // Revert
    this.board[from.r][from.c] = piece;
    this.board[to.r][to.c] = target;
    
    return inCheck;
  }

  isKingInCheck(color: Color): boolean {
    const kingPos = this.findKing(color);
    if (!kingPos) return false;

    const enemyColor = color === 'white' ? 'black' : 'white';
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === enemyColor) {
          // We don't use getValidMoves here because it would cause infinite recursion
          // We use a simpler "can piece hit square" check
          if (this.canPieceHitSquare({ r, c }, kingPos)) return true;
        }
      }
    }
    return false;
  }

  private canPieceHitSquare(from: Position, target: Position): boolean {
    const piece = this.board[from.r][from.c]!;
    const dr = target.r - from.r;
    const dc = target.c - from.c;

    switch (piece.type) {
      case 'pawn':
        const dir = piece.color === 'white' ? -1 : 1;
        return dr === dir && Math.abs(dc) === 1;
      case 'knight':
        return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
      case 'king':
        return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
      case 'rook':
        if (dr !== 0 && dc !== 0) return false;
        return this.isPathClear(from, target);
      case 'bishop':
        if (Math.abs(dr) !== Math.abs(dc)) return false;
        return this.isPathClear(from, target);
      case 'queen':
        if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return false;
        return this.isPathClear(from, target);
    }
    return false;
  }

  private isPathClear(from: Position, to: Position): boolean {
    const dr = Math.sign(to.r - from.r);
    const dc = Math.sign(to.c - from.c);
    let r = from.r + dr;
    let c = from.c + dc;
    while (r !== to.r || c !== to.c) {
      if (this.board[r][c] !== null) return false;
      r += dr;
      c += dc;
    }
    return true;
  }

  private findKing(color: Color): Position | null {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type === 'king' && p.color === color) return { r, c };
      }
    }
    return null;
  }

  private isCheckmate(color: Color): boolean {
    if (!this.isKingInCheck(color)) return false;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === color) {
          const moves = this.getValidMoves({ r, c });
          if (moves.length > 0) return false;
        }
      }
    }
    return true;
  }

  private inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  private isEmpty(r: number, c: number) { return this.inBounds(r, c) && this.board[r][c] === null; }
  private isAlly(r: number, c: number, color: Color) { 
    return this.inBounds(r, c) && this.board[r][c] !== null && this.board[r][c]!.color === color; 
  }
  private isEnemy(r: number, c: number, color: Color) { 
    return this.inBounds(r, c) && this.board[r][c] !== null && this.board[r][c]!.color !== color; 
  }

  private toNotation(piece: Piece, from: Position, to: Position, captured: boolean): string {
    const files = 'abcdefgh';
    const ranks = '87654321';
    const p = piece.type === 'pawn' ? '' : piece.type[0].toUpperCase();
    const cap = captured ? 'x' : '';
    return `${p}${files[from.c]}${ranks[from.r]}${cap}${files[to.c]}${ranks[to.r]}`;
  }
}