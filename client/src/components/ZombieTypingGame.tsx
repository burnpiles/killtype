import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { getRandomBossSentence } from '@/lib/bossSentences';
import { flushSync } from 'react-dom';

type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';
type SpecialWeapon = 'grenade' | 'rocket' | 'machinegun' | 'bazooka' | 'nuke' | null;
type MenuScreen = 'home' | 'leaderboard';

// Boss/Progression
export const BOSS_THRESHOLD: Record<Difficulty, number> = {
  easy: 10,
  normal: 15,
  hard: 20,
  extreme: 30,
};

const MAX_LIVES = 5;
const PIXEL_HEART = [
  '0110110',
  '1111111',
  '1111111',
  '0111110',
  '0011100',
  '0001000',
];

type BossPartName = 'leftHand' | 'rightHand' | 'leftFoot' | 'rightFoot' | 'head';

interface BossPart {
  id: string;
  part: BossPartName;
  word: string;
  index: number;
  destroyed: boolean;
  x: number;
  y: number;
}

interface BossState {
  active: boolean;
  x: number;
  y: number;
  scale: number;
  appendages: BossPart[];
  phase: 'appendages' | 'sentence';
  sentence: string;
  sentenceIndex: number;
  entering?: boolean;
}

interface Zombie {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  word: string;
  currentIndex: number;
  health: number;
  maxHealth: number;
  speed: number;
  color: string;
  isTargeted: boolean;
  isClosest: boolean;
  animFrame: number;
  deathAnim?: number;
  specialWeapon: SpecialWeapon;
  behavior?: 'normal' | 'zigzag' | 'sprinter';
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  trail: { x: number; y: number }[];
  weaponType: string;
}

interface EnemyProjectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  kind: 'laser';
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'blood' | 'explosion' | 'muzzle' | 'sparks' | 'nuke' | 'gib';
}

interface BloodStain {
  id: string;
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

interface Corpse {
  id: string;
  x: number;
  y: number;
  age: number;
  maxAge: number;
  exploded: boolean;
}

interface GameState {
  zombies: Zombie[];
  bullets: Bullet[];
  enemyBullets: EnemyProjectile[];
  particles: Particle[];
  bloodStains: BloodStain[];
  corpses: Corpse[];
  player: { x: number; y: number };
  currentTargetId: string | null;
  score: number; // kept for compatibility; mirrors kills
  // Progression
  kills: number;
  killsTowardsBoss: number;
  // Accuracy
  correctKeys: number;
  mistakes: number;
  accuracyPct: number;
  fireRateMultiplier: number;
  lives: number;
  level: number;
  gameTime: number;
  lastSpawn: number;
  combo: number;
  wpm: number;
  totalTyped: number;
  gameStartTime: number;
  shake: number;
  difficulty: Difficulty;
  gameStarted: boolean;
  currentWeapon: string;
  weaponAmmo: number;
  weaponTimeLeft: number;
  showMenu: boolean;
  menuAnimation: number;
  centerMessage: string;
  centerSubMessage: string;
  centerMessageUntil: number;
  chapterTransitionUntil: number;
  // Boss
  boss: BossState;
  lastBossAttackAt: number;
  bossSpawnedAt: number;
}

interface LeaderboardEntry {
  id: number;
  username: string;
  score: number;
  difficulty: Difficulty;
  wpm: number;
  accuracyPct: number;
  createdAt: number;
}

interface LeaderboardQualification {
  qualifies: boolean;
  rank: number | null;
  limit: number;
  totalEntries: number;
  lowestScore: number | null;
}

type LeaderboardBoards = Record<Difficulty, LeaderboardEntry[]>;

const WORDS = {
  easy: [
    'zombie', 'brain', 'death', 'blood', 'skull', 'grave', 'fear', 'dark',
    'shadow', 'monster', 'undead', 'weapon', 'bullet', 'reload', 'ammo'
  ],
  normal: [
    'zombie', 'brain', 'death', 'blood', 'skull', 'grave', 'horror', 'terror',
    'nightmare', 'fear', 'darkness', 'shadow', 'monster', 'creature', 'undead',
    'survival', 'weapon', 'bullet', 'gunshot', 'reload', 'ammo', 'headshot'
  ],
  hard: [
    'zombie', 'brain', 'death', 'blood', 'skull', 'grave', 'horror', 'terror',
    'nightmare', 'fear', 'darkness', 'shadow', 'monster', 'creature', 'undead',
    'apocalypse', 'survival', 'weapon', 'bullet', 'gunshot', 'reload', 'ammo',
    'headshot', 'critical', 'damage', 'destroy', 'eliminate', 'annihilate',
    'massacre', 'carnage', 'slaughter', 'rampage', 'butcher', 'mutilate'
  ],
  extreme: [
    'abomination', 'apocalyptic', 'annihilation', 'bloodthirsty', 'carnivorous',
    'decomposition', 'extermination', 'hemorrhaging', 'incineration', 'liquefaction',
    'metamorphosis', 'necromancy', 'obliteration', 'putrefaction', 'resurrection',
    'strangulation', 'transformation', 'undifferentiated', 'vaporization', 'weaponization',
    'xenogenesis', 'zombification', 'catastrophic', 'disintegration', 'experimentation',
    'hallucination', 'intimidation', 'jurisdiction', 'manifestation', 'neutralization'
  ]
};

const DIFFICULTY_CONFIG = {
  easy: { zombieMultiplier: 0.5, maxZombies: 3, spawnRate: 2500, description: 'Cleaner lanes, softer zombies, more drops' },
  normal: { zombieMultiplier: 0.7, maxZombies: 4, spawnRate: 2000, description: 'Balanced rush, mixed behaviors, fair drops' },
  hard: { zombieMultiplier: 1.0, maxZombies: 6, spawnRate: 1500, description: 'Aggressive packs, more sprinters, hotter drops' },
  extreme: { zombieMultiplier: 1.0, maxZombies: 6, spawnRate: 1200, description: 'Fast swarms, brutal patterns, volatile drops' }
};

const DIFFICULTY_PERSONALITY = {
  easy: {
    speedBonus: -2,
    specialDropBase: 0.2,
    behaviorWeights: { normal: 0.78, zigzag: 0.17, sprinter: 0.05 },
    weaponPool: ['grenade', 'machinegun', 'rocket'] as SpecialWeapon[],
  },
  normal: {
    speedBonus: 0,
    specialDropBase: 0.16,
    behaviorWeights: { normal: 0.58, zigzag: 0.24, sprinter: 0.18 },
    weaponPool: ['grenade', 'rocket', 'machinegun', 'bazooka'] as SpecialWeapon[],
  },
  hard: {
    speedBonus: 2,
    specialDropBase: 0.18,
    behaviorWeights: { normal: 0.38, zigzag: 0.32, sprinter: 0.3 },
    weaponPool: ['grenade', 'rocket', 'machinegun', 'bazooka', 'bazooka', 'nuke'] as SpecialWeapon[],
  },
  extreme: {
    speedBonus: 5,
    specialDropBase: 0.2,
    behaviorWeights: { normal: 0.22, zigzag: 0.33, sprinter: 0.45 },
    weaponPool: ['rocket', 'machinegun', 'bazooka', 'bazooka', 'nuke', 'nuke'] as SpecialWeapon[],
  },
} as const;

const SPECIAL_WEAPONS = {
  grenade: { name: 'GRENADE', ammo: 3, duration: 0, damage: 2, areaDamage: 1, color: '#ffaa00' },
  rocket: { name: 'ROCKET LAUNCHER', ammo: 5, duration: 0, damage: 3, areaDamage: 2, color: '#ff0000' },
  machinegun: { name: 'MACHINE GUN', ammo: 0, duration: 15000, damage: 1, areaDamage: 0, color: '#00ff00' },
  bazooka: { name: 'BAZOOKA', ammo: 2, duration: 0, damage: 4, areaDamage: 3, color: '#ff00ff' },
  nuke: { name: 'NUCLEAR LAUNCHER', ammo: 1, duration: 0, damage: 999, areaDamage: 999, color: '#00ffff' }
};

// Base weapon damage values
const WEAPON_DAMAGE = {
  pistol: 1,        // Base damage
  grenade: 2,       // 2x pistol damage
  rocket: 3,        // 3x pistol damage
  machinegun: 1,    // Same as pistol but rapid fire
  bazooka: 4,       // 4x pistol damage
  nuke: 999         // Instant kill everything
};

const WEAPON_BEHAVIOR = {
  pistol: { label: 'SINGLE', splashRadius: 0, maxCollateral: 0, clearProjectiles: false, wipeField: false },
  grenade: { label: 'BLAST', splashRadius: 78, maxCollateral: 2, clearProjectiles: false, wipeField: false },
  rocket: { label: 'SPRAY', splashRadius: 128, maxCollateral: 4, clearProjectiles: false, wipeField: false },
  machinegun: { label: 'CHAIN', splashRadius: 96, maxCollateral: 1, clearProjectiles: false, wipeField: false },
  bazooka: { label: 'SIEGE', splashRadius: 190, maxCollateral: 99, clearProjectiles: false, wipeField: false },
  nuke: { label: 'PURGE', splashRadius: 9999, maxCollateral: 999, clearProjectiles: true, wipeField: true },
} as const;

const LEADERBOARD_LIMIT = 10;
const createEmptyLeaderboards = (): LeaderboardBoards => ({
  easy: [],
  normal: [],
  hard: [],
  extreme: [],
});

function fireRateFromAccuracy(acc: number): number {
  if (acc >= 97) return 1.5;
  if (acc >= 93) return 1.25;
  if (acc >= 85) return 1.1;
  return 1.0;
}

function projectileSpeedForWeapon(weaponType: string, _fireRateMultiplier: number): number {
  const base = weaponType === 'machinegun' ? 5200 :
    weaponType === 'pistol' ? 4200 :
    weaponType === 'rocket' ? 3200 :
    weaponType === 'bazooka' ? 3000 :
    weaponType === 'grenade' ? 2600 :
    weaponType === 'nuke' ? 7000 :
    3600;
  return base;
}

export function ZombieTypingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContext = useRef<AudioContext | null>(null);
  const isMobile = useIsMobile();
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const activeBossPartRef = useRef<string | null>(null);
  const renderPixelHeart = (filled: boolean, pixelSize: number) => (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${PIXEL_HEART[0].length}, ${pixelSize}px)`,
        gridAutoRows: `${pixelSize}px`,
        gap: pixelSize <= 2 ? 0.5 : 1,
      }}
    >
      {PIXEL_HEART.flatMap((row, rowIndex) =>
        row.split('').map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            style={{
              width: pixelSize,
              height: pixelSize,
              backgroundColor: cell === '1'
                ? (filled ? '#ff5a7a' : '#253348')
                : 'transparent',
              boxShadow: cell === '1' && filled ? '0 0 4px rgba(255, 90, 122, 0.55)' : 'none',
            }}
          />
        )),
      )}
    </div>
  );
  const difficultyTextColor = {
    easy: '#00ff88',
    normal: '#ffaa00',
    hard: '#ff6666',
    extreme: '#ff00ff',
  } as const;
  
  const [gameState, setGameState] = useState<GameState>({
    zombies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    bloodStains: [],
    corpses: [],
    player: { x: 600, y: 400 },
    currentTargetId: null,
    score: 0,
    kills: 0,
    killsTowardsBoss: 0,
    correctKeys: 0,
    mistakes: 0,
    accuracyPct: 100,
    fireRateMultiplier: 1.0,
    lives: MAX_LIVES,
    level: 1,
    gameTime: 0,
    lastSpawn: 0,
    combo: 0,
    wpm: 0,
    totalTyped: 0,
    gameStartTime: Date.now(),
    shake: 0,
    difficulty: 'hard',
    gameStarted: false,
    currentWeapon: 'pistol',
    weaponAmmo: 0,
    weaponTimeLeft: 0,
    showMenu: false,
    menuAnimation: 0,
    centerMessage: '',
    centerSubMessage: '',
    centerMessageUntil: 0,
    chapterTransitionUntil: 0,
    boss: {
      active: false,
      entering: false as any, // added dynamically on spawn
      x: 600,
      y: 250,
      scale: 5,
      appendages: [],
      phase: 'appendages',
      sentence: '',
      sentenceIndex: 0,
    },
    lastBossAttackAt: 0,
    bossSpawnedAt: 0,
  });
  const [currentInput, setCurrentInput] = useState('');
  const [leaderboards, setLeaderboards] = useState<LeaderboardBoards>(createEmptyLeaderboards());
  const [leaderboardTab, setLeaderboardTab] = useState<Difficulty>('hard');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [qualifyingResult, setQualifyingResult] = useState<LeaderboardQualification | null>(null);
  const [highScoreName, setHighScoreName] = useState('');
  const [submittedHighScore, setSubmittedHighScore] = useState<(LeaderboardEntry & { rank: number }) | null>(null);
  const [submittingHighScore, setSubmittingHighScore] = useState(false);
  const [menuScreen, setMenuScreen] = useState<MenuScreen>('home');
  const [isCompactDevice, setIsCompactDevice] = useState(false);
  const [desktopNoticeDismissed, setDesktopNoticeDismissed] = useState(false);
  const [mobileHudExpanded, setMobileHudExpanded] = useState(false);
  const [viewportMetrics, setViewportMetrics] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
    visualHeight: typeof window !== 'undefined' ? window.innerHeight : 844,
  }));
  const activeSessionRef = useRef<{
    word: string;
    progress: number;
    targetId: string;
    startedAt: number;
  } | null>(null);
  const qualificationCheckedRef = useRef<string>('');
  const renderLeaderboardBoard = (difficulty: Difficulty, limit: number = LEADERBOARD_LIMIT) => {
    const board = leaderboards[difficulty].slice(0, limit);
    return (
      <div
        className={`border rounded-lg bg-black/70 ${isTouchLayout ? 'p-3' : 'p-4'}`}
        style={{
          borderColor: difficultyTextColor[difficulty],
          boxShadow: `0 0 14px ${difficultyTextColor[difficulty]}33`,
        }}
      >
        <div
          className={`${isTouchLayout ? 'text-xs mb-2' : 'text-sm mb-3'} font-mono font-bold`}
          style={{ color: difficultyTextColor[difficulty], letterSpacing: '2px' }}
        >
          {difficulty.toUpperCase()} TOP {limit}
        </div>
        <div className="space-y-2">
          {board.length === 0 ? (
            <div className="text-xs font-mono text-white/50">NO SCORES YET</div>
          ) : board.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between gap-3 font-mono rounded px-2 py-1 ${isTouchLayout ? 'text-xs' : 'text-sm'}`}
              style={{
                backgroundColor: submittedHighScore?.id === entry.id ? `${difficultyTextColor[difficulty]}22` : 'transparent',
                boxShadow: submittedHighScore?.id === entry.id ? `0 0 10px ${difficultyTextColor[difficulty]}33` : 'none',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 text-white/60">{String(index + 1).padStart(2, '0')}</span>
                <span className={`text-white truncate ${isTouchLayout ? 'max-w-[90px]' : 'max-w-[120px]'}`}>{entry.username}</span>
              </div>
              <span className="text-yellow-300">{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isTouchLayout = isMobile || isCompactDevice;
  const keyboardInset = Math.max(0, viewportMetrics.height - viewportMetrics.visualHeight);
  const keyboardVisible = isTouchLayout && keyboardInset > 140;
  const mobileCanvasWidth = Math.max(320, Math.min(viewportMetrics.width - 12, 520));
  const mobileUiReserve = keyboardVisible
    ? (mobileHudExpanded ? 280 : 150)
    : (mobileHudExpanded ? 360 : 210);
  const mobileCanvasHeight = Math.max(220, Math.min(viewportMetrics.visualHeight - mobileUiReserve, 760));
  const CANVAS_WIDTH = isTouchLayout ? mobileCanvasWidth : 1200;
  const CANVAS_HEIGHT = isTouchLayout ? mobileCanvasHeight : 800;
  const GAME_AREA = isTouchLayout
    ? { x: 16, y: 58, width: CANVAS_WIDTH - 32, height: CANVAS_HEIGHT - 132 }
    : { x: 200, y: 100, width: 800, height: 600 };

  // Initialize audio
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  // Generate random word based on difficulty (hoisted for boss helpers)
  const getRandomWord = useCallback((difficulty: Difficulty) => {
    const wordSet = WORDS[difficulty];
    return wordSet[Math.floor(Math.random() * wordSet.length)];
  }, [GAME_AREA.height, GAME_AREA.width, GAME_AREA.x, GAME_AREA.y]);

  // --- Boss helpers ---
  const getBossPartPosition = useCallback((boss: BossState, part: BossPartName) => {
    // Base offsets from boss center
    let ox = 0, oy = 0;
    switch (part) {
      case 'leftHand':  ox = -110; oy = 20; break;
      case 'rightHand': ox = 110;  oy = 20; break;
      case 'leftFoot':  ox = -70;  oy = 120; break;
      case 'rightFoot': ox = 70;   oy = 120; break;
      case 'head':      ox = 0;    oy = -70; break;
    }
    let x = boss.x + ox;
    let y = boss.y + oy;
    // Clamp inside game area with small margins for visibility
    const margin = 10;
    x = Math.max(GAME_AREA.x + margin, Math.min(GAME_AREA.x + GAME_AREA.width - margin, x));
    y = Math.max(GAME_AREA.y + margin, Math.min(GAME_AREA.y + GAME_AREA.height - margin, y));
    return { x, y };
  }, [GAME_AREA.height, GAME_AREA.width, GAME_AREA.x, GAME_AREA.y]);

  const getNextBossPart = useCallback((boss: BossState) => {
    const order: BossPartName[] = ['head', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
    for (const partName of order) {
      const part = boss.appendages.find(p => p.part === partName && !p.destroyed);
      if (part) return part;
    }
    return null;
  }, []);

  const placeTagNearAnchor = useCallback((
    anchorX: number,
    anchorY: number,
    width: number,
    height: number,
    placedRects: Array<{x:number;y:number;w:number;h:number}>,
  ) => {
    const minX = GAME_AREA.x + 8;
    const maxX = GAME_AREA.x + GAME_AREA.width - width - 8;
    const minY = GAME_AREA.y + 8;
    const maxY = GAME_AREA.y + GAME_AREA.height - height - 8;

    const intersects = (a:{x:number;y:number;w:number;h:number}, b:{x:number;y:number;w:number;h:number}) =>
      !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

    const baseX = Math.max(minX, Math.min(maxX, anchorX - width / 2));
    const baseY = Math.max(minY, Math.min(maxY, anchorY - 50));
    const candidates: Array<{x:number;y:number;w:number;h:number}> = [];

    for (let ring = 0; ring <= 10; ring++) {
      const dx = ring * 16;
      const dy = ring * 14;
      const xs = ring === 0 ? [baseX] : [baseX, baseX - dx, baseX + dx];
      const ys = ring === 0 ? [baseY] : [baseY - dy, baseY, baseY + dy];
      for (const y of ys) {
        for (const x of xs) {
          candidates.push({
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y)),
            w: width,
            h: height,
          });
        }
      }
    }

    const chosen = candidates.find(candidate => !placedRects.some(r => intersects(candidate, r))) ?? candidates[0];
    placedRects.push(chosen);
    return chosen;
  }, []);

  const createBoss = useCallback((difficulty: Difficulty): BossState => {
    const cx = CANVAS_WIDTH / 2;
    const cy = GAME_AREA.y - 180; // start off-screen for stomp entrance
    const parts: BossPart[] = [
      { id: 'leftHand', part: 'leftHand', word: getRandomWord(difficulty), index: 0, destroyed: false, x: cx - 110, y: cy + 20 },
      { id: 'rightHand', part: 'rightHand', word: getRandomWord(difficulty), index: 0, destroyed: false, x: cx + 110, y: cy + 20 },
      { id: 'leftFoot', part: 'leftFoot', word: getRandomWord(difficulty), index: 0, destroyed: false, x: cx - 70, y: cy + 120 },
      { id: 'rightFoot', part: 'rightFoot', word: getRandomWord(difficulty), index: 0, destroyed: false, x: cx + 70, y: cy + 120 },
      { id: 'head', part: 'head', word: getRandomWord(difficulty), index: 0, destroyed: false, x: cx, y: cy - 70 },
    ];
    return {
      active: true,
      x: cx,
      y: cy,
      scale: 5,
      appendages: parts,
      phase: 'appendages',
      sentence: getRandomBossSentence(difficulty),
      sentenceIndex: 0,
      // dynamic fields (type widened earlier)
      entering: true as any,
    };
  }, [CANVAS_WIDTH, GAME_AREA.y, getRandomWord]);

  const drawBoss = useCallback((ctx: CanvasRenderingContext2D, boss: BossState, time: number, placedRects?: Array<{x:number;y:number;w:number;h:number}>) => {
    if (!boss.active) return;
    const x = boss.x;
    const y = boss.y;
    const activePart = boss.phase === 'appendages' ? getNextBossPart(boss) : null;
    // 8-bit styled body with strong outlines
    ctx.save();
    ctx.fillStyle = '#1b1b2f';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    // Torso
    ctx.fillRect(x - 60, y - 40, 120, 160);
    ctx.strokeRect(x - 60, y - 40, 120, 160);
    // Head
    ctx.fillStyle = '#222244';
    ctx.fillRect(x - 40, y - 90, 80, 50);
    ctx.strokeRect(x - 40, y - 90, 80, 50);
    // Eyes (laser emitters)
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x - 18, y - 72, 12, 10);
    ctx.fillRect(x + 6, y - 72, 12, 10);
    // Arms/legs anchors
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(x - 90, y - 10, 30, 20); // left arm base
    ctx.fillRect(x + 60, y - 10, 30, 20); // right arm base
    ctx.fillRect(x - 40, y + 90, 20, 30); // left leg base
    ctx.fillRect(x + 20, y + 90, 20, 30); // right leg base
    ctx.restore();
    // Appendage word banners
    boss.appendages.forEach((p, idx) => {
      const pos = getBossPartPosition(boss, p.part);
      const isNextTarget = activePart?.id === p.id;
      if (p.destroyed) {
        // Draw a destroyed marker
        ctx.save();
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(pos.x - 40, pos.y - 20, 80, 28);
        ctx.setLineDash([]);
        ctx.restore();
        return;
      }
      const word = p.word;
      const pulseScale = isNextTarget ? (1 + (Math.sin(time / 120) * 0.08 + 0.12)) : 1;
      const width = (word.length * 14 + 20) * pulseScale;
      const tagHeight = isNextTarget ? 32 : 28;
      let wordX = pos.x - width / 2;
      let wordY = pos.y - (isNextTarget ? 45 : 35);
      if (placedRects) {
        const tag = placeTagNearAnchor(pos.x, pos.y, width, tagHeight, placedRects);
        wordX = tag.x;
        wordY = tag.y;
      }
      // Banner: dark background, cyan outline, white text
      ctx.fillStyle = isNextTarget ? '#08263d' : '#001a33';
      ctx.fillRect(wordX, wordY, width, tagHeight);
      ctx.strokeStyle = isNextTarget ? '#ffd54a' : '#00ffff';
      ctx.lineWidth = isNextTarget ? 3 : 2;
      ctx.setLineDash(isNextTarget ? [] : [5, 5]);
      ctx.lineDashOffset = (time / 50) % 10;
      ctx.strokeRect(wordX, wordY, width, tagHeight);
      ctx.setLineDash([]);
      if (isNextTarget) {
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd54a';
        ctx.fillText('NEXT', wordX + width / 2, wordY - 6);
      }
      // Text
      ctx.font = isNextTarget ? 'bold 18px monospace' : 'bold 16px monospace';
      ctx.textAlign = 'left';
      for (let i = 0; i < word.length; i++) {
        const step = isNextTarget ? 15 : 14;
        const charX = wordX + 10 + (i * step);
        const charY = wordY + (isNextTarget ? 21 : 19);
        if (i < p.index) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.strokeText(word[i], charX, charY);
          ctx.fillStyle = '#00ff00';
          ctx.fillText(word[i], charX, charY);
        } else if (i === p.index) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = isNextTarget ? 4 : 3;
          ctx.strokeText(word[i], charX, charY);
          ctx.fillStyle = '#ffd54a'; // softer yellow
          ctx.fillText(word[i], charX, charY);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillText(word[i], charX, charY);
        }
      }
    });
    if (boss.phase === 'sentence') {
      const panelW = Math.min(GAME_AREA.width - 80, Math.max(420, boss.sentence.length * 9 + 60));
      const panelH = 54;
      const panelX = GAME_AREA.x + (GAME_AREA.width - panelW) / 2;
      const panelY = GAME_AREA.y + GAME_AREA.height - 110;
      ctx.fillStyle = 'rgba(8, 16, 30, 0.94)';
      ctx.strokeStyle = '#ffd54a';
      ctx.lineWidth = 3;
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeRect(panelX, panelY, panelW, panelH);
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#8fb3c9';
      ctx.fillText('EXECUTION PHASE', panelX + panelW / 2, panelY + 16);
      const letters = boss.sentence.split('');
      const spacing = 9;
      const textWidth = letters.length * spacing;
      let textX = panelX + (panelW - textWidth) / 2;
      const textY = panelY + 39;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      letters.forEach((letter, index) => {
        if (letter === ' ') {
          textX += spacing;
          return;
        }
        ctx.fillStyle = index < boss.sentenceIndex ? '#00ffff' : index === boss.sentenceIndex ? '#ffd54a' : '#ffffff';
        ctx.fillText(letter, textX, textY);
        textX += spacing;
      });
    }
  }, [getBossPartPosition, getNextBossPart, placeTagNearAnchor]);
  useEffect(() => {
    const compactViewport = window.matchMedia('(max-width: 1024px)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const updateCompactDevice = () => {
      const isCompact = compactViewport.matches || coarsePointer.matches || window.innerWidth <= 1024;
      setIsCompactDevice(isCompact);
    };

    updateCompactDevice();
    compactViewport.addEventListener('change', updateCompactDevice);
    coarsePointer.addEventListener('change', updateCompactDevice);
    window.addEventListener('resize', updateCompactDevice);

    return () => {
      compactViewport.removeEventListener('change', updateCompactDevice);
      coarsePointer.removeEventListener('change', updateCompactDevice);
      window.removeEventListener('resize', updateCompactDevice);
    };
  }, []);

  useEffect(() => {
    const updateViewportMetrics = () => {
      const visualViewport = window.visualViewport;
      setViewportMetrics({
        width: window.innerWidth,
        height: window.innerHeight,
        visualHeight: Math.round(visualViewport?.height ?? window.innerHeight),
      });
    };

    updateViewportMetrics();
    window.addEventListener('resize', updateViewportMetrics);
    window.visualViewport?.addEventListener('resize', updateViewportMetrics);

    return () => {
      window.removeEventListener('resize', updateViewportMetrics);
      window.visualViewport?.removeEventListener('resize', updateViewportMetrics);
    };
  }, []);

  const focusTypingInput = useCallback(() => {
    if (!isTouchLayout) return;

    requestAnimationFrame(() => {
      mobileInputRef.current?.focus();
    });
    setTimeout(() => {
      mobileInputRef.current?.focus();
    }, 60);
  }, [isTouchLayout]);

  // Ensure soft keyboard appears on mobile during gameplay
  useEffect(() => {
    if (isTouchLayout && gameState.gameStarted) {
      focusTypingInput();
    }
  }, [focusTypingInput, gameState.gameStarted, isTouchLayout]);

  useEffect(() => {
    if (keyboardVisible) {
      setMobileHudExpanded(false);
    }
  }, [keyboardVisible]);

  // (Boss helpers moved below getRandomWord declaration)

  // Play sound effect
  const playSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' = 'sine') => {
    if (!audioContext.current) return;
    
    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.current.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.current.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.1, audioContext.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration);
    
    oscillator.start(audioContext.current.currentTime);
    oscillator.stop(audioContext.current.currentTime + duration);
  }, []);

  // Play epic menu music
  const playMenuMusic = useCallback(() => {
    if (!audioContext.current) return;
    
    // Epic orchestral-style menu music with harmonics
    const mainChord = [220, 277, 330, 440]; // A minor chord progression
    const harmony = [110, 165, 220]; // Bass harmony
    const sparkle = [880, 1100, 1320]; // High sparkle notes
    
    // Main chord progression
    mainChord.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.current!.createOscillator();
        const gainNode = audioContext.current!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.current!.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.current!.currentTime);
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.08, audioContext.current!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.current!.currentTime + 0.8);
        
        oscillator.start(audioContext.current!.currentTime);
        oscillator.stop(audioContext.current!.currentTime + 0.8);
      }, index * 150);
    });
    
    // Bass harmony
    harmony.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.current!.createOscillator();
        const gainNode = audioContext.current!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.current!.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.current!.currentTime);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.04, audioContext.current!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.current!.currentTime + 1.2);
        
        oscillator.start(audioContext.current!.currentTime);
        oscillator.stop(audioContext.current!.currentTime + 1.2);
      }, index * 300);
    });
    
    // High sparkle notes for magical effect
    sparkle.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.current!.createOscillator();
        const gainNode = audioContext.current!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.current!.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.current!.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.03, audioContext.current!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.current!.currentTime + 0.4);
        
        oscillator.start(audioContext.current!.currentTime);
        oscillator.stop(audioContext.current!.currentTime + 0.4);
      }, 600 + index * 100);
    });
  }, []);

  // Premium button hover sound
  const playButtonHover = useCallback(() => {
    if (!audioContext.current) return;
    
    [400, 600].forEach((freq, i) => {
      setTimeout(() => {
        const oscillator = audioContext.current!.createOscillator();
        const gainNode = audioContext.current!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.current!.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.current!.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.05, audioContext.current!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.current!.currentTime + 0.2);
        
        oscillator.start(audioContext.current!.currentTime);
        oscillator.stop(audioContext.current!.currentTime + 0.2);
      }, i * 50);
    });
  }, []);

  // Premium button click sound
  const playButtonClick = useCallback(() => {
    if (!audioContext.current) return;
    
    // Multi-layered click sound
    [800, 1200, 600].forEach((freq, i) => {
      setTimeout(() => {
        const oscillator = audioContext.current!.createOscillator();
        const gainNode = audioContext.current!.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.current!.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.current!.currentTime);
        oscillator.type = i === 0 ? 'square' : i === 1 ? 'sine' : 'triangle';
        
        gainNode.gain.setValueAtTime(i === 0 ? 0.1 : 0.06, audioContext.current!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.current!.currentTime + (i === 2 ? 0.3 : 0.15));
        
        oscillator.start(audioContext.current!.currentTime);
        oscillator.stop(audioContext.current!.currentTime + (i === 2 ? 0.3 : 0.15));
      }, i * 50);
    });
  }, []);

  // Toggle menu
  const toggleMenu = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      showMenu: !prev.showMenu,
      menuAnimation: Date.now()
    }));
    playMenuMusic();
  }, [playMenuMusic]);

  // Generate random word based on difficulty (defined above for boss helpers)

  // Generate random special weapon
  const getRandomSpecialWeapon = useCallback((): SpecialWeapon => {
    const profile = DIFFICULTY_PERSONALITY[gameState.difficulty];
    const chance = Math.random();
    
    // Difficulty and level both influence how often power drops appear.
    if (chance < Math.min(profile.specialDropBase + (gameState.level * 0.02), 0.45)) {
      return profile.weaponPool[Math.floor(Math.random() * profile.weaponPool.length)] ?? null;
    }
    return null;
  }, [gameState.difficulty, gameState.level]);

  const refreshLeaderboards = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError('');
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) throw new Error('Leaderboard fetch failed');
      const payload = await response.json();
      setLeaderboards(payload.boards ?? createEmptyLeaderboards());
    } catch (_error) {
      setLeaderboardError('Leaderboard offline');
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const checkLeaderboardQualification = useCallback(async (
    score: number,
    difficulty: Difficulty,
    wpm: number,
    accuracyPct: number,
  ) => {
    try {
      const response = await fetch('/api/leaderboard/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, difficulty, wpm, accuracyPct }),
      });
      if (!response.ok) throw new Error('Qualification failed');
      const payload = await response.json();
      setQualifyingResult(payload);
    } catch (_error) {
      setQualifyingResult(null);
      setLeaderboardError('Leaderboard offline');
    }
  }, []);

  const submitLeaderboardScore = useCallback(async () => {
    const trimmedName = highScoreName.trim();
    if (!trimmedName || submittingHighScore || gameState.lives > 0) return;

    setSubmittingHighScore(true);
    setLeaderboardError('');
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedName,
          score: gameState.score,
          difficulty: gameState.difficulty,
          wpm: gameState.wpm,
          accuracyPct: Math.round(gameState.accuracyPct),
        }),
      });
      if (!response.ok) throw new Error('Submit failed');
      const payload = await response.json();
      setLeaderboards(payload.boards ?? createEmptyLeaderboards());
      setSubmittedHighScore(payload.entry ?? null);
      setQualifyingResult(payload.qualification ?? null);
      setHighScoreName('');
    } catch (_error) {
      setLeaderboardError('Score submission failed');
    } finally {
      setSubmittingHighScore(false);
    }
  }, [gameState.accuracyPct, gameState.difficulty, gameState.lives, gameState.score, gameState.wpm, highScoreName, submittingHighScore]);

  // Start game with selected difficulty
  const startGame = useCallback((difficulty: Difficulty) => {
    setGameState(prev => ({
      ...prev,
      difficulty,
      gameStarted: true,
      gameStartTime: Date.now(),
      player: isTouchLayout ? { x: CANVAS_WIDTH / 2, y: GAME_AREA.y + GAME_AREA.height - 40 } : { x: 600, y: 400 },
      zombies: [],
      bullets: [],
      bloodStains: [],
      corpses: [],
      particles: [],
      score: 0,
      kills: 0,
      killsTowardsBoss: 0,
      correctKeys: 0,
      mistakes: 0,
      accuracyPct: 100,
      fireRateMultiplier: 1.0,
      lives: MAX_LIVES,
      level: 1,
      combo: 0,
      wpm: 0,
      totalTyped: 0,
      shake: 0,
      currentWeapon: 'pistol',
      weaponAmmo: 0,
      weaponTimeLeft: 0,
      showMenu: false,
      menuAnimation: 0,
      centerMessage: '',
      centerSubMessage: '',
      centerMessageUntil: 0,
      chapterTransitionUntil: 0,
      boss: {
        active: false,
        x: CANVAS_WIDTH / 2,
        y: GAME_AREA.y + 120,
        scale: 5,
        appendages: [],
        phase: 'appendages',
        sentence: '',
        sentenceIndex: 0,
      },
      enemyBullets: [],
      lastBossAttackAt: 0,
      bossSpawnedAt: 0,
    }));
    setCurrentInput('');
    setMobileHudExpanded(false);
    setMenuScreen('home');
    setLeaderboardTab(difficulty);
    setQualifyingResult(null);
    setHighScoreName('');
    setSubmittedHighScore(null);
    qualificationCheckedRef.current = '';
    activeBossPartRef.current = null;
  }, [isTouchLayout, CANVAS_WIDTH, GAME_AREA.height, GAME_AREA.y]);

  // Menu actions
  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, showMenu: false }));
    playSound(600, 0.2, 'sine');
  }, [playSound]);

  const restartGame = useCallback(() => {
    startGame(gameState.difficulty);
    playSound(800, 0.3, 'sine');
  }, [startGame, gameState.difficulty, playSound]);

  const quitToMenu = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gameStarted: false,
      showMenu: false,
      menuAnimation: 0
    }));
    setMobileHudExpanded(false);
    setMenuScreen('home');
    playSound(400, 0.5, 'sawtooth');
  }, [playSound]);

  useEffect(() => {
    refreshLeaderboards();
  }, [refreshLeaderboards]);

  useEffect(() => {
    if (!gameState.gameStarted || gameState.showMenu || gameState.lives <= 0) {
      refreshLeaderboards();
    }
  }, [gameState.gameStarted, gameState.lives, gameState.showMenu, refreshLeaderboards]);

  useEffect(() => {
    if (gameState.lives > 0 || gameState.score <= 0) return;
    const qualificationKey = [
      gameState.difficulty,
      gameState.score,
      gameState.wpm,
      Math.round(gameState.accuracyPct),
    ].join(':');
    if (qualificationCheckedRef.current === qualificationKey) return;
    qualificationCheckedRef.current = qualificationKey;
    setSubmittedHighScore(null);
    checkLeaderboardQualification(
      gameState.score,
      gameState.difficulty,
      gameState.wpm,
      Math.round(gameState.accuracyPct),
    );
  }, [checkLeaderboardQualification, gameState.accuracyPct, gameState.difficulty, gameState.lives, gameState.score, gameState.wpm]);

  // Update closest zombie targeting
  const updateClosestZombie = useCallback((zombies: Zombie[], playerPos: { x: number; y: number }) => {
    if (zombies.length === 0) return;

    // Clear all closest flags
    zombies.forEach(zombie => zombie.isClosest = false);

    // Don't auto-target if there's already a targeted zombie
    const hasTargeted = zombies.some(zombie => zombie.isTargeted);
    if (hasTargeted) return;

    // Find closest zombie
    let closestZombie = zombies[0];
    let closestDistance = Math.sqrt(
      Math.pow(closestZombie.x - playerPos.x, 2) + 
      Math.pow(closestZombie.y - playerPos.y, 2)
    );

    zombies.forEach(zombie => {
      const distance = Math.sqrt(
        Math.pow(zombie.x - playerPos.x, 2) + 
        Math.pow(zombie.y - playerPos.y, 2)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestZombie = zombie;
      }
    });

    closestZombie.isClosest = true;
  }, []);

  // Create particles
  const createParticles = useCallback((x: number, y: number, type: Particle['type'], count: number = 10) => {
    if (isTouchLayout) {
      count = Math.max(2, Math.ceil(count * 0.6));
    }
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        id: Date.now().toString() + Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * (type === 'nuke' ? 200 : type === 'gib' ? 260 : 100),
        vy: (Math.random() - 0.5) * (type === 'nuke' ? 200 : type === 'gib' ? 260 : 100),
        life: type === 'nuke' ? 3 : 1,
        maxLife: type === 'nuke' ? 3 : 1,
        color: type === 'blood' ? '#ff0000' : 
               type === 'explosion' ? '#ffaa00' :
               type === 'gib' ? '#aa2222' :
               type === 'nuke' ? '#00ffff' : '#ffff00',
        size: Math.random() * (type === 'nuke' ? 8 : type === 'gib' ? 6 : 4) + (type === 'nuke' ? 4 : type === 'gib' ? 3 : 2),
        type
      });
    }
    return particles;
  }, [isTouchLayout]);

  const startBossSentencePhase = useCallback((state: GameState) => {
    state.boss.phase = 'sentence';
    state.boss.sentenceIndex = 0;
    state.enemyBullets = [];
    state.currentTargetId = null;
    activeBossPartRef.current = null;
    setCurrentInput('');
    state.centerMessage = 'FINISH HIM';
    state.centerSubMessage = 'TYPE THE SENTENCE';
    state.centerMessageUntil = state.gameTime + 1600;
    state.lastBossAttackAt = state.gameTime;
    playSound(260, 0.6, 'square');
  }, [playSound]);

  const applyBossClearRewards = useCallback((state: GameState) => {
    state.level++;
    state.killsTowardsBoss = 0;
    state.enemyBullets = [];
    state.bullets = [];
    state.currentTargetId = null;
    activeSessionRef.current = null;
    activeBossPartRef.current = null;
    setCurrentInput('');
    state.particles.push(...createParticles(state.boss.x, state.boss.y, 'nuke', 80));
    state.particles.push(...createParticles(state.boss.x, state.boss.y, 'blood', 50));
    state.particles.push(...createParticles(state.boss.x, state.boss.y, 'gib', 32));
    const rewardText = state.lives < MAX_LIVES
      ? (state.accuracyPct > 90 ? 'PRECISION BONUS  LIVES FULL' : 'BOSS DOWN  LIVES FULL')
      : (state.accuracyPct > 90 ? 'PRECISION BONUS  PERFECT CLEAR' : 'BOSS DOWN');
    state.lives = MAX_LIVES;
    state.centerMessage = `CHAPTER ${state.level}`;
    state.centerSubMessage = rewardText;
    state.centerMessageUntil = state.gameTime + 2600;
    state.chapterTransitionUntil = state.gameTime + 3000;
    state.boss = {
      active: false,
      x: state.boss.x,
      y: state.boss.y,
      scale: state.boss.scale,
      appendages: [],
      phase: 'appendages',
      sentence: '',
      sentenceIndex: 0,
    };
    state.particles.push(...createParticles(state.player.x, state.player.y - 50, 'nuke', 60));
    playSound(1000, 1.0, 'sine');
  }, [createParticles, playSound]);

  const addZombieDeathRemains = useCallback((
    state: GameState,
    zombie: Zombie,
    weaponType: string,
  ) => {
    state.bloodStains.push({
      id: `${zombie.id}-blood`,
      x: zombie.x,
      y: zombie.y + 10,
      radius: weaponType === 'pistol' || weaponType === 'machinegun' ? 10 : 18,
      alpha: 0.45,
    });

    const exploded = ['grenade', 'rocket', 'bazooka', 'nuke'].includes(weaponType);
    if (exploded) {
      state.particles.push(...createParticles(zombie.x, zombie.y, 'explosion', weaponType === 'nuke' ? 32 : 20));
      state.particles.push(...createParticles(zombie.x, zombie.y, 'blood', 20));
      state.particles.push(...createParticles(zombie.x, zombie.y, 'sparks', 10));
      state.bloodStains.push({
        id: `${zombie.id}-blast-blood`,
        x: zombie.x,
        y: zombie.y,
        radius: weaponType === 'nuke' ? 30 : 22,
        alpha: 0.5,
      });
      return;
    }

    state.corpses.push({
      id: `${zombie.id}-corpse`,
      x: zombie.x,
      y: zombie.y,
      age: 0,
      maxAge: 9,
      exploded: false,
    });
    state.particles.push(...createParticles(zombie.x, zombie.y, 'blood', 10));
  }, [createParticles]);

  // Create new zombie
  const createZombie = useCallback((): Zombie => {
    const side = isTouchLayout ? 0 : Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
      case 0: // Top
        x = GAME_AREA.x + Math.random() * GAME_AREA.width;
        y = GAME_AREA.y;
        break;
      case 1: // Right
        x = GAME_AREA.x + GAME_AREA.width;
        y = GAME_AREA.y + Math.random() * GAME_AREA.height;
        break;
      case 2: // Bottom
        x = GAME_AREA.x + Math.random() * GAME_AREA.width;
        y = GAME_AREA.y + GAME_AREA.height;
        break;
      default: // Left
        x = GAME_AREA.x;
        y = GAME_AREA.y + Math.random() * GAME_AREA.height;
    }

    // Difficulty now has a real personality through enemy mix and pace.
    const profile = DIFFICULTY_PERSONALITY[gameState.difficulty];
    const behaviorRoll = Math.random();
    let behavior: Zombie['behavior'] = 'normal';
    if (behaviorRoll > profile.behaviorWeights.normal + profile.behaviorWeights.zigzag) {
      behavior = 'sprinter';
    } else if (behaviorRoll > profile.behaviorWeights.normal) {
      behavior = 'zigzag';
    }
    const baseSpeed = 15 + gameState.level * 3 + profile.speedBonus;
    const speedVariance = (Math.random() * 6) - 3; // -3..+3
    let speed = baseSpeed + speedVariance;
    if (behavior === 'sprinter') speed += 4;
    if (behavior === 'zigzag') speed += 2;

    return {
      id: Date.now().toString() + Math.random(),
      x,
      y,
      targetX: gameState.player.x,
      targetY: gameState.player.y,
      word: getRandomWord(gameState.difficulty),
      currentIndex: 0,
      health: 1, // Normal zombies require a single word only
      maxHealth: 1,
      speed,
      color: '#44aa44',
      isTargeted: false,
      isClosest: false,
      animFrame: 0,
      specialWeapon: getRandomSpecialWeapon(),
      behavior,
    };
  }, [gameState.player, gameState.level, gameState.difficulty, getRandomWord, getRandomSpecialWeapon, isTouchLayout]);

  // Draw zombie sprite with enhanced effects and collision-aware word tag
  const drawZombie = useCallback((ctx: CanvasRenderingContext2D, zombie: Zombie, placedRects?: Array<{x:number;y:number;w:number;h:number}>) => {
    const size = 32;
    const halfSize = size / 2;
    const x = zombie.x;
    const y = zombie.y;

    // Death animation
    if (zombie.deathAnim !== undefined) {
      const alpha = 1 - zombie.deathAnim;
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(zombie.deathAnim * Math.PI);
      ctx.scale(1 + zombie.deathAnim, 1 + zombie.deathAnim);
      ctx.translate(-x, -y);
    }

    // Special weapon zombie - neon blue glow
    if (zombie.specialWeapon) {
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 25;
      // Pulsing effect
      const pulse = Math.sin(zombie.animFrame * 0.2) * 5 + 20;
      ctx.shadowBlur = pulse;
    }
    // Targeted zombie - yellow glow
    else if (zombie.isTargeted) {
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 20;
    }
    // Closest zombie - white glow
    else if (zombie.isClosest) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
    }

    // Body with damage effects
    const damageRatio = 1 - (zombie.health / zombie.maxHealth);
    let bodyColor = zombie.isTargeted ? '#aa4444' : 
      `rgb(${68 + damageRatio * 100}, ${170 - damageRatio * 80}, ${68 - damageRatio * 40})`;
    
    // Special weapon zombies have different color
    if (zombie.specialWeapon) {
      bodyColor = '#4444aa'; // Blue tint for special zombies
    }
    
    // Add red damage flash for recently damaged zombies
    if (damageRatio > 0) {
      const flashIntensity = Math.sin(zombie.animFrame * 0.5) * 0.3 + 0.7;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15 * damageRatio * flashIntensity;
    }
    
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x - halfSize + 8, y - halfSize + 8, 16, 24);

    // Head with wounds
    ctx.fillStyle = zombie.specialWeapon ? '#6666cc' :
      `rgb(${170 + damageRatio * 50}, ${255 - damageRatio * 100}, ${170 - damageRatio * 80})`;
    ctx.fillRect(x - halfSize + 10, y - halfSize + 2, 12, 12);

    // Glowing red eyes
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 5;
    ctx.fillRect(x - halfSize + 12, y - halfSize + 6, 2, 2);
    ctx.fillRect(x - halfSize + 18, y - halfSize + 6, 2, 2);
    ctx.shadowBlur = 0;

    // Special weapon indicator on zombie
    if (zombie.specialWeapon) {
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.fillRect(x - halfSize + 6, y - halfSize + 20, 4, 8); // Weapon on back
      ctx.shadowBlur = 0;
    }

    // Animated arms
    ctx.fillStyle = zombie.specialWeapon ? '#6666cc' :
      `rgb(${170 + damageRatio * 50}, ${255 - damageRatio * 100}, ${170 - damageRatio * 80})`;
    const armOffset = Math.sin(zombie.animFrame * 0.1) * 3;
    ctx.fillRect(x - halfSize + 4, y - halfSize + 12 + armOffset, 6, 4);
    ctx.fillRect(x - halfSize + 22, y - halfSize + 12 - armOffset, 6, 4);

    // Shambling legs
    const legOffset = Math.sin(zombie.animFrame * 0.15) * 4;
    ctx.fillStyle = '#333333';
    ctx.fillRect(x - halfSize + 10, y - halfSize + 28 + legOffset, 4, 6);
    ctx.fillRect(x - halfSize + 18, y - halfSize + 28 - legOffset, 4, 6);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    if (zombie.deathAnim !== undefined) {
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Enhanced word prompt with glow
    const wordWidth = zombie.word.length * 14 + 20;
    let wordX = x - wordWidth / 2;
    let wordY = y - 50;
    if (placedRects) {
      const tag = placeTagNearAnchor(x, y, wordWidth, 28, placedRects);
      wordX = tag.x;
      wordY = tag.y;
    }

    // Simplified, semantic word tag styles
    // Base tag: dark background, subtle outline
    if (zombie.specialWeapon) {
      ctx.fillStyle = '#2a1040'; // special: purple base
    } else {
      ctx.fillStyle = '#0b1320'; // normal: dark slate
    }
    ctx.fillRect(wordX, wordY, wordWidth, 28);

    // Border semantics
    if (zombie.specialWeapon) {
      ctx.strokeStyle = '#ff00aa'; // magenta outline for specials
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = zombie.animFrame * 0.6;
    } else if (zombie.isTargeted) {
      ctx.strokeStyle = '#00ffff'; // cyan outline for the target
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = zombie.animFrame * 0.5;
    } else if (zombie.isClosest) {
      ctx.strokeStyle = '#8892a6'; // subtle gray outline for closest
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = zombie.animFrame * 0.3;
    } else {
      ctx.strokeStyle = '#22324a';
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(wordX, wordY, wordWidth, 28);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Special weapon name above word
    if (zombie.specialWeapon && SPECIAL_WEAPONS[zombie.specialWeapon]) {
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff00aa';
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 6;
      ctx.fillText(SPECIAL_WEAPONS[zombie.specialWeapon].name, wordX + wordWidth / 2, wordY - 10);
      ctx.shadowBlur = 0;
    }

    // Enhanced word text with effects
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    
    for (let i = 0; i < zombie.word.length; i++) {
      const charX = wordX + 10 + (i * 14);
      const charY = wordY + 19;
      
      const shouldShowProgress = zombie.isTargeted;
      if (shouldShowProgress && i < zombie.currentIndex) {
        // Completed letters - green on dark
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(zombie.word[i], charX, charY);
        ctx.fillStyle = '#00ff88';
        ctx.fillText(zombie.word[i], charX, charY);
      } else if (shouldShowProgress && i === zombie.currentIndex) {
        // Current letter - cyan highlight, white outline
        const pulse = Math.sin(zombie.animFrame * 0.3) * 0.15 + 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeText(zombie.word[i], charX, charY);
        ctx.save();
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#00ffff';
        ctx.fillText(zombie.word[i], charX / pulse, charY / pulse);
        ctx.restore();
      } else {
        // Remaining letters - white with subtle outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(zombie.word[i], charX, charY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(zombie.word[i], charX, charY);
      }
    }
    ctx.shadowBlur = 0;

    // Enhanced health bar with effects - only show if damaged or special
    if (zombie.health < zombie.maxHealth || zombie.specialWeapon) {
      const healthBarY = y - 75;
      const healthBarWidth = 35;
      const healthPercent = zombie.health / zombie.maxHealth;
      
      // Health bar background with glow
      ctx.fillStyle = '#000000';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 3;
      ctx.fillRect(x - healthBarWidth/2, healthBarY, healthBarWidth, 8);
      ctx.shadowBlur = 0;
      
      // Health bar fill with gradient
      const healthGradient = ctx.createLinearGradient(x - healthBarWidth/2, healthBarY, x + healthBarWidth/2, healthBarY);
      if (zombie.specialWeapon) {
        healthGradient.addColorStop(0, '#00ffff');
        healthGradient.addColorStop(0.5, '#0088aa');
        healthGradient.addColorStop(1, '#0066aa');
      } else {
        healthGradient.addColorStop(0, '#ff0000');
        healthGradient.addColorStop(0.5, '#ffaa00');
        healthGradient.addColorStop(1, '#00ff00');
      }
      
      ctx.fillStyle = healthGradient;
      ctx.fillRect(x - healthBarWidth/2 + 2, healthBarY + 2, (healthBarWidth - 4) * healthPercent, 4);
      
      // Health bar glow and border
      const glowColor = healthPercent < 0.3 ? '#ff0000' : 
                       healthPercent < 0.7 ? '#ffaa00' : '#00ff00';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - healthBarWidth/2, healthBarY, healthBarWidth, 8);
      ctx.shadowBlur = 0;
      
      // Health numbers for clarity
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeText(`${zombie.health}/${zombie.maxHealth}`, x, healthBarY - 3);
      ctx.fillText(`${zombie.health}/${zombie.maxHealth}`, x, healthBarY - 3);
    }
  }, [placeTagNearAnchor]);

  // Draw enhanced player
  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const size = 32;
    const halfSize = size / 2;

    // Player glow
    ctx.shadowColor = '#0088ff';
    ctx.shadowBlur = 10;

    // Body with armor shine
    const bodyGradient = ctx.createLinearGradient(x - halfSize, y - halfSize, x + halfSize, y + halfSize);
    bodyGradient.addColorStop(0, '#6666cc');
    bodyGradient.addColorStop(1, '#4444aa');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(x - halfSize + 8, y - halfSize + 8, 16, 24);

    // Head
    ctx.fillStyle = '#ffddaa';
    ctx.fillRect(x - halfSize + 10, y - halfSize + 2, 12, 12);

    // Eyes with glow
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - halfSize + 12, y - halfSize + 6, 2, 2);
    ctx.fillRect(x - halfSize + 18, y - halfSize + 6, 2, 2);

    // Enhanced weapon with glow - color based on current weapon
    const weaponColor = gameState.currentWeapon === 'pistol' ? '#cccccc' : 
                       (gameState.currentWeapon in SPECIAL_WEAPONS ? 
                        SPECIAL_WEAPONS[gameState.currentWeapon as keyof typeof SPECIAL_WEAPONS].color : '#cccccc');
    ctx.shadowColor = weaponColor;
    ctx.shadowBlur = gameState.currentWeapon === 'pistol' ? 5 : 15;
    ctx.fillStyle = weaponColor;
    ctx.fillRect(x - halfSize + 24, y - halfSize + 12, 10, 4);
    ctx.fillStyle = '#888888';
    ctx.fillRect(x - halfSize + 34, y - halfSize + 13, 8, 2);
    
    ctx.shadowBlur = 0;
  }, [gameState.currentWeapon]);

  // Draw enhanced bullet with trail
  const drawBullet = useCallback((ctx: CanvasRenderingContext2D, bullet: Bullet) => {
    // Different colors for different weapons
    const bulletColor = bullet.weaponType === 'pistol' ? '#ffff00' :
                       bullet.weaponType === 'nuke' ? '#00ffff' :
                       (bullet.weaponType in SPECIAL_WEAPONS ? 
                        SPECIAL_WEAPONS[bullet.weaponType as keyof typeof SPECIAL_WEAPONS].color : '#ffff00');
    
    // Draw trail
    ctx.strokeStyle = bulletColor;
    ctx.lineWidth = bullet.weaponType === 'nuke' ? 6 : 3;
    ctx.shadowColor = bulletColor;
    ctx.shadowBlur = bullet.weaponType === 'nuke' ? 15 : 5;
    
    if (bullet.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
      for (let i = 1; i < bullet.trail.length; i++) {
        ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
      }
      ctx.stroke();
    }

    // Draw bullet
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = bulletColor;
    ctx.shadowBlur = bullet.weaponType === 'nuke' ? 20 : 8;
    const bulletSize = bullet.weaponType === 'nuke' ? 12 : 
                      bullet.weaponType === 'bazooka' ? 10 : 8;
    ctx.fillRect(bullet.x - bulletSize/2, bullet.y - bulletSize/2, bulletSize, bulletSize);
    ctx.shadowBlur = 0;
  }, []);

  // Draw particles
  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.globalAlpha = alpha;
    
    // Special handling for damage number particles
    if (particle.id.includes('damage')) {
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = particle.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 8;
      ctx.strokeText('HIT!', particle.x, particle.y);
      ctx.fillText('HIT!', particle.x, particle.y);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size;
      
      if (particle.type === 'blood' || particle.type === 'gib') {
        if (particle.type === 'gib') {
          ctx.fillStyle = '#8a1a1a';
          ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/3, particle.size, particle.size * 0.66);
          ctx.fillStyle = '#e8d7c0';
          ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
        } else {
        ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
        }
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.shadowBlur = 0;
    }
    
    ctx.globalAlpha = 1;
  }, []);

  const drawBloodStain = useCallback((ctx: CanvasRenderingContext2D, stain: BloodStain) => {
    ctx.save();
    ctx.globalAlpha = stain.alpha;
    ctx.fillStyle = '#6b0000';
    ctx.beginPath();
    ctx.ellipse(stain.x, stain.y, stain.radius, stain.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  const drawPixelHeart = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    filled: boolean,
    pixelSize: number = 2,
  ) => {
    PIXEL_HEART.forEach((row, rowIndex) => {
      row.split('').forEach((cell, colIndex) => {
        if (cell !== '1') return;
        ctx.fillStyle = filled ? '#ff5a7a' : '#243247';
        ctx.fillRect(x + colIndex * pixelSize, y + rowIndex * pixelSize, pixelSize, pixelSize);
        if (filled) {
          ctx.fillStyle = '#ffd7df';
          if (rowIndex <= 1 && colIndex >= 1 && colIndex <= 4) {
            ctx.fillRect(x + colIndex * pixelSize, y + rowIndex * pixelSize, pixelSize, pixelSize);
          }
        }
      });
    });
  }, []);

  const drawCorpse = useCallback((ctx: CanvasRenderingContext2D, corpse: Corpse) => {
    const decay = corpse.age / corpse.maxAge;
    const bodyColor = decay < 0.35 ? '#6b2b2b' : decay < 0.7 ? '#6a6a6a' : '#d8d8d8';
    ctx.save();
    ctx.translate(corpse.x, corpse.y + 8);
    ctx.rotate(Math.PI / 2.4);
    if (decay < 0.35) {
      // Fresh body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-12, -5, 24, 10);
      ctx.fillRect(-5, -12, 10, 7);
      ctx.fillStyle = '#441111';
      ctx.fillRect(-14, -2, 5, 3);
      ctx.fillRect(9, -2, 5, 3);
    } else if (decay < 0.7) {
      // Decomposing body
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-11, -4, 22, 8);
      ctx.fillRect(-4, -10, 8, 5);
      ctx.fillStyle = '#2f5f2f';
      ctx.fillRect(-8, -3, 6, 2);
      ctx.fillRect(2, 1, 7, 2);
    } else {
      // Bones only
      ctx.fillStyle = '#e6e6e6';
      ctx.fillRect(-12, -1, 24, 2);
      ctx.fillRect(-5, -8, 10, 2);
      ctx.fillRect(-9, 3, 6, 2);
      ctx.fillRect(3, 3, 6, 2);
    }
    ctx.restore();
  }, []);

  // Handle keyboard input with enhanced feedback
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameState.gameStarted) return;
      
      // ESC key toggles menu
      if (event.key === 'Escape') {
        event.preventDefault();
        toggleMenu();
        return;
      }
      
      if (gameState.showMenu) {
        const menuKey = event.key.toLowerCase();
        if (menuKey === 'c') {
          event.preventDefault();
          playButtonClick();
          resumeGame();
        } else if (menuKey === 'r') {
          event.preventDefault();
          playButtonClick();
          restartGame();
        } else if (menuKey === 'm') {
          event.preventDefault();
          playButtonClick();
          quitToMenu();
        }
        return;
      }
      
      // Ignore IME composition
      // @ts-ignore - isComposing supported in browsers
      if ((event as any).isComposing) return;
      
      // Robust key-to-letter mapping: prefer key, fallback to code (KeyX)
      let char = '';
      if (event.key && event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
        char = event.key.toLowerCase();
      } else if (event.code && event.code.startsWith('Key')) {
        char = event.code.slice(3).toLowerCase();
      }
      
      if (char) {
        
        flushSync(() => {
          setGameState(prevState => {
            const newState = { ...prevState };
          // Boss typing handling
          if (newState.boss.active) {
            if (newState.boss.phase === 'sentence') {
              let sentenceIndex = newState.boss.sentenceIndex;
              while (newState.boss.sentence[sentenceIndex] === ' ') {
                sentenceIndex++;
                setCurrentInput(prev => prev + ' ');
              }
              const expected = newState.boss.sentence[sentenceIndex] ?? '';
              if (!expected) {
                applyBossClearRewards(newState);
                return newState;
              }
              if (char === expected) {
                sentenceIndex++;
                newState.boss.sentenceIndex = sentenceIndex;
                newState.totalTyped++;
                newState.combo++;
                newState.correctKeys++;
                const total = newState.correctKeys + newState.mistakes;
                newState.accuracyPct = total > 0 ? Math.round((newState.correctKeys / total) * 100) : 100;
                newState.fireRateMultiplier = fireRateFromAccuracy(newState.accuracyPct);
                setCurrentInput(prev => prev + char);
                playSound(520 + sentenceIndex * 12, 0.05, 'sine');
                if (sentenceIndex >= newState.boss.sentence.length) {
                  applyBossClearRewards(newState);
                }
              } else {
                newState.combo = 0;
                newState.mistakes++;
                const total = newState.correctKeys + newState.mistakes;
                newState.accuracyPct = total > 0 ? Math.round((newState.correctKeys / total) * 100) : 100;
                newState.fireRateMultiplier = fireRateFromAccuracy(newState.accuracyPct);
                newState.shake = 5;
                playSound(150, 0.12, 'square');
              }
              return newState;
            }
            const partsLeft = newState.boss.appendages.filter(p => !p.destroyed);
            if (partsLeft.length > 0) {
              const targetPart = getNextBossPart(newState.boss);
              if (!targetPart) return newState;
              activeBossPartRef.current = targetPart.id;

              const expected = targetPart.word[targetPart.index] ?? '';
              if (char === expected) {
                targetPart.index++;
                newState.totalTyped++;
                newState.combo++;
                newState.correctKeys++;
                const total = newState.correctKeys + newState.mistakes;
                newState.accuracyPct = total > 0 ? Math.round((newState.correctKeys / total) * 100) : 100;
                newState.fireRateMultiplier = fireRateFromAccuracy(newState.accuracyPct);
                if (targetPart.index === 1) setCurrentInput(char);
                else setCurrentInput(prev => prev + char);
                playSound(700 + targetPart.index * 40, 0.05, 'sine');
                if (targetPart.index >= targetPart.word.length) {
                  targetPart.destroyed = true;
                  const tp = getBossPartPosition(newState.boss, targetPart.part);
                  newState.particles.push(...createParticles(tp.x, tp.y, 'explosion', 20));
                  setCurrentInput('');
                  activeBossPartRef.current = null;
                  if (newState.boss.appendages.every(p => p.destroyed)) {
                    startBossSentencePhase(newState);
                  }
                  playSound(200, 0.5, 'sawtooth');
                }
              } else {
                newState.combo = 0;
                newState.mistakes++;
                const total = newState.correctKeys + newState.mistakes;
                newState.accuracyPct = total > 0 ? Math.round((newState.correctKeys / total) * 100) : 100;
                newState.fireRateMultiplier = fireRateFromAccuracy(newState.accuracyPct);
                newState.shake = 4;
                playSound(150, 0.1, 'square');
              }
              return newState;
            }
          }
          // Helper to choose a primary target from candidates (special first, then closest)
          const choosePrimary = (cands: Zombie[]) => {
            const special = cands.filter(z => z.specialWeapon);
            const pool = special.length > 0 ? special : cands;
            return pool.reduce((closest, zombie) => {
              const dist1 = Math.hypot(zombie.x - newState.player.x, zombie.y - newState.player.y);
              const dist2 = Math.hypot(closest.x - newState.player.x, closest.y - newState.player.y);
              return dist1 < dist2 ? zombie : closest;
            });
          };
          const syncNormalZombieTypingState = (targetId: string | null, progress: number) => {
            newState.currentTargetId = null;
            newState.zombies.forEach(z => {
              const isTarget = !!targetId && z.id === targetId;
              z.isTargeted = isTarget;
              z.currentIndex = isTarget ? progress : 0;
            });
            newState.currentTargetId = targetId;
          };
          const resetNormalZombieTypingState = () => {
            syncNormalZombieTypingState(null, 0);
          };
          const startNormalTargetSession = (startChar: string) => {
            resetNormalZombieTypingState();
            const starters = newState.zombies.filter(z => z.word[0] === startChar);
            if (starters.length === 0) return false;
            const primary = choosePrimary(starters);
            const pz = newState.zombies.find(z => z.id === primary.id);
            if (!pz) return false;
            syncNormalZombieTypingState(primary.id, 1);
            activeSessionRef.current = {
              word: primary.word,
              progress: 1,
              targetId: primary.id,
              startedAt: Date.now()
            };
            newState.totalTyped++;
            newState.combo++;
            newState.correctKeys++;
            {
              const total = newState.correctKeys + newState.mistakes;
              newState.accuracyPct = total > 0 ? Math.round((newState.correctKeys / total) * 100) : 100;
              newState.fireRateMultiplier = fireRateFromAccuracy(newState.accuracyPct);
            }
            setCurrentInput(startChar);
            playSound(600, 0.1, 'sine');
            playSound(900, 0.1, 'sine');
            updateClosestZombie(newState.zombies, newState.player);
            return true;
          };
          // Active word session handling
          if (!activeSessionRef.current) {
            if (startNormalTargetSession(char)) {
              return newState;
            }
            // No session and no starter match → treat as wrong key
            resetNormalZombieTypingState();
            newState.combo = 0;
            newState.mistakes++;
            // Update accuracy
            {
              const total = newState.correctKeys + newState.mistakes;
              newState.accuracyPct = total > 0 ? Math.round((newState.correctKeys / total) * 100) : 100;
                newState.fireRateMultiplier = fireRateFromAccuracy(newState.accuracyPct);
            }
            setCurrentInput('');
            playSound(150, 0.3, 'square');
            newState.shake = 5;
            updateClosestZombie(newState.zombies, newState.player);
            return newState;
          } else {
            const activeSession = activeSessionRef.current!;
            const expected = activeSession.word[activeSession.progress] ?? '';
            const targetZombie = newState.zombies.find(z => z.id === activeSession.targetId);
            if (!targetZombie) {
              activeSessionRef.current = null;
              setCurrentInput('');
              if (startNormalTargetSession(char)) {
                return newState;
              }
              resetNormalZombieTypingState();
              return newState;
            }
            // Lock-on: on mismatch, do not switch targets mid-session
            if (char !== expected) {
              newState.combo = 0;
              newState.mistakes++;
              {
                const total = newState.correctKeys + newState.mistakes;
                newState.accuracyPct = total > 0 ? Math.round((newState.correctKeys / total) * 100) : 100;
                newState.fireRateMultiplier = fireRateFromAccuracy(newState.accuracyPct);
              }
              playSound(150, 0.2, 'square');
              newState.shake = 3;
              // Keep current session active; no retargeting
              return newState;
            }
            // Correct next char within session
            newState.totalTyped++;
            newState.combo++;
            newState.correctKeys++;
            {
              const total = newState.correctKeys + newState.mistakes;
              newState.accuracyPct = total > 0 ? Math.round((newState.correctKeys / total) * 100) : 100;
              newState.fireRateMultiplier = fireRateFromAccuracy(newState.accuracyPct);
            }
            setCurrentInput(prev => prev + char);
            const newProgress = activeSession.progress + 1;
            syncNormalZombieTypingState(activeSession.targetId, Math.min(newProgress, activeSession.word.length));
            playSound(800 + newProgress * 100, 0.1, 'sine');
              // On completion: apply damage to all zombies in the session snapshot
              if (newProgress >= activeSession.word.length) {
              // One primary bullet for visuals
              const primary = newState.zombies.find(z => z.id === activeSession.targetId);
              if (primary) {
                const bullet: Bullet = {
                  id: Date.now().toString(),
                  x: newState.player.x,
                  y: newState.player.y,
                  targetX: primary.x,
                  targetY: primary.y,
                  speed: projectileSpeedForWeapon(newState.currentWeapon, newState.fireRateMultiplier),
                  trail: [],
                  weaponType: newState.currentWeapon
                };
                newState.bullets.push(bullet);
              }
              // Weapon feedback/effects
              const killWeaponType = newState.currentWeapon;
              const weaponDamage = WEAPON_DAMAGE[killWeaponType as keyof typeof WEAPON_DAMAGE] || 1;
              const muzzleCount = Math.min(8 + (weaponDamage * 4), 25);
              newState.particles.push(...createParticles(newState.player.x + 30, newState.player.y, 'muzzle', muzzleCount));
              newState.shake = Math.min(5 + (weaponDamage * 5), 30);
              if (weaponDamage >= 4) playSound(100, 1.5, 'sawtooth');
              else if (weaponDamage >= 3) playSound(120, 1.2, 'sawtooth');
              else if (weaponDamage >= 2) playSound(150, 0.8, 'sawtooth');
              else playSound(200, 0.3, 'sawtooth');
              if (newState.weaponAmmo > 0) {
                newState.weaponAmmo--;
                if (newState.weaponAmmo <= 0) newState.currentWeapon = 'pistol';
              }
              // Normal zombies are always one-word kills.
              // Remove the locked target immediately on full word completion.
              let specialPicked = false;
              let killsThisWord = 0;
              const killedZombie = newState.zombies.find(z => z.id === activeSession.targetId);
              const weaponBehavior = WEAPON_BEHAVIOR[killWeaponType as keyof typeof WEAPON_BEHAVIOR] ?? WEAPON_BEHAVIOR.pistol;
              const splashRadius = weaponBehavior.splashRadius;
              const killIds = new Set<string>();
              if (killedZombie) {
                const collateralVictims = weaponBehavior.wipeField
                  ? newState.zombies.filter(z => z.id !== killedZombie.id)
                  : newState.zombies
                      .filter(z => z.id !== killedZombie.id)
                      .map(z => ({
                        zombie: z,
                        distance: Math.hypot(z.x - killedZombie.x, z.y - killedZombie.y),
                      }))
                      .filter(entry => entry.distance <= splashRadius)
                      .sort((a, b) => {
                        const specialBias = Number(Boolean(b.zombie.specialWeapon)) - Number(Boolean(a.zombie.specialWeapon));
                        return specialBias !== 0 ? specialBias : a.distance - b.distance;
                      })
                      .slice(0, weaponBehavior.maxCollateral)
                      .map(entry => entry.zombie);

                killIds.add(killedZombie.id);
                collateralVictims.forEach(z => killIds.add(z.id));

                if (weaponBehavior.clearProjectiles) {
                  newState.enemyBullets = [];
                }

                const dropCarrier = [killedZombie, ...collateralVictims].find(z => z.specialWeapon && SPECIAL_WEAPONS[z.specialWeapon]);
                if (!specialPicked && dropCarrier?.specialWeapon) {
                  const weapon = SPECIAL_WEAPONS[dropCarrier.specialWeapon];
                  newState.currentWeapon = dropCarrier.specialWeapon;
                  newState.weaponAmmo = weapon.ammo;
                  newState.weaponTimeLeft = weapon.duration;
                  specialPicked = true;
                  playSound(1200, 0.5, 'sine');
                }

                killsThisWord = killIds.size;
                newState.zombies
                  .filter(z => killIds.has(z.id))
                  .forEach(z => addZombieDeathRemains(newState, z, killWeaponType));
              }
              newState.zombies = newState.zombies.filter(z => !killIds.has(z.id));
              // If boss appendages are all destroyed, enter the sentence finisher.
              if (newState.boss.active && newState.boss.appendages.length > 0 &&
                  newState.boss.appendages.every(p => p.destroyed)) {
                startBossSentencePhase(newState);
              }
              // Scoring (sum for multiple)
              const baseScore = 100;
              const difficultyMultiplier = { easy: 1, normal: 1.2, hard: 1.5, extreme: 2 }[newState.difficulty];
              const weaponMultiplier = newState.currentWeapon === 'pistol' ? 1 : 1.5;
              const wordLengthBonus = activeSession.word.length * 10;
              if (killsThisWord > 0) {
                newState.score += Math.round((baseScore + wordLengthBonus) * killsThisWord * newState.combo * difficultyMultiplier * weaponMultiplier);
                // Progression counters: kills and boss progress
                newState.kills += killsThisWord;
                newState.killsTowardsBoss += killsThisWord;
                // Boss spawn check
                if (!newState.boss.active && newState.killsTowardsBoss >= BOSS_THRESHOLD[newState.difficulty]) {
                  newState.boss = createBoss(newState.difficulty);
                  newState.bossSpawnedAt = newState.gameTime;
                  newState.lastBossAttackAt = newState.gameTime;
                  // Clear battlefield of normal zombies for dramatic entry
                  newState.zombies = [];
                  newState.enemyBullets = [];
                  newState.currentTargetId = null;
                  activeSessionRef.current = null;
                  activeBossPartRef.current = null;
                  playSound(80, 1.5, 'sawtooth');
                }
                playSound(150, 0.5, 'sawtooth');
              } else {
                // Non-lethal hit confirmation
                playSound(300, 0.2, 'square');
              }
              // Clear targeting and session
              resetNormalZombieTypingState();
              setCurrentInput('');
              activeSessionRef.current = null;
              // Update closest marker
              updateClosestZombie(newState.zombies, newState.player);
              // Recompute WPM
              const timeMinutes = (Date.now() - newState.gameStartTime) / 60000;
              newState.wpm = Math.round((newState.totalTyped / 5) / timeMinutes);
              return newState;
            }
            // Not completed yet — keep session
            updateClosestZombie(newState.zombies, newState.player);
            // Persist progress
            activeSessionRef.current = {
              ...activeSession,
              progress: newProgress
            };
            return newState;
          }
          });
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [applyBossClearRewards, createParticles, gameState.gameStarted, gameState.showMenu, getRandomWord, playButtonClick, playSound, quitToMenu, restartGame, resumeGame, startBossSentencePhase, toggleMenu, updateClosestZombie]);

  // Enhanced game loop with effects
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState.gameStarted || gameState.lives <= 0) return; // Stop when game over

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = 16; // ~60fps

    setGameState(prevState => {
      const newState = { ...prevState, gameTime: timestamp };
      const config = DIFFICULTY_CONFIG[newState.difficulty];

      if (newState.centerMessage && timestamp > newState.centerMessageUntil) {
        newState.centerMessage = '';
        newState.centerSubMessage = '';
        newState.centerMessageUntil = 0;
      }

      // Reduce screen shake
      newState.shake = Math.max(0, newState.shake - 1);

      // Update weapon timer
      if (newState.weaponTimeLeft > 0) {
        newState.weaponTimeLeft -= deltaTime;
        if (newState.weaponTimeLeft <= 0) {
          newState.currentWeapon = 'pistol';
          newState.weaponAmmo = 0;
        }
      }

      // Spawn zombies with difficulty-based rates (disabled during boss)
      const baseSpawnRate = config.spawnRate - newState.level * 100;
      const spawnRate = Math.max(baseSpawnRate, 800);
      const maxZombies = config.maxZombies + Math.floor(newState.level / 2);
      
      if (!newState.boss.active &&
          timestamp >= newState.chapterTransitionUntil &&
          timestamp - newState.lastSpawn > spawnRate &&
          newState.zombies.length < maxZombies) {
        newState.zombies.push(createZombie());
        newState.lastSpawn = timestamp;
      }

      // Fail-safe: the moment all appendages are cleared, enter the sentence finisher.
      if (newState.boss.active &&
          newState.boss.phase === 'appendages' &&
          newState.boss.appendages.length > 0 &&
          newState.boss.appendages.every(part => part.destroyed)) {
        startBossSentencePhase(newState);
      }

      // Boss behaviors: entrance, movement, and attacks
      if (newState.boss.active) {
        // Entrance stomp: move down to target Y with periodic shakes
        const targetY = GAME_AREA.y + 120;
        if ((newState.boss as any).entering) {
          newState.boss.y += 2.5;
          if (Math.floor(newState.boss.y) % 25 === 0) {
            newState.shake = 10;
            playSound(80, 0.2, 'sawtooth');
          }
          if (newState.boss.y >= targetY) {
            newState.boss.y = targetY;
            (newState.boss as any).entering = false;
            newState.shake = 18;
            playSound(60, 0.4, 'sawtooth');
          }
        } else {
          // Lateral sway and subtle bob
          const t = timestamp / 1000;
          newState.boss.x = CANVAS_WIDTH / 2 + Math.sin(t) * (newState.boss.phase === 'sentence' ? 30 : 120);
          newState.boss.y = targetY + Math.sin(t * 2) * (newState.boss.phase === 'sentence' ? 2 : 6);
          // Laser eye attack after a short grace period
          if (newState.boss.phase === 'appendages' &&
              timestamp - newState.bossSpawnedAt > 4000 &&
              timestamp - newState.lastBossAttackAt > 2200) {
            const eyes = [
              { ex: newState.boss.x - 12, ey: newState.boss.y - 65 },
              { ex: newState.boss.x + 18, ey: newState.boss.y - 65 },
            ];
            eyes.forEach(({ ex, ey }) => {
              newState.enemyBullets.push({
                id: Date.now().toString() + Math.random(),
                x: ex,
                y: ey,
                targetX: newState.player.x,
                targetY: newState.player.y,
                speed: 420,
                kind: 'laser',
              });
            });
            newState.lastBossAttackAt = timestamp;
            playSound(500, 0.2, 'square');
          }
        }
      }

      // Update enemy lasers
      newState.enemyBullets = newState.enemyBullets.filter(laser => {
        const dx = laser.targetX - laser.x;
        const dy = laser.targetY - laser.y;
        const dist = Math.hypot(dx, dy);
        const vx = (dx / dist) * laser.speed * (deltaTime / 1000);
        const vy = (dy / dist) * laser.speed * (deltaTime / 1000);
        laser.x += vx;
        laser.y += vy;
        // Collision with player
        const pd = Math.hypot(newState.player.x - laser.x, newState.player.y - laser.y);
        if (pd < 28) {
          newState.lives = Math.max(0, newState.lives - 1);
          newState.shake = 16;
          playSound(100, 0.3, 'sawtooth');
          return false;
        }
        // Out of bounds
        return laser.x >= GAME_AREA.x - 50 && laser.x <= GAME_AREA.x + GAME_AREA.width + 50 &&
               laser.y >= GAME_AREA.y - 50 && laser.y <= GAME_AREA.y + GAME_AREA.height + 50;
      });
      // Update zombies
      newState.zombies.forEach(zombie => {
        const dx = newState.player.x - zombie.x;
        const dy = newState.player.y - zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5 && !zombie.deathAnim) {
          // Base velocity toward player
          let vx = (dx / distance) * zombie.speed * (deltaTime / 1000);
          let vy = (dy / distance) * zombie.speed * (deltaTime / 1000);
          // Behavior modifiers
          if (zombie.behavior === 'zigzag') {
            // Perpendicular oscillation
            const perpX = -dy / distance;
            const perpY = dx / distance;
            const osc = Math.sin(zombie.animFrame * 0.2) * 0.6;
            vx += perpX * osc;
            vy += perpY * osc;
          } else if (zombie.behavior === 'sprinter') {
            // Occasional burst
            const burst = (zombie.animFrame % 120) < 20 ? 1.6 : 1.0;
            vx *= burst;
            vy *= burst;
          }
          zombie.x += vx;
          zombie.y += vy;
        }
        
        zombie.animFrame++;
        
        // Check if zombie reached player
        if (distance < 40 && !zombie.deathAnim) {
          newState.lives = Math.max(0, newState.lives - 1); // Prevent negative lives
          newState.zombies = newState.zombies.filter(z => z.id !== zombie.id);
          newState.shake = 20; // Big shake for damage
          playSound(100, 0.8, 'sawtooth'); // Damage sound
          newState.combo = 0; // Reset combo
        }
      });

      // Clear stale targeting/session state so the next live zombie can be selected.
      if (newState.currentTargetId && !newState.zombies.some(z => z.id === newState.currentTargetId)) {
        newState.currentTargetId = null;
        newState.zombies.forEach(z => { z.isTargeted = false; z.currentIndex = 0; });
      }
      if (activeSessionRef.current && !newState.zombies.some(z => z.id === activeSessionRef.current?.targetId)) {
        activeSessionRef.current = null;
        setCurrentInput('');
      }

      // Hard lock: while a typing session is active, never allow target drift.
      if (activeSessionRef.current) {
        const lockedTarget = newState.zombies.find(z => z.id === activeSessionRef.current?.targetId);
        if (lockedTarget) {
          newState.currentTargetId = lockedTarget.id;
          newState.zombies.forEach(z => {
            const isLocked = z.id === lockedTarget.id;
            z.isTargeted = isLocked;
            z.isClosest = false;
            z.currentIndex = isLocked ? Math.min(activeSessionRef.current!.progress, z.word.length) : 0;
          });
        }
      }

      // Update closest zombie highlighting
      updateClosestZombie(newState.zombies, newState.player);

      // Fail-safe: if a targeted zombie has a fully completed word, kill it immediately.
      const completedTargets = newState.zombies.filter(z => z.isTargeted && z.currentIndex >= z.word.length);
      if (completedTargets.length > 0) {
        completedTargets.forEach(z => addZombieDeathRemains(newState, z, newState.currentWeapon));
        newState.zombies = newState.zombies.filter(z => !completedTargets.some(dead => dead.id === z.id));
        newState.kills += completedTargets.length;
        newState.killsTowardsBoss += completedTargets.length;
        newState.score += completedTargets.length * 100;
        newState.currentTargetId = null;
        activeSessionRef.current = null;
        setCurrentInput('');
      }

      // Update bullets with trails
      newState.bullets = newState.bullets.filter(bullet => {
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (!Number.isFinite(distance) || distance <= 0.001) {
          newState.particles.push(...createParticles(
            Number.isFinite(bullet.x) ? bullet.x : bullet.targetX,
            Number.isFinite(bullet.y) ? bullet.y : bullet.targetY,
            'sparks',
            8,
          ));
          return false;
        }
        
        // Add to trail
        bullet.trail.push({ x: bullet.x, y: bullet.y });
        if (bullet.trail.length > 8) bullet.trail.shift();

        const step = bullet.speed * (deltaTime / 1000);
        if (distance <= Math.max(28, step)) {
          // Bullet hit - create impact particles
          newState.particles.push(...createParticles(bullet.targetX, bullet.targetY, 'sparks', 8));
          return false;
        }
        
        const moveX = (dx / distance) * step;
        const moveY = (dy / distance) * step;
        
        bullet.x += moveX;
        bullet.y += moveY;

        return Number.isFinite(bullet.x) && Number.isFinite(bullet.y);
      });

      // Update particles
      newState.particles = newState.particles.filter(particle => {
        particle.x += particle.vx * (deltaTime / 1000);
        particle.y += particle.vy * (deltaTime / 1000);
        particle.vy += 50; // Gravity
        particle.life -= deltaTime / 1000;
        return particle.life > 0;
      });

      // Blood accumulates as the fight escalates
      newState.bloodStains = newState.bloodStains.map(stain => ({
        ...stain,
        radius: Math.min(stain.radius + 0.02, stain.radius + 0.8),
        alpha: Math.max(0.18, stain.alpha - 0.0005),
      }));

      // Corpses decompose into bones, then vanish
      newState.corpses = newState.corpses.filter(corpse => {
        corpse.age += deltaTime / 1000;
        return corpse.age < corpse.maxAge;
      });

      return newState;
    });

    // Enhanced rendering with screen shake
    ctx.save();
    if (gameState.shake > 0) {
      const shakeX = (Math.random() - 0.5) * gameState.shake;
      const shakeY = (Math.random() - 0.5) * gameState.shake;
      ctx.translate(shakeX, shakeY);
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Animated background
    const bgGradient = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 600);
    bgGradient.addColorStop(0, '#2a1a3e');
    bgGradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Game area with enhanced border
    const areaGradient = ctx.createLinearGradient(GAME_AREA.x, GAME_AREA.y, GAME_AREA.x, GAME_AREA.y + GAME_AREA.height);
    areaGradient.addColorStop(0, '#9B8365');
    areaGradient.addColorStop(1, '#8B7355');
    ctx.fillStyle = areaGradient;
    ctx.fillRect(GAME_AREA.x, GAME_AREA.y, GAME_AREA.width, GAME_AREA.height);
    // Slow blood saturation as kills rise
    ctx.fillStyle = `rgba(120, 0, 0, ${Math.min(gameState.kills * 0.008, 0.12)})`;
    ctx.fillRect(GAME_AREA.x, GAME_AREA.y, GAME_AREA.width, GAME_AREA.height);

    // Animated border with glow
    ctx.strokeStyle = '#666677';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#666677';
    ctx.shadowBlur = 10;
    ctx.strokeRect(GAME_AREA.x - 3, GAME_AREA.y - 3, GAME_AREA.width + 6, GAME_AREA.height + 6);
    ctx.shadowBlur = 0;

    // Draw game objects
    gameState.bloodStains.forEach(stain => drawBloodStain(ctx, stain));
    gameState.corpses.forEach(corpse => drawCorpse(ctx, corpse));
    gameState.particles.forEach(particle => drawParticle(ctx, particle));
    // Place word tags without overlap
    const placedRects: Array<{x:number;y:number;w:number;h:number}> = [];
    gameState.zombies.forEach(zombie => drawZombie(ctx, zombie, placedRects));
    // Boss rendering
    if (gameState.boss.active) {
      drawBoss(ctx, gameState.boss, gameState.gameTime, placedRects);
    }
    
    // Target indicator: dotted line and arrow
    const resolveCurrentTarget = (): Zombie | undefined => {
      if (gameState.currentTargetId) {
        return gameState.zombies.find(z => z.id === gameState.currentTargetId);
      }
      return gameState.zombies.find(z => z.isClosest);
    };
    const target = resolveCurrentTarget();
    if (target) {
      // Dotted line from player to target
      ctx.save();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = (gameState.gameTime / 10) % 12;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(gameState.player.x, gameState.player.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.restore();
      
    }
    gameState.bullets.forEach(bullet => drawBullet(ctx, bullet));
    // Enemy lasers
    gameState.enemyBullets.forEach(beam => {
      ctx.save();
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.lineTo(beam.x + (beam.targetX - beam.x) * 0.1, beam.y + (beam.targetY - beam.y) * 0.1);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
    drawPlayer(ctx, gameState.player.x, gameState.player.y);

    const threshold = BOSS_THRESHOLD[gameState.difficulty];
    const progress = Math.min(gameState.killsTowardsBoss / threshold, 1);
    const bossStatus = gameState.boss.active
      ? (gameState.boss.phase === 'sentence' ? 'EXECUTE BOSS' : 'BOSS ACTIVE')
      : gameState.gameTime < gameState.chapterTransitionUntil
        ? 'CHAPTER BREAK'
        : `BOSS IN ${Math.max(threshold - gameState.killsTowardsBoss, 0)}`;

    if (!isTouchLayout) {
      // Clean left HUD panel
      const panelX = 20;
      const panelY = 20;
      const panelW = 160;
      const panelH = 220;
      ctx.fillStyle = '#07111d';
      ctx.strokeStyle = '#1f3952';
      ctx.lineWidth = 2;
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeRect(panelX, panelY, panelW, panelH);

      ctx.textAlign = 'left';
      ctx.shadowBlur = 0;
      const statLabel = (label: string, value: string, y: number, valueColor = '#e6e6e6') => {
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#8fb3c9';
        ctx.fillText(label, panelX + 10, y);
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = valueColor;
        ctx.fillText(value, panelX + 10, y + 18);
      };

      statLabel('SCORE', gameState.score.toLocaleString(), panelY + 16);
      statLabel('KILLS', String(gameState.kills), panelY + 48, '#00e5ff');

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(bossStatus, panelX + 10, panelY + 84);
      const barX = panelX + 10, barY = panelY + 92, barW = panelW - 20, barH = 10;
      ctx.strokeStyle = '#2a3b4f';
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = '#007a99';
      ctx.fillRect(barX, barY, barW * progress, barH);

      const difficultyColors = { easy: '#00ff88', normal: '#ffaa00', hard: '#ff6666', extreme: '#ff00ff' };
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#8fb3c9';
      ctx.fillText('LIVES', panelX + 10, panelY + 118);
      for (let i = 0; i < MAX_LIVES; i++) {
        drawPixelHeart(ctx, panelX + 10 + i * 22, panelY + 126, i < gameState.lives, 2);
      }
      statLabel('CHAPTER', String(gameState.level), panelY + 150, '#ffd54a');
      statLabel('MODE', gameState.difficulty.toUpperCase(), panelY + 182, difficultyColors[gameState.difficulty]);

      const weaponName = gameState.currentWeapon === 'pistol' ? 'PISTOL' :
        (gameState.currentWeapon in SPECIAL_WEAPONS ? SPECIAL_WEAPONS[gameState.currentWeapon as keyof typeof SPECIAL_WEAPONS].name : 'PISTOL');
      const weaponDamage = WEAPON_DAMAGE[gameState.currentWeapon as keyof typeof WEAPON_DAMAGE] || 1;
      const weaponBehavior = WEAPON_BEHAVIOR[gameState.currentWeapon as keyof typeof WEAPON_BEHAVIOR] ?? WEAPON_BEHAVIOR.pistol;
      const weaponDisplayColor = gameState.currentWeapon === 'pistol' ? '#ffffff' :
        (gameState.currentWeapon in SPECIAL_WEAPONS ? SPECIAL_WEAPONS[gameState.currentWeapon as keyof typeof SPECIAL_WEAPONS].color : '#ffffff');

      const subBoxX = 20;
      const weaponBoxY = panelY + panelH + 10;
      const subBoxW = 160;
      const subBoxH = 84;
      ctx.fillStyle = '#0a0f1a';
      ctx.strokeStyle = '#2a3b4f';
      ctx.fillRect(subBoxX, weaponBoxY, subBoxW, subBoxH);
      ctx.strokeRect(subBoxX, weaponBoxY, subBoxW, subBoxH);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#8fb3c9';
      ctx.fillText('WEAPON', subBoxX + 10, weaponBoxY + 16);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = weaponDisplayColor;
      ctx.fillText(weaponName.length > 11 ? weaponName.slice(0, 11) : weaponName, subBoxX + 10, weaponBoxY + 36);
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#e6e6e6';
      ctx.fillText(`DMG ${weaponDamage}`, subBoxX + 10, weaponBoxY + 52);
      ctx.fillStyle = '#8fb3c9';
      ctx.fillText(`MODE ${weaponBehavior.label}`, subBoxX + 10, weaponBoxY + 68);
      if (gameState.currentWeapon !== 'pistol') {
        const ammoText = gameState.weaponAmmo > 0 ? `AMMO ${gameState.weaponAmmo}` : `TIME ${Math.ceil(gameState.weaponTimeLeft / 1000)}s`;
        ctx.fillStyle = '#e6e6e6';
        ctx.fillText(ammoText, subBoxX + 10, weaponBoxY + 80);
      }
    }
    
    // Combo with dynamic effects
    if (gameState.combo > 0) {
      const comboSize = Math.min(30 + gameState.combo * 2, 50);
      ctx.font = `bold ${comboSize}px monospace`;
      ctx.fillStyle = gameState.combo > 10 ? '#ff00ff' : gameState.combo > 5 ? '#ffff00' : '#00ffff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO x${gameState.combo}`, CANVAS_WIDTH / 2, 54);
    }
    
    if (!isTouchLayout) {
      // WPM / Accuracy display (right)
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(`WPM: ${gameState.wpm}`, CANVAS_WIDTH - 30, 44);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`ACC: ${Math.round(gameState.accuracyPct)}%`, CANVAS_WIDTH - 30, 64);

      // Legend (left side under weapon)
      const legendX = 20;
      const legendY = 20 + 220 + 10 + 84 + 12;
      const rowH = 24;
      const tagW = 62;
      const tagH = 16;
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#0a0f1a';
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.fillRect(legendX, legendY, 160, rowH * 3 + 24);
      ctx.strokeRect(legendX, legendY, 160, rowH * 3 + 24);
      ctx.fillStyle = '#8fb3c9';
      ctx.fillText('LEGEND', legendX + 10, legendY + 15);
      const drawTag = (x: number, y: number, style: 'normal' | 'target' | 'special') => {
        ctx.fillStyle = '#0b1320';
        ctx.fillRect(x, y, tagW, tagH);
        if (style === 'special') { ctx.strokeStyle = '#ff00aa'; ctx.setLineDash([4,4]); }
        else if (style === 'target') { ctx.strokeStyle = '#00ffff'; ctx.setLineDash([6,4]); }
        else { ctx.strokeStyle = '#22324a'; ctx.setLineDash([]); }
        ctx.strokeRect(x, y, tagW, tagH);
        ctx.setLineDash([]);
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        const text =
          style === 'normal' ? 'Normal' :
          style === 'target' ? 'Target' :
          'Special';
        ctx.fillText(text, x + tagW / 2, y + 12);
      };
      drawTag(legendX + 10, legendY + 24 + 0 * rowH, 'normal');
      drawTag(legendX + 10, legendY + 24 + 1 * rowH, 'target');
      drawTag(legendX + 10, legendY + 24 + 2 * rowH, 'special');
    }
    
    ctx.shadowBlur = 0;

    // Current input with enhanced styling
    if (currentInput) {
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.fillText(`"${currentInput}"`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
      ctx.shadowBlur = 0;
    }

    if (gameState.centerMessage && gameState.gameTime <= gameState.centerMessageUntil) {
      const msgW = 340;
      const msgH = gameState.centerSubMessage ? 92 : 72;
      const msgX = GAME_AREA.x + (GAME_AREA.width - msgW) / 2;
      const msgY = GAME_AREA.y + (GAME_AREA.height - msgH) / 2;
      ctx.fillStyle = 'rgba(4, 12, 20, 0.9)';
      ctx.strokeStyle = '#ffd54a';
      ctx.lineWidth = 3;
      ctx.fillRect(msgX, msgY, msgW, msgH);
      ctx.strokeRect(msgX, msgY, msgW, msgH);
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#8fb3c9';
      ctx.fillText(gameState.boss.active ? 'BOSS EVENT' : 'CHAPTER UPDATE', msgX + msgW / 2, msgY + 24);
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(gameState.centerMessage, msgX + msgW / 2, msgY + (gameState.centerSubMessage ? 48 : 50));
      if (gameState.centerSubMessage) {
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#8fb3c9';
        ctx.fillText(gameState.centerSubMessage, msgX + msgW / 2, msgY + 72);
      }
    }

    // Targeting help text
    if (gameState.zombies.length > 0 && !gameState.zombies.some(z => z.isTargeted)) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      if (isTouchLayout) {
        ctx.font = 'bold 11px monospace';
        ctx.fillText('Type the first letter', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 44);
        ctx.fillText('of the highlighted word to target!', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 26);
      } else {
        ctx.font = 'bold 18px monospace';
        ctx.fillText('Type the first letter of the highlighted word to target!', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
      }
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [CANVAS_HEIGHT, CANVAS_WIDTH, GAME_AREA.height, GAME_AREA.width, GAME_AREA.x, GAME_AREA.y, createParticles, createZombie, currentInput, drawBloodStain, drawBullet, drawCorpse, drawParticle, drawPlayer, drawZombie, gameState, isTouchLayout, playSound, updateClosestZombie]);

  // Start game loop
  useEffect(() => {
    if (gameState.gameStarted) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameState.gameStarted]);

  // Difficulty selection screen
  if (!gameState.gameStarted) {
    const showDesktopNotice = isCompactDevice && !desktopNoticeDismissed;
    const compactMenu = isCompactDevice;

    return (
      <div className={`flex flex-col items-center relative overflow-hidden bg-black ${compactMenu ? 'justify-start min-h-[100svh] pt-4 pb-4' : 'justify-center min-h-screen'}`}>
        {/* Enhanced 1990s CRT Terminal Background */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.08) 1px, transparent 1px),
              radial-gradient(circle at 20% 30%, rgba(0, 255, 255, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(255, 170, 0, 0.03) 0%, transparent 50%)
            `,
            backgroundSize: '20px 20px, 20px 20px, 600px 600px, 600px 600px'
          }}
        />
        
        {/* Enhanced scan lines with subtle animation */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 255, 0.1) 2px,
              rgba(0, 255, 255, 0.1) 4px
            )`,
            animation: 'pulse 6s ease-in-out infinite'
          }}
        />

        {/* Premium CRT Monitor Frame */}
        <div className="absolute inset-4 border-2 border-cyan-400 opacity-50 rounded-lg pointer-events-none" 
             style={{ 
               boxShadow: `
                 0 0 30px rgba(0, 255, 255, 0.4),
                 inset 0 0 30px rgba(0, 255, 255, 0.15),
                 0 4px 0 rgba(0, 200, 200, 0.6),
                 0 8px 0 rgba(0, 150, 150, 0.4)
               `
             }} 
        />
        
        {/* Corner terminal status indicators */}
        <div className="absolute top-8 left-8 w-3 h-3 bg-green-400 rounded-full animate-pulse pointer-events-none" 
             style={{ boxShadow: '0 0 10px #00ff00' }} />
        <div className="absolute top-8 right-8 w-3 h-3 bg-amber-400 rounded-full animate-pulse pointer-events-none" 
             style={{ animationDelay: '1s', boxShadow: '0 0 10px #ffaa00' }} />

        {showDesktopNotice && (
          <div className="absolute inset-0 z-30 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70" />
            <div
              className="relative w-full max-w-lg border-2 rounded-xl bg-black/90 p-6 text-center"
              style={{
                borderColor: '#ffaa00',
                boxShadow: '0 0 30px rgba(255, 170, 0, 0.28)',
              }}
            >
              <div
                className="text-xs font-mono mb-3"
                style={{ color: '#ffaa00', letterSpacing: '0.28em' }}
              >
                DEVICE NOTICE
              </div>
              <div
                className="text-2xl font-mono font-bold mb-3"
                style={{ color: '#00ffff', textShadow: '0 0 18px rgba(0, 255, 255, 0.45)' }}
              >
                DESKTOP RECOMMENDED
              </div>
              <p className="text-sm md:text-base font-mono text-white/80 leading-relaxed">
                `KILL TYPE` is optimized for desktop play with a full keyboard. Tablet and phone support is available,
                but the best combat experience is on a laptop or desktop.
              </p>
              <button
                className="mt-5 px-5 py-3 border rounded-lg font-mono text-sm transition-all duration-150"
                style={{
                  borderColor: '#00ffff',
                  color: '#00ffff',
                  boxShadow: '0 0 14px rgba(0, 255, 255, 0.25)',
                }}
                onClick={() => setDesktopNoticeDismissed(true)}
              >
                CONTINUE ANYWAY
              </button>
            </div>
          </div>
        )}

        <div className={`relative z-10 text-center ${compactMenu ? 'mb-5' : 'mb-12'}`}>
          {/* Premium 1990s Terminal Header */}
          <div 
            className={`font-mono text-green-400 opacity-80 ${compactMenu ? 'hidden' : 'text-xs mb-4'}`}
            style={{ letterSpacing: '3px' }}
          >
            ◄◄◄ BIOSYS TERMINAL v2.1 ►►►
          </div>
          
          <h1 
            className={`${compactMenu ? 'text-[40px] mb-1' : 'text-6xl mb-4'} font-bold tracking-wider`}
            style={{
              color: '#00ffff',
              textShadow: `
                0 0 20px rgba(0, 255, 255, 1),
                0 0 40px rgba(0, 255, 255, 0.6),
                0 0 60px rgba(0, 255, 255, 0.3),
                2px 2px 0 #008888
              `,
              fontFamily: 'Courier New, monospace',
              letterSpacing: '6px'
            }}
          >
            {compactMenu ? 'KILL TYPE' : '╔══ KILL TYPE ══╗'}
          </h1>
          
          <div 
            className={`${compactMenu ? 'w-40' : 'w-80'} h-1 mx-auto mb-2`}
            style={{
              background: 'linear-gradient(90deg, transparent, #00ffff, #ffaa00, #00ffff, transparent)',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.8)'
            }}
          />
          
          <div 
            className={`text-xs font-mono text-cyan-400 opacity-70 ${compactMenu ? 'hidden' : 'mb-6'}`}
            style={{ letterSpacing: '2px' }}
          >
            ═══════════════════════════════════════════════
          </div>

          {menuScreen === 'home' && (
            <p
              className={`text-cyan-400 font-mono tracking-wide ${compactMenu ? 'text-[10px] mb-2' : 'text-sm mb-4'}`}
              style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.6)' }}
            >
              TYPE TO ELIMINATE • SURVIVE THE APOCALYPSE
            </p>
          )}
          
          <p 
            className={`${compactMenu ? 'text-sm' : 'text-xl'} text-amber-400 font-mono tracking-wide font-bold mb-2`}
            style={{
              textShadow: '0 0 15px rgba(255, 170, 0, 1), 0 0 30px rgba(255, 170, 0, 0.5)',
              letterSpacing: '3px'
            }}
          >
            {menuScreen === 'home' ? '▼ SELECT DIFFICULTY ▼' : '▼ ARCADE LEADERBOARD ▼'}
          </p>
          
          <div 
            className={`${compactMenu ? 'hidden' : 'text-sm'} font-mono text-white opacity-60`}
            style={{ letterSpacing: '1px' }}
          >
            {menuScreen === 'home' ? 'Initialize combat parameters...' : 'Review global combat records...'}
          </div>
        </div>

        {menuScreen === 'home' ? (
          <>
            {/* Clean Premium Difficulty Cards */}
            <div className={`relative z-10 grid ${compactMenu ? 'grid-cols-1 gap-2 max-w-xs px-3 w-full' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl px-6'}`}>
              {Object.entries(DIFFICULTY_CONFIG).map(([diff, config], index) => {
                const isEven = index % 2 === 0;
                const primaryColor = isEven ? '#00ffff' : '#ffaa00';
                const glowColor = isEven ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 170, 0, 0.4)';

                return (
                  <div
                    key={diff}
                    className={`relative cursor-pointer transition-all duration-300 bg-black border-2 rounded-lg group overflow-hidden ${compactMenu ? 'p-3' : 'p-8 transform hover:scale-110'}`}
                    style={{
                      borderColor: primaryColor,
                      background: 'linear-gradient(145deg, #000000, #111111)',
                      boxShadow: `
                        0 8px 30px ${glowColor},
                        inset 0 2px 0 rgba(255, 255, 255, 0.1),
                        inset 0 -2px 0 ${primaryColor}30,
                        0 4px 0 ${primaryColor}60,
                        0 8px 0 ${primaryColor}40
                      `,
                      animation: compactMenu ? 'none' : `menuButtonSlide 0.6s ease-out ${index * 0.15}s both`
                    }}
                    onClick={() => {
                      playButtonClick();
                      setTimeout(() => {
                        startGame(diff as Difficulty);
                        focusTypingInput();
                      }, 100);
                    }}
                    onMouseEnter={() => playButtonHover()}
                  >
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.05) 2px, rgba(255, 255, 255, 0.05) 4px)'
                      }}
                    />

                    {!compactMenu && <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 opacity-80" style={{ borderColor: primaryColor }} />}
                    {!compactMenu && <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 opacity-80" style={{ borderColor: primaryColor }} />}
                    {!compactMenu && <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 opacity-80" style={{ borderColor: primaryColor }} />}
                    {!compactMenu && <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 opacity-80" style={{ borderColor: primaryColor }} />}

                    <div
                      className="absolute top-4 right-4 w-2 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 0 8px ${primaryColor}`
                      }}
                    />

                    <div className="text-center relative z-10">
                      <h3
                        className={`${compactMenu ? 'text-xl mb-1' : 'text-3xl mb-4'} font-bold font-mono tracking-wider`}
                        style={{
                          color: primaryColor,
                          textShadow: `
                            0 0 20px ${glowColor},
                            0 0 40px ${glowColor}50,
                            1px 1px 0 #000000
                          `,
                          letterSpacing: '3px'
                        }}
                      >
                        {diff.toUpperCase()}
                      </h3>

                      {!compactMenu && (
                        <p
                          className="text-white font-mono text-sm mb-6 opacity-90 leading-relaxed"
                          style={{
                            textShadow: '0 0 8px rgba(255, 255, 255, 0.3)',
                            letterSpacing: '0.5px'
                          }}
                        >
                          {config.description}
                        </p>
                      )}

                      <div className={compactMenu ? 'mb-1' : 'mb-4'}>
                        <div className={`font-mono opacity-60 ${compactMenu ? 'text-[9px] mb-1' : 'text-xs mb-2'}`} style={{ color: primaryColor }}>
                          THREAT LEVEL
                        </div>
                        <div className={`flex justify-center ${compactMenu ? 'space-x-1' : 'space-x-2'}`}>
                          {[...Array(diff === 'easy' ? 1 : diff === 'normal' ? 2 : diff === 'hard' ? 3 : 4)].map((_, i) => (
                            <div
                              key={i}
                              className={`${compactMenu ? 'w-2.5 h-2.5' : 'w-3 h-3'} border`}
                              style={{
                                backgroundColor: primaryColor,
                                borderColor: primaryColor,
                                boxShadow: `0 0 6px ${primaryColor}80`,
                                opacity: 0.9
                              }}
                            />
                          ))}
                          {[...Array(4 - (diff === 'easy' ? 1 : diff === 'normal' ? 2 : diff === 'hard' ? 3 : 4))].map((_, i) => (
                            <div
                              key={i + 10}
                              className={`${compactMenu ? 'w-2.5 h-2.5' : 'w-3 h-3'} border border-gray-600 opacity-30`}
                            />
                          ))}
                        </div>
                      </div>

                      <div
                        className={`font-mono opacity-70 ${compactMenu ? 'text-[9px]' : 'text-xs'}`}
                        style={{ color: primaryColor, letterSpacing: '1px' }}
                      >
                        {compactMenu ? 'TAP TO START' : '▶ CLICK TO START ◀'}
                      </div>
                    </div>

                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                );
              })}
            </div>

            <div className={`relative z-10 flex flex-col items-center gap-4 text-center ${compactMenu ? 'mt-4' : 'mt-12'}`}>
              <button
                className={`border rounded-lg bg-black/70 font-mono transition-all duration-150 hover:scale-105 ${compactMenu ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm'}`}
                style={{
                  borderColor: '#ffaa00',
                  color: '#ffaa00',
                  boxShadow: '0 0 15px rgba(255, 170, 0, 0.22)',
                }}
                onClick={() => {
                  playButtonClick();
                  setMenuScreen('leaderboard');
                }}
                onMouseEnter={() => playButtonHover()}
              >
                VIEW LEADERBOARD
              </button>
            </div>
          </>
        ) : (
          <div className={`relative z-10 w-full ${compactMenu ? 'max-w-md px-3' : 'max-w-4xl px-6'}`}>
            <div
              className={`border rounded-lg bg-black/75 ${compactMenu ? 'p-3' : 'p-5 md:p-6'}`}
              style={{
                borderColor: '#00ffff',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.18)',
              }}
            >
              <div className={`flex ${compactMenu ? 'flex-col gap-2 mb-3' : 'flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5'}`}>
                <div>
                  <div className={`text-cyan-400 font-mono tracking-[0.2em] ${compactMenu ? 'text-xs' : 'text-sm'}`}>ARCADE LEADERBOARD</div>
                  <div className="text-xs font-mono text-white/50 mt-1">
                    {leaderboardLoading ? 'SYNCING...' : leaderboardError || `TOP ${LEADERBOARD_LIMIT} PER MODE`}
                  </div>
                </div>
                <button
                  className={`border rounded-lg bg-black/70 font-mono text-xs transition-all duration-150 hover:scale-105 ${compactMenu ? 'px-3 py-2 w-full' : 'px-4 py-2'}`}
                  style={{
                    borderColor: '#ffaa00',
                    color: '#ffaa00',
                    boxShadow: '0 0 12px rgba(255, 170, 0, 0.18)',
                  }}
                  onClick={() => {
                    playButtonClick();
                    setMenuScreen('home');
                  }}
                  onMouseEnter={() => playButtonHover()}
                >
                  ← BACK TO HOME
                </button>
              </div>

              <div className={`${compactMenu ? 'grid grid-cols-2' : 'flex flex-wrap'} gap-2 mb-4`}>
                {(Object.keys(createEmptyLeaderboards()) as Difficulty[]).map(diff => (
                  <button
                    key={diff}
                    className={`px-3 py-2 text-xs font-mono border rounded transition-all duration-150 ${compactMenu ? 'w-full' : ''}`}
                    style={{
                      borderColor: leaderboardTab === diff ? difficultyTextColor[diff] : '#334155',
                      color: leaderboardTab === diff ? difficultyTextColor[diff] : '#cbd5e1',
                      boxShadow: leaderboardTab === diff ? `0 0 10px ${difficultyTextColor[diff]}55` : 'none',
                    }}
                    onClick={() => setLeaderboardTab(diff)}
                  >
                    {diff.toUpperCase()}
                  </button>
                ))}
              </div>
              {renderLeaderboardBoard(leaderboardTab, LEADERBOARD_LIMIT)}
            </div>
          </div>
        )}

        {/* System Info */}
        {!compactMenu && (
          <>
            <div className="absolute bottom-4 left-4 text-xs font-mono text-cyan-400 opacity-60 pointer-events-none">
              SYSTEM.v2.0 | KILL TYPE | READY
            </div>
            
            <div className="absolute bottom-4 right-4 text-xs font-mono text-amber-400 opacity-60 pointer-events-none">
              COPYRIGHT 2026 | BURNPILES LLC
            </div>
          </>
        )}
      </div>
    );
  }

  const activeThreshold = BOSS_THRESHOLD[gameState.difficulty];
  const bossProgress = Math.min(gameState.killsTowardsBoss / activeThreshold, 1);
  const bossStatus = gameState.boss.active
    ? (gameState.boss.phase === 'sentence' ? 'EXECUTE BOSS' : 'BOSS ACTIVE')
    : gameState.gameTime < gameState.chapterTransitionUntil
      ? 'CHAPTER BREAK'
      : `BOSS IN ${Math.max(activeThreshold - gameState.killsTowardsBoss, 0)}`;
  const activeWeaponName = gameState.currentWeapon === 'pistol'
    ? 'PISTOL'
    : (gameState.currentWeapon in SPECIAL_WEAPONS
      ? SPECIAL_WEAPONS[gameState.currentWeapon as keyof typeof SPECIAL_WEAPONS].name
      : 'PISTOL');
  const activeWeaponDamage = WEAPON_DAMAGE[gameState.currentWeapon as keyof typeof WEAPON_DAMAGE] || 1;
  const activeWeaponBehavior = WEAPON_BEHAVIOR[gameState.currentWeapon as keyof typeof WEAPON_BEHAVIOR] ?? WEAPON_BEHAVIOR.pistol;

  const containerClass = isTouchLayout
    ? "flex flex-col items-center justify-start bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-2 pb-2 overflow-hidden"
    : "flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4";

  const gameCanvas = (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border-4 border-yellow-400 rounded-lg shadow-2xl shadow-yellow-400/50"
      style={{
        imageRendering: 'pixelated',
        filter: 'contrast(1.2) brightness(1.1) saturate(1.2)',
        width: isTouchLayout ? '100%' : undefined,
        height: isTouchLayout ? 'auto' : undefined,
        maxWidth: isTouchLayout ? `${CANVAS_WIDTH}px` : '95vw',
        maxHeight: isTouchLayout ? `${CANVAS_HEIGHT}px` : '85vh',
        objectFit: 'contain'
      }}
      onPointerDown={() => focusTypingInput()}
    />
  );

  return (
    <div
      className={containerClass}
      style={isTouchLayout ? { height: `${viewportMetrics.visualHeight}px`, maxHeight: `${viewportMetrics.visualHeight}px` } : undefined}
    >
      {/* Branded Menu Button */}
      {!isTouchLayout && (
        <button
          onClick={() => {
            playButtonClick();
            toggleMenu();
          }}
          onMouseEnter={() => playButtonHover()}
          className="fixed top-4 right-4 z-40 border-2 rounded-lg font-mono tracking-[0.18em] transform hover:scale-105 transition-all duration-200 active:scale-95 overflow-hidden px-4 py-3 text-xs"
          style={{
            color: '#00ffff',
            borderColor: '#00ffff',
            background: 'linear-gradient(145deg, rgba(2, 10, 20, 0.96), rgba(8, 22, 38, 0.94))',
            boxShadow: `
              0 0 18px rgba(0, 255, 255, 0.35),
              inset 0 0 18px rgba(0, 255, 255, 0.08),
              0 3px 0 rgba(0, 120, 120, 0.8)
            `,
            textShadow: '0 0 10px rgba(0, 255, 255, 0.85)'
          }}
        >
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.06) 2px, rgba(255, 255, 255, 0.06) 4px)'
            }}
          />
          <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-400 pointer-events-none" style={{ boxShadow: '0 0 8px #ffaa00' }} />
          <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 pointer-events-none animate-pulse" style={{ boxShadow: '0 0 8px #00ffff' }} />
          <div className="relative flex items-center">
            <span>MENU</span>
          </div>
        </button>
      )}

      {isTouchLayout ? (
        <div className={`w-full max-w-[520px] flex flex-col items-center gap-2 ${keyboardVisible ? 'pt-14' : 'pt-16'}`}>
          <div className="w-full flex items-stretch gap-2">
            <div className="flex-1 rounded-lg border bg-black/70 overflow-hidden" style={{ borderColor: '#1f3952' }}>
              <button
                className="w-full px-3 py-2 flex items-center justify-between gap-3 text-left"
                onClick={() => setMobileHudExpanded(prev => !prev)}
              >
                <div>
                  <div className="text-[9px] font-mono tracking-[0.18em] text-slate-400">LIVES</div>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: MAX_LIVES }, (_, i) => (
                      <div key={i}>{renderPixelHeart(i < gameState.lives, 1.5)}</div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono tracking-[0.18em] text-slate-500">
                    {mobileHudExpanded ? 'HIDE HUD' : 'SHOW HUD'}
                  </div>
                  <div className="mt-1 text-lg font-mono text-cyan-300">
                    {mobileHudExpanded ? '−' : '+'}
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                playButtonClick();
                toggleMenu();
              }}
              className="shrink-0 border-2 rounded-lg font-mono tracking-[0.18em] transition-all duration-200 active:scale-95 overflow-hidden px-3 py-2 text-[10px] relative min-w-[92px]"
              style={{
                color: '#00ffff',
                borderColor: '#00ffff',
                background: 'linear-gradient(145deg, rgba(2, 10, 20, 0.96), rgba(8, 22, 38, 0.94))',
                boxShadow: `
                  0 0 18px rgba(0, 255, 255, 0.35),
                  inset 0 0 18px rgba(0, 255, 255, 0.08),
                  0 3px 0 rgba(0, 120, 120, 0.8)
                `,
                textShadow: '0 0 10px rgba(0, 255, 255, 0.85)'
              }}
            >
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.06) 2px, rgba(255, 255, 255, 0.06) 4px)'
                }}
              />
              <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-400 pointer-events-none" style={{ boxShadow: '0 0 8px #ffaa00' }} />
              <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 pointer-events-none animate-pulse" style={{ boxShadow: '0 0 8px #00ffff' }} />
              <div className="relative flex items-center justify-center h-full">
                <span>MENU</span>
              </div>
            </button>
          </div>

          {mobileHudExpanded && (
            <div className="w-full rounded-lg border bg-black/70 px-3 py-3 space-y-2" style={{ borderColor: '#1f3952' }}>
              <div className="w-full grid grid-cols-4 gap-2">
                {[
                  { label: 'SCORE', value: gameState.score.toLocaleString(), color: '#facc15' },
                  { label: 'KILLS', value: String(gameState.kills), color: '#22d3ee' },
                  { label: 'WPM', value: String(gameState.wpm), color: '#22d3ee' },
                  { label: 'ACC', value: `${Math.round(gameState.accuracyPct)}%`, color: '#ffffff' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border bg-black/60 px-2 py-2 text-center" style={{ borderColor: '#1f3952' }}>
                    <div className="text-[9px] font-mono tracking-[0.18em] text-slate-400">{item.label}</div>
                    <div className="mt-1 text-xs font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="w-full rounded-lg border bg-black/60 px-3 py-2" style={{ borderColor: '#1f3952' }}>
                <div className="flex items-center justify-between gap-3 text-[10px] font-mono tracking-[0.18em] text-slate-400">
                  <span>{bossStatus}</span>
                  <span style={{ color: difficultyTextColor[gameState.difficulty] }}>{gameState.difficulty.toUpperCase()}</span>
                </div>
                <div className="mt-2 h-2 rounded-full border" style={{ borderColor: '#2a3b4f' }}>
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: `${bossProgress * 100}%` }} />
                </div>
              </div>

              <div className="w-full grid grid-cols-[1.25fr_0.75fr] gap-2">
                <div className="rounded-lg border bg-black/60 px-3 py-2" style={{ borderColor: '#1f3952' }}>
                  <div className="text-[9px] font-mono tracking-[0.18em] text-slate-400">WEAPON</div>
                  <div className="mt-1 text-xs font-mono font-bold text-white">{activeWeaponName}</div>
                  <div className="mt-1 text-[10px] font-mono text-slate-300">DMG {activeWeaponDamage} • {activeWeaponBehavior.label.toUpperCase()}</div>
                  {gameState.currentWeapon !== 'pistol' && (
                    <div className="mt-1 text-[10px] font-mono text-slate-300">
                      {gameState.weaponAmmo > 0 ? `AMMO ${gameState.weaponAmmo}` : `TIME ${Math.ceil(gameState.weaponTimeLeft / 1000)}s`}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border bg-black/60 px-3 py-2" style={{ borderColor: '#1f3952' }}>
                  <div className="text-[9px] font-mono tracking-[0.18em] text-slate-400">CHAPTER</div>
                  <div className="mt-1 text-xs font-mono font-bold text-amber-300">{gameState.level}</div>
                </div>
              </div>

              <div className="w-full rounded-lg border bg-black/60 px-3 py-2" style={{ borderColor: '#1f3952' }}>
                <div className="text-[9px] font-mono tracking-[0.18em] text-slate-400">LEGEND</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  {[
                    { label: 'normal', border: '#22324a', dash: 'solid' },
                    { label: 'target', border: '#00ffff', dash: 'dashed' },
                    { label: 'special', border: '#ff00aa', dash: 'dashed' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex-1 rounded bg-[#0b1320] px-2 py-1 text-center text-[10px] font-mono text-white"
                      style={{ border: `1px ${item.dash} ${item.border}` }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="w-full flex-1 min-h-0" onPointerDown={() => focusTypingInput()}>
            {gameCanvas}
          </div>

          <div className="w-full rounded-lg border bg-black/70 px-3 py-2 shrink-0" style={{ borderColor: '#1f3952' }}>
            <input
              ref={mobileInputRef}
              type="text"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="TAP HERE TO TYPE"
              className="w-full rounded-lg border px-3 py-2 text-xs font-mono text-center text-cyan-300 placeholder:text-cyan-300/90 bg-transparent focus:outline-none"
              style={{
                borderColor: '#00ffff',
                boxShadow: '0 0 14px rgba(0, 255, 255, 0.12)',
                fontSize: 16,
              }}
              onClick={() => focusTypingInput()}
              onInput={(event) => {
                const value = event.currentTarget.value;
                const lastChar = value.slice(-1);
                if (lastChar) {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: lastChar, bubbles: true }));
                }
                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>
      ) : (
        gameCanvas
      )}

      {/* CLEAN PREMIUM IN-GAME MENU - Only show if game not over */}
      {gameState.showMenu && gameState.lives > 0 && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* Premium 1990s Cyberpunk Menu Container */}
          <div className="relative max-w-md w-full mx-4"
               style={{
                 background: 'linear-gradient(145deg, #0a0a0a, #1a1a1a)',
                 border: '2px solid #00ffff',
                 borderRadius: '8px',
                 boxShadow: `
                   0 0 20px rgba(0, 255, 255, 0.5),
                   inset 0 0 20px rgba(0, 255, 255, 0.1),
                   0 4px 0 #008888,
                   0 8px 0 #006666
                 `,
                 padding: '32px',
                 fontFamily: 'Courier New, monospace'
               }}
          >
            {/* CRT Scanlines Effect */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.1) 2px, rgba(0, 255, 255, 0.1) 4px)',
                borderRadius: '8px'
              }}
            />
            
            {/* Corner LED Indicators */}
            <div className="absolute top-2 left-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-2 left-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-2 right-2 w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
            {/* Premium 1990s Terminal Title */}
            <div className="text-center mb-8 relative z-10">
              <div 
                className="text-xs font-mono text-amber-400 mb-2 opacity-80"
                style={{ letterSpacing: '2px' }}
              >
                [SYSTEM STATUS: PAUSED]
              </div>
              <h1 
                className="text-4xl font-bold mb-3 font-mono tracking-wider"
                style={{
                  color: '#00ffff',
                  textShadow: '0 0 20px rgba(0, 255, 255, 1), 0 0 40px rgba(0, 255, 255, 0.5)',
                  letterSpacing: '4px'
                }}
              >
                PAUSE
              </h1>
              
              <div 
                className="h-1 w-48 mx-auto mb-2"
                style={{
                  background: 'linear-gradient(90deg, transparent, #00ffff, #ffaa00, #00ffff, transparent)',
                  boxShadow: '0 0 10px rgba(0, 255, 255, 0.8)'
                }}
              />
              
              <div 
                className="text-xs font-mono text-green-400 opacity-70"
                style={{ letterSpacing: '1px' }}
              >
                ▼ SELECT OPTION ▼
              </div>
            </div>

            {/* Premium 1990s Terminal Buttons */}
            <div className="space-y-4 relative z-10">
              {[
                { 
                  label: '► CONTINUE', 
                  action: resumeGame, 
                  color: '#00ffff',
                  key: '[C]'
                },
                { 
                  label: '↻ RESTART', 
                  action: restartGame, 
                  color: '#ffaa00',
                  key: '[R]'
                },
                { 
                  label: '← MAIN MENU', 
                  action: quitToMenu, 
                  color: '#ff6666',
                  key: '[M]'
                },
                { 
                  label: '✕ BACK TO GAME', 
                  action: () => setGameState(prev => ({ ...prev, showMenu: false })), 
                  color: '#888888',
                  key: '[ESC]'
                }
              ].map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    playButtonClick();
                    setTimeout(() => option.action(), 100);
                  }}
                  className="w-full py-4 px-6 bg-black border font-mono font-bold tracking-wider transform hover:scale-105 transition-all duration-200 relative overflow-hidden"
                  style={{
                    borderColor: option.color,
                    borderWidth: '2px',
                    color: option.color,
                    textShadow: `0 0 10px ${option.color}`,
                    boxShadow: `
                      0 0 15px ${option.color}40,
                      inset 0 1px 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 ${option.color}30
                    `,
                    background: `linear-gradient(145deg, #000000, #111111)`,
                    letterSpacing: '1px'
                  }}
                  onMouseEnter={(e) => {
                    playButtonHover();
                    e.currentTarget.style.background = `linear-gradient(145deg, ${option.color}15, ${option.color}05)`;
                    e.currentTarget.style.borderColor = option.color;
                    e.currentTarget.style.boxShadow = `
                      0 0 25px ${option.color}80,
                      inset 0 0 20px ${option.color}20,
                      inset 0 1px 0 rgba(255, 255, 255, 0.2)
                    `;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, #000000, #111111)';
                    e.currentTarget.style.boxShadow = `
                      0 0 15px ${option.color}40,
                      inset 0 1px 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 ${option.color}30
                    `;
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span>{option.label}</span>
                    <span className="text-xs opacity-60 font-mono">{option.key}</span>
                  </div>
                  
                  {/* Terminal cursor effect */}
                  <div 
                    className="absolute right-2 top-1/2 w-1 h-4 bg-current opacity-60 animate-pulse"
                    style={{ transform: 'translateY(-50%)' }}
                  />
                </button>
              ))}
            </div>

            {/* Premium 1990s Terminal Stats */}
            <div className="mt-8 relative z-10">
              <div 
                className="border-t border-cyan-400 pt-4 mb-4"
                style={{
                  borderImage: 'linear-gradient(90deg, transparent, #00ffff, transparent) 1'
                }}
              >
                <div className="text-center text-xs font-mono text-amber-400 mb-3 opacity-80">
                  ═══ SYSTEM STATUS ═══
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div className="text-center p-2 border border-cyan-400 border-opacity-30 bg-black bg-opacity-50">
                    <div className="text-xs text-cyan-400 opacity-70">LEVEL</div>
                    <div className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px #00ffff' }}>{gameState.level}</div>
                  </div>
                  <div className="text-center p-2 border border-green-400 border-opacity-30 bg-black bg-opacity-50">
                    <div className="text-xs text-green-400 opacity-70">LIVES</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {Array.from({ length: MAX_LIVES }, (_, i) => (
                        <div key={i}>
                          {renderPixelHeart(i < gameState.lives, isTouchLayout ? 2 : 3)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-center p-2 border border-amber-400 border-opacity-30 bg-black bg-opacity-50">
                    <div className="text-xs text-amber-400 opacity-70">WPM</div>
                    <div className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px #ffaa00' }}>{gameState.wpm}</div>
                  </div>
                  <div className="text-center p-2 border border-purple-400 border-opacity-30 bg-black bg-opacity-50">
                    <div className="text-xs text-purple-400 opacity-70">SCORE</div>
                    <div className="text-lg font-bold text-white" style={{ textShadow: '0 0 10px #aa00ff' }}>{gameState.score.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              {/* Terminal Command Hint */}
              <div className="text-center">
                <div className="text-xs font-mono text-green-400 opacity-60">
                  <span className="animate-pulse">█</span> Press [ESC] to toggle terminal
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {gameState.lives <= 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm p-3 md:p-4">
          <div className="min-h-full flex items-center justify-center">
            <div className="text-center p-4 md:p-6 bg-gradient-to-br from-red-900/90 to-purple-900/90 rounded-2xl border-4 border-red-500 shadow-2xl shadow-red-500/50 max-w-2xl w-full">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-red-400 mb-4 animate-pulse">💀 GAME OVER 💀</h2>
            <div className="text-lg md:text-xl lg:text-2xl text-white mb-4 space-y-1">
              <p>Final Score: <span className="text-yellow-400 font-bold">{gameState.score.toLocaleString()}</span></p>
              <p>Level Reached: <span className="text-cyan-400 font-bold">{gameState.level}</span></p>
              <p>Max Combo: <span className="text-pink-400 font-bold">x{gameState.combo}</span></p>
              <p>WPM: <span className="text-green-400 font-bold">{gameState.wpm}</span></p>
              <p>Difficulty: <span className="font-bold" style={{ 
                color: difficultyTextColor[gameState.difficulty]
              }}>
                {gameState.difficulty.toUpperCase()}
              </span></p>
            </div>
            <div className="mb-5 border rounded-xl bg-black/45 p-3 md:p-4" style={{ borderColor: difficultyTextColor[gameState.difficulty] }}>
              <div className="text-[10px] md:text-xs font-mono tracking-[0.2em] mb-2" style={{ color: difficultyTextColor[gameState.difficulty] }}>
                LEADERBOARD STATUS
              </div>
              {submittedHighScore ? (
                <div className="space-y-2">
                  <div className="text-lg md:text-xl font-mono text-green-300">
                    SCORE RECORDED: #{submittedHighScore.rank}
                  </div>
                  <div className="text-xs md:text-sm font-mono text-white/75">
                    {submittedHighScore.username} entered the {gameState.difficulty.toUpperCase()} board.
                  </div>
                </div>
              ) : qualifyingResult?.qualifies ? (
                <div className="space-y-3">
                  <div className="text-lg md:text-xl font-mono text-yellow-300">
                    QUALIFIES FOR #{qualifyingResult.rank ?? LEADERBOARD_LIMIT}
                  </div>
                  <div className="text-xs md:text-sm font-mono text-white/75">
                    Enter your arcade name to claim the run.
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={highScoreName}
                      onChange={(event) => setHighScoreName(event.target.value.slice(0, 12))}
                      placeholder="ARCADE NAME"
                      className="flex-1 px-3 py-2 rounded-lg bg-black/70 border text-sm md:text-base text-white font-mono uppercase tracking-[0.2em]"
                      style={{ borderColor: difficultyTextColor[gameState.difficulty] }}
                    />
                    <button
                      onClick={submitLeaderboardScore}
                      disabled={submittingHighScore || !highScoreName.trim()}
                      className="px-5 py-2 rounded-lg text-sm md:text-base text-black font-bold font-mono disabled:opacity-50"
                      style={{ backgroundColor: difficultyTextColor[gameState.difficulty] }}
                    >
                      {submittingHighScore ? 'SAVING...' : 'SUBMIT'}
                    </button>
                  </div>
                </div>
              ) : qualifyingResult ? (
                <div className="space-y-2">
                  <div className="text-base md:text-lg font-mono text-white">
                    Score did not reach the {gameState.difficulty.toUpperCase()} top {qualifyingResult.limit}.
                  </div>
                  <div className="text-xs md:text-sm font-mono text-white/70">
                    Cut line: {qualifyingResult.lowestScore?.toLocaleString() ?? 'open board'}
                  </div>
                </div>
              ) : (
                <div className="text-xs md:text-sm font-mono text-white/60">
                  {leaderboardLoading ? 'Checking leaderboard...' : leaderboardError || 'Unable to check leaderboard right now.'}
                </div>
              )}
              {leaderboardError && !leaderboardLoading && (
                <div className="mt-3 text-xs font-mono text-red-300">{leaderboardError}</div>
              )}
            </div>
            <div className="mb-5 text-left">
              <div className="flex flex-wrap gap-2 mb-3">
                {(Object.keys(createEmptyLeaderboards()) as Difficulty[]).map(diff => (
                  <button
                    key={diff}
                    className="px-2 py-1.5 text-[10px] md:text-xs font-mono border rounded transition-all duration-150"
                    style={{
                      borderColor: leaderboardTab === diff ? difficultyTextColor[diff] : '#475569',
                      color: leaderboardTab === diff ? difficultyTextColor[diff] : '#e2e8f0',
                      boxShadow: leaderboardTab === diff ? `0 0 10px ${difficultyTextColor[diff]}55` : 'none',
                    }}
                    onClick={() => setLeaderboardTab(diff)}
                  >
                    {diff.toUpperCase()}
                  </button>
                ))}
              </div>
              {renderLeaderboardBoard(leaderboardTab, 5)}
            </div>
            <div className="space-y-4">
              <button
                className="px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-red-600 to-red-800 text-white text-base md:text-lg lg:text-xl font-bold rounded-xl hover:from-red-700 hover:to-red-900 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-red-500/30 block w-full"
                onClick={() => startGame(gameState.difficulty)}
              >
                🔥 PLAY AGAIN ({gameState.difficulty.toUpperCase()}) 🔥
              </button>
              <button
                className="px-6 py-3 md:px-8 bg-gradient-to-r from-purple-600 to-purple-800 text-white text-sm md:text-base lg:text-lg font-bold rounded-xl hover:from-purple-700 hover:to-purple-900 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-purple-500/30 block w-full"
                onClick={() => setGameState(prev => ({ ...prev, gameStarted: false }))}
              >
                🎯 CHANGE DIFFICULTY 🎯
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
} 