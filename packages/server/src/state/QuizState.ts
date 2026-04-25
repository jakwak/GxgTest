import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

export class Player extends Schema {
  @type('string') id = '';
  @type('string') name = '';
  @type('number') score = 0;
  @type('number') answeredCount = 0;
  @type('boolean') hasSubmitted = false;
  @type('boolean') lastCorrect = false;
}

export class QuizState extends Schema {
  @type('string') status: 'waiting' | 'playing' | 'reveal' | 'ended' = 'waiting';
  @type('number') currentIndex = 0;
  @type('number') totalQuestions = 0;
  @type('number') timeLeft = 0;
  @type('string') currentQuestionId = '';

  @type({ map: Player }) players = new MapSchema<Player>();
  @type(['string']) submittedPlayers = new ArraySchema<string>();
}
