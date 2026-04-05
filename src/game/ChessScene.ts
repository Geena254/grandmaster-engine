import Phaser from 'phaser';
import { Howl } from 'howler';
import { BoardLogic, Piece, Position } from './logic';

export class ChessScene extends Phaser.Scene {
  private boardLogic!: BoardLogic;
  private pieceSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  private selectedPos: Position | null = null;
  private tileSize!: number;
  private isMuted: boolean = false;
  
  private sounds!: {
    move: Howl;
    capture: Howl;
    check: Howl;
    gameStart: Howl;
  };

  constructor() {
    super('ChessScene');
  }

  preload() {
    // We will use standard SVG icons for chess pieces
    // White pieces
    this.load.svg('white-pawn', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/wP.svg');
    this.load.svg('white-rook', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/wR.svg');
    this.load.svg('white-knight', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/wN.svg');
    this.load.svg('white-bishop', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/wB.svg');
    this.load.svg('white-queen', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/wQ.svg');
    this.load.svg('white-king', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/wK.svg');

    // Black pieces
    this.load.svg('black-pawn', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/bP.svg');
    this.load.svg('black-rook', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/bR.svg');
    this.load.svg('black-knight', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/bN.svg');
    this.load.svg('black-bishop', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/bB.svg');
    this.load.svg('black-queen', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/bQ.svg');
    this.load.svg('black-king', 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cardinal/bK.svg');
  }

  create() {
    this.tileSize = this.cameras.main.width / 8;
    this.boardLogic = new BoardLogic();
    this.gridGraphics = this.add.graphics();
    this.highlightGraphics = this.add.graphics();
    
    this.isMuted = localStorage.getItem('chess_muted') === 'true';

    this.sounds = {
      move: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.5 }),
      capture: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.6 }),
      check: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3'], volume: 0.7 }),
      gameStart: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2040/2040-preview.mp3'], volume: 0.4 })
    };

    this.drawBoard();
    this.initPieces();
    this.updateUI();

    this.input.on('pointerdown', this.handlePointerDown, this);

    this.game.events.on('reset-game', () => {
      this.boardLogic.reset();
      this.refreshBoard();
      this.updateUI();
    });

    this.game.events.on('toggle-mute', (muted: boolean) => {
      this.isMuted = muted;
    });

    if (!this.isMuted) this.sounds.gameStart.play();
  }

  private drawBoard() {
    this.gridGraphics.clear();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        this.gridGraphics.fillStyle(isLight ? 0xEAD9B5 : 0xB58863);
        this.gridGraphics.fillRect(c * this.tileSize, r * this.tileSize, this.tileSize, this.tileSize);
      }
    }
  }

  private initPieces() {
    // Clear existing sprites
    this.pieceSprites.forEach(s => s.destroy());
    this.pieceSprites.clear();

    const board = this.boardLogic.getBoard();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          this.createPieceSprite(r, c, piece);
        }
      }
    }
  }

  private createPieceSprite(r: number, c: number, piece: Piece) {
    const x = c * this.tileSize + this.tileSize / 2;
    const y = r * this.tileSize + this.tileSize / 2;
    const key = `${piece.color}-${piece.type}`;
    const sprite = this.add.sprite(x, y, key).setDisplaySize(this.tileSize * 0.9, this.tileSize * 0.9);
    this.pieceSprites.set(`${r},${c}`, sprite);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.boardLogic.getWinner()) return;

    const c = Math.floor(pointer.x / this.tileSize);
    const r = Math.floor(pointer.y / this.tileSize);

    if (r < 0 || r >= 8 || c < 0 || c >= 8) return;

    const clickedPos: Position = { r, c };
    const board = this.boardLogic.getBoard();
    const piece = board[r][c];

    if (this.selectedPos) {
      // Try to move
      const moveResult = this.boardLogic.move(this.selectedPos, clickedPos);
      if (moveResult.success) {
        this.selectedPos = null;
        this.refreshBoard();
        this.playMoveSound(moveResult.captured);
        this.updateUI();
      } else {
        // Change selection if clicking another piece of the same color
        if (piece && piece.color === this.boardLogic.getTurn()) {
          this.selectedPos = clickedPos;
          this.drawHighlights();
        } else {
          this.selectedPos = null;
          this.drawHighlights();
        }
      }
    } else {
      // Select piece
      if (piece && piece.color === this.boardLogic.getTurn()) {
        this.selectedPos = clickedPos;
        this.drawHighlights();
      }
    }
  }

  private drawHighlights() {
    this.highlightGraphics.clear();
    if (!this.selectedPos) return;

    // Highlight selected square
    this.highlightGraphics.fillStyle(0xffff00, 0.4);
    this.highlightGraphics.fillRect(
      this.selectedPos.c * this.tileSize, 
      this.selectedPos.r * this.tileSize, 
      this.tileSize, 
      this.tileSize
    );

    // Highlight valid moves
    const validMoves = this.boardLogic.getValidMoves(this.selectedPos);
    validMoves.forEach(move => {
      const board = this.boardLogic.getBoard();
      const isCapture = board[move.r][move.c] !== null;
      
      this.highlightGraphics.fillStyle(isCapture ? 0xff0000 : 0x00ff00, 0.3);
      this.highlightGraphics.beginPath();
      this.highlightGraphics.arc(
        move.c * this.tileSize + this.tileSize / 2,
        move.r * this.tileSize + this.tileSize / 2,
        this.tileSize / 4,
        0,
        Math.PI * 2
      );
      this.highlightGraphics.fill();
    });
  }

  private refreshBoard() {
    this.highlightGraphics.clear();
    this.initPieces();
  }

  private playMoveSound(captured: boolean) {
    if (this.isMuted) return;
    if (this.boardLogic.isKingInCheck(this.boardLogic.getTurn())) {
      this.sounds.check.play();
    } else if (captured) {
      this.sounds.capture.play();
    } else {
      this.sounds.move.play();
    }
  }

  private updateUI() {
    this.game.events.emit('update-ui', {
      turn: this.boardLogic.getTurn(),
      isCheck: this.boardLogic.isKingInCheck(this.boardLogic.getTurn()),
      isCheckmate: !!this.boardLogic.getWinner(),
      winner: this.boardLogic.getWinner(),
      moveHistory: this.boardLogic.getMoveHistory()
    });
  }
}