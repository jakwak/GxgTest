// 서버 · 클라이언트가 공유하는 문제 타입 정의.
// payload 구조는 Supabase gxgtest_questions.payload(jsonb)와 1:1 매핑된다.

export type QuestionType =
  | 'matching'
  | 'multiple_choice'
  | 'classify'
  | 'ordering'
  | 'hotspot'
  | 'slider';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  title: string;
  prompt: string;
  tip?: string;
  score: number;
  timeLimit: number; // 초
}

// 1) 짝 맞추기 — 이미지 1
export interface MatchingQ extends BaseQuestion {
  type: 'matching';
  payload: {
    left: { id: string; label: string }[];
    right: { id: string; label: string }[];
    correct: Record<string, string>; // leftId -> rightId
  };
}

// 2) 이야기 객관식 — 이미지 2
export interface MultipleChoiceQ extends BaseQuestion {
  type: 'multiple_choice';
  payload: {
    situation: string;
    question: string;
    options: { id: string; label: string }[];
    correctId: string;
  };
}

// 3) 분류하기 — 이미지 3
export interface ClassifyQ extends BaseQuestion {
  type: 'classify';
  payload: {
    cards: (string | number)[];
    bins: { id: string; label: string }[]; // 약수 / 배수 / 둘 다 아님
    correct: Record<string, string | string[]>; // card -> binId or accepted binIds
  };
}

// 4) 순서 배열 — 이미지 4
export interface OrderingQ extends BaseQuestion {
  type: 'ordering';
  payload: {
    slotCount: number;
    pool: number[]; // 풀에 표시되는 카드 (정답 + 디스트랙터)
    distractors: number[]; // 정답이 아닌 카드 (UI 표시용)
    fixed: { index: number; value: number }[]; // 위치 고정 카드
    correctOrder: number[]; // 최종 정답 시퀀스
  };
}

// 5) 핫스팟 — 이미지 5
export interface HotspotQ extends BaseQuestion {
  type: 'hotspot';
  payload: {
    rangeFrom: number;
    rangeTo: number;
    correct: number[];
    decoys?: number[]; // 오답 강조용 표시
  };
}

// 6) 슬라이더 — 이미지 6
export interface SliderQ extends BaseQuestion {
  type: 'slider';
  payload: {
    a: number;
    b: number;
    min: number;
    max: number;
    correct: number;
  };
}

export type Question =
  | MatchingQ
  | MultipleChoiceQ
  | ClassifyQ
  | OrderingQ
  | HotspotQ
  | SliderQ;

// 학생이 서버로 보내는 응답 타입
export type Response =
  | Record<string, string>      // matching, classify
  | string                      // multiple_choice
  | number[]                    // ordering, hotspot
  | number;                     // slider
