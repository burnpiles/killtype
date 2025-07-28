const WORD_LIST = [
  // Common typing words
  'zombie', 'brain', 'attack', 'shoot', 'kill', 'dead', 'blood',
  'terror', 'fear', 'panic', 'run', 'hide', 'survive', 'escape',
  'weapon', 'gun', 'bullet', 'reload', 'aim', 'fire', 'hit',
  'miss', 'target', 'enemy', 'danger', 'death', 'life', 'safe',
  
  // Action words
  'quick', 'fast', 'slow', 'move', 'stop', 'go', 'turn', 'jump',
  'duck', 'cover', 'shield', 'guard', 'watch', 'look', 'see',
  'hear', 'sound', 'noise', 'quiet', 'loud', 'scream', 'yell',
  
  // Environment words  
  'house', 'door', 'window', 'wall', 'floor', 'roof', 'room',
  'street', 'road', 'car', 'truck', 'bike', 'walk', 'path',
  'tree', 'grass', 'sky', 'cloud', 'sun', 'moon', 'star',
  
  // Common words for typing practice
  'the', 'and', 'you', 'that', 'was', 'for', 'are', 'with',
  'his', 'they', 'one', 'have', 'this', 'from', 'word',
  'but', 'what', 'some', 'time', 'very', 'when', 'come',
  'here', 'could', 'state', 'just', 'first', 'into', 'over',
  
  // Gaming words
  'level', 'score', 'game', 'play', 'win', 'lose', 'try',
  'again', 'start', 'end', 'begin', 'finish', 'complete',
  'power', 'boost', 'speed', 'slow', 'strong', 'weak'
];

export function generateWord(): string {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

export function generateWords(count: number): string[] {
  return Array.from({ length: count }, () => generateWord());
}
