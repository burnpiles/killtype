export const BOSS_SENTENCES: Record<'easy' | 'normal' | 'hard' | 'extreme', string[]> = {
  easy: [
    'the night is dark',
    'aim true and survive',
    'reload and carry on',
  ],
  normal: [
    'fear the rising horde',
    'steady hands save lives',
    'the bunker will not hold',
  ],
  hard: [
    'only the fearless endure the storm',
    'precision and courage end nightmares',
    'steel your nerves and fight on',
  ],
  extreme: [
    'mechanized death marches and we stand defiant',
    'in the abyss of terror we forge our will',
    'no mercy no surrender purge the darkness',
  ],
};

export function getRandomBossSentence(
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme',
): string {
  const bank = BOSS_SENTENCES[difficulty];
  return bank[Math.floor(Math.random() * bank.length)];
}

