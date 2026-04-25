<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let question: any;
  export let revealedAnswer: string | null = null;
  export let locked = false;

  const dispatch = createEventDispatcher();
  let picked: string | null = null;
</script>

<section class="question-card">
  <div class="story-box">
    <div class="story-label">상황</div>
    <p>{question.payload.situation}</p>
  </div>

  <p class="prompt">Q. {question.payload.question}</p>

  <div class="options">
    {#each question.payload.options as option, index}
      <button
        class="option"
        class:picked={picked === option.id}
        class:correct={revealedAnswer === option.id}
        class:dimmed={revealedAnswer && revealedAnswer !== option.id}
        disabled={locked}
        on:click={() => (picked = option.id)}
      >
        <span class="badge">{index + 1}</span>
        <span>{option.label}</span>
      </button>
    {/each}
  </div>

  <div class="story-progress">
    <span>스토리 진행</span>
    <div class="dots">
      <i></i>
      <i></i>
      <i class="active"></i>
    </div>
  </div>

  {#if question.tip}
    <p class="tip">TIP! {question.tip}</p>
  {/if}

  <div class="actions">
    <button class="submit" disabled={!picked || locked} on:click={() => dispatch('submit', picked)}>
      {revealedAnswer ? '다음 공개를 기다리는 중' : '제출하기'}
    </button>
  </div>
</section>

<style>
  .question-card {
    display: grid;
    gap: 1.3rem;
  }

  .story-box {
    border: 3px solid #ff9c31;
    border-radius: 18px;
    background: #fff7df;
    padding: 1rem 1.25rem;
  }

  .story-label {
    margin-bottom: 0.5rem;
    color: #ff8c2b;
    font-size: 1.4rem;
    font-weight: 800;
  }

  .story-box p,
  .prompt {
    margin: 0;
    color: #30455f;
    line-height: 1.6;
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.25rem;
  }

  .option {
    height: 6rem;
    border-radius: 16px;
    border: 3px solid #b7d6f4;
    background: white;
    color: #2e4560;
    font-size: 1.55rem;
    font-weight: 700;
    cursor: pointer;
    display: grid;
    place-items: center;
    gap: 0.45rem;
  }

  .option.picked {
    background: #6cc976;
    border-color: #6cc976;
    color: white;
  }

  .option.correct {
    background: #6cc976;
    border-color: #6cc976;
    color: white;
    opacity: 1;
  }

  .option.dimmed {
    opacity: 0.58;
  }

  .badge {
    display: none;
  }

  .story-progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #8093aa;
    font-size: 1rem;
  }

  .dots {
    display: flex;
    gap: 0.55rem;
  }

  .dots i {
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 999px;
    background: #e8edf3;
  }

  .dots i.active {
    background: #6fa3e8;
  }

  .tip {
    margin: 0;
    color: #d7770a;
    text-align: center;
    font-style: italic;
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
  .option:disabled {
    cursor: not-allowed;
  }

  @media (max-width: 760px) {
    .options {
      grid-template-columns: 1fr 1fr;
    }

    .story-box p,
    .prompt {
      font-size: 1.2rem;
    }

    .option {
      height: 5rem;
      font-size: 1.25rem;
    }
  }
</style>
