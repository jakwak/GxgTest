<script lang="ts">
  let { question, revealedAnswer = null, locked = false, onsubmit }: {
    question: any;
    revealedAnswer?: number | null;
    locked?: boolean;
    onsubmit?: (data: number) => void;
  } = $props();

  const { a, b, min, max } = question.payload;
  let value = $state(Math.round((min + max) / 2));

  let dividesA = $derived(a % value === 0);
  let dividesB = $derived(b % value === 0);
  let checkText = $derived(
    value > 0
      ? `${a} ÷ ${value} = ${a / value}, ${b} ÷ ${value} = ${b / value}`
      : ''
  );
</script>

<section class="question-card">
  <p class="lead">{question.prompt}</p>

  <div class="numbers">
    <div class="num-card coral">
      <span>첫 번째 수</span>
      <strong>{a}</strong>
    </div>
    <div class="num-card purple">
      <span>두 번째 수</span>
      <strong>{b}</strong>
    </div>
  </div>

  <div class="slider-label">슬라이더로 답을 선택하세요 ({min} ~ {max})</div>

  <div class="slider-wrap">
    <div class="bubble">{value}</div>
    <input type="range" min={min} max={max} step="1" bind:value disabled={locked} />
    <div class="ticks">
      <span>{min}</span>
      <span>{Math.round((min + max) / 2)}</span>
      <span>{max}</span>
    </div>
  </div>

  <div class="check-panel">
    <strong>검산:</strong> {checkText}
    <div class="sub">{dividesA && dividesB ? '둘 다 나누어떨어집니다!' : '아직 둘 다 나누어떨어지지 않아요.'}</div>
    {#if question.tip}
      <div class="tip">TIP! {question.tip}</div>
    {/if}
    {#if revealedAnswer != null}
      <div class="answer">정답: {revealedAnswer}</div>
    {/if}
  </div>

  <div class="actions">
    <button class="submit" disabled={locked} onclick={() => onsubmit?.(value)}>제출하기</button>
  </div>
</section>

<style>
  .question-card {
    display: grid;
    gap: 1.25rem;
  }

  .lead {
    margin: 0;
    text-align: center;
    font-size: 1.45rem;
    font-weight: 700;
    color: #30455f;
  }

  .numbers {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .num-card {
    min-height: 8.7rem;
    border-radius: 18px;
    background: white;
    border: 4px solid #ff6c6c;
    display: grid;
    place-items: center;
    gap: 0.2rem;
  }

  .num-card span {
    color: #90a0b2;
    font-size: 1.3rem;
  }

  .num-card strong {
    font-size: 4rem;
    line-height: 1;
  }

  .num-card.coral {
    border-color: #ff6c6c;
    color: #ff6c6c;
  }

  .num-card.purple {
    border-color: #9b63c5;
    color: #9b63c5;
  }

  .slider-label {
    text-align: center;
    color: #30455f;
    font-size: 1.35rem;
    font-weight: 700;
  }

  .slider-wrap {
    padding: 0 0.5rem;
  }

  .bubble {
    width: 7rem;
    height: 4rem;
    margin: 0 auto 0.75rem;
    border-radius: 14px;
    background: #4e8de1;
    color: white;
    font-size: 2rem;
    font-weight: 700;
    display: grid;
    place-items: center;
  }

  input[type='range'] {
    width: 100%;
    accent-color: #4e8de1;
  }

  .ticks {
    display: flex;
    justify-content: space-between;
    color: #90a0b2;
    font-size: 1rem;
  }

  .check-panel {
    border-radius: 18px;
    border: 3px solid #67c971;
    background: #eef9ef;
    padding: 1rem 1.15rem;
    text-align: center;
    color: #58b965;
    font-size: 1.35rem;
  }

  .sub {
    margin-top: 0.35rem;
    font-size: 1.1rem;
    color: #7f8c9b;
  }

  .tip {
    margin-top: 0.5rem;
    font-style: italic;
  }

  .answer {
    margin-top: 0.65rem;
    font-weight: 700;
    color: #2d5338;
  }

  .actions {
    display: flex;
    justify-content: center;
  }

  .submit {
    min-width: 18rem;
    height: 3.6rem;
    border: 0;
    border-radius: 18px;
    background: #67c971;
    color: white;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .submit:disabled,
  input:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  @media (max-width: 760px) {
    .numbers {
      grid-template-columns: 1fr;
    }

    .num-card strong {
      font-size: 3rem;
    }

    .check-panel {
      font-size: 1.05rem;
    }
  }
</style>
