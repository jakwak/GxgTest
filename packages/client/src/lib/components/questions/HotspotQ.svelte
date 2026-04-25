<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let question: any;
  export let revealedAnswer: number[] | null = null;
  export let locked = false;

  const dispatch = createEventDispatcher();

  const { rangeFrom, rangeTo } = question.payload;
  const cells = Array.from({ length: rangeTo - rangeFrom + 1 }, (_, index) => index + rangeFrom);
  const targetCount = (question.payload.correct as number[] | undefined)?.length ?? 0;

  let picked = new Set<number>();

  function toggle(value: number) {
    if (locked) return;
    if (picked.has(value)) picked.delete(value);
    else picked.add(value);
    picked = new Set(picked);
  }

  function reset() {
    if (locked) return;
    picked = new Set<number>();
  }

  $: revealedSet = new Set<number>(revealedAnswer ?? []);
</script>

<section class="question-card">
  <p class="lead">{question.prompt}</p>

  <div class="grid">
    {#each cells as value}
      <button
        class="cell"
        class:picked={picked.has(value)}
        class:correct={revealedAnswer && revealedSet.has(value)}
        class:wrong={revealedAnswer && picked.has(value) && !revealedSet.has(value)}
        disabled={locked}
        on:click={() => toggle(value)}
      >
        {value}
      </button>
    {/each}
  </div>

  <div class="footer-row">
    <div class="progress">찾은 개수: {picked.size} / {targetCount}</div>
    <button class="reset" disabled={locked} on:click={reset}>다시 선택</button>
  </div>

  <div class="bar">
    <div class="fill" style={`width: ${targetCount === 0 ? 0 : Math.min(100, (picked.size / targetCount) * 100)}%`}></div>
  </div>

  <div class="actions">
    <button class="submit" disabled={picked.size === 0 || locked} on:click={() => dispatch('submit', [...picked])}>
      제출하기
    </button>
  </div>
</section>

<style>
  .question-card {
    display: grid;
    gap: 1.2rem;
  }

  .lead {
    margin: 0;
    text-align: center;
    font-size: 1.45rem;
    font-weight: 700;
    color: #30455f;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .cell {
    aspect-ratio: 1 / 0.84;
    border-radius: 0;
    border: 2px solid #b8d8f6;
    background: white;
    color: #2f4560;
    font-size: 1.45rem;
    cursor: pointer;
  }

  .cell.picked {
    background: #6cc976;
    border-color: #6cc976;
    color: white;
  }

  .cell.correct {
    background: #6cc976;
    border-color: #6cc976;
    color: white;
  }

  .cell.wrong {
    background: #ff6f6f;
    border-color: #ff6f6f;
    color: white;
  }

  .footer-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
    color: #4b86d6;
    font-size: 1.35rem;
  }

  .reset {
    min-width: 9rem;
    height: 2.9rem;
    border: 0;
    border-radius: 12px;
    background: #ff9c31;
    color: white;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .bar {
    height: 0.95rem;
    border-radius: 999px;
    background: #dfe8ee;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    border-radius: inherit;
    background: #67c971;
    transition: width 140ms ease;
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
  .reset:disabled,
  .cell:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 760px) {
    .grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .footer-row {
      flex-direction: column;
      align-items: stretch;
      font-size: 1.1rem;
    }
  }
</style>
