<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let question: any;
  export let revealedAnswer: Record<string, string | string[]> | null = null;
  export let locked = false;

  const dispatch = createEventDispatcher();

  let assigned: Record<string, string> = {};

  function place(card: string | number, binId: string) {
    if (locked) return;
    assigned = { ...assigned, [String(card)]: binId };
  }

  function remove(card: string | number) {
    if (locked) return;
    const next = { ...assigned };
    delete next[String(card)];
    assigned = next;
  }

  $: pool = question.payload.cards.filter((card: string | number) => !(String(card) in assigned));
  $: isComplete = pool.length === 0;
  $: byBin = (binId: string) =>
    Object.entries(assigned)
      .filter(([, value]) => value === binId)
      .map(([card]) => card);

  function revealLabel(value: string | string[]) {
    if (Array.isArray(value)) {
      return question.payload.bins
        .filter((bin: any) => value.includes(bin.id))
        .map((bin: any) => bin.label)
        .join(' / ');
    }

    return question.payload.bins.find((bin: any) => bin.id === value)?.label ?? '';
  }
</script>

<section class="question-card">
  <p class="lead">{question.prompt}</p>

  <div class="pool">
    <div class="section-title">보기</div>
    <div class="cards">
      {#each pool as card}
        <div class="pool-card">{card}</div>
      {/each}
    </div>
  </div>

  <div class="bins">
    {#each question.payload.bins as bin, index}
      <div class="bin" class:mint={index === 0} class:pink={index === 1} class:plain={index === 2}>
        <div class="bin-title">{bin.label}</div>
        <div class="bin-body">
          {#each byBin(bin.id) as card}
            <button class="placed-card" disabled={locked} on:click={() => remove(card)}>{card}</button>
          {/each}
        </div>
        <div class="bin-actions">
          {#each pool as card}
            <button class="picker" disabled={locked} on:click={() => place(card, bin.id)}>{card}</button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  {#if question.tip}
    <p class="tip">{question.tip}</p>
  {/if}

  {#if revealedAnswer}
    <div class="reveal">
      {#each Object.entries(revealedAnswer) as [card, value]}
        <span>
          {card} → {revealLabel(value)}
        </span>
      {/each}
    </div>
  {/if}

  <div class="actions">
    <button class="submit" disabled={!isComplete || locked} on:click={() => dispatch('submit', assigned)}>
      제출하기
    </button>
  </div>
</section>

<style>
  .question-card {
    display: grid;
    gap: 1.3rem;
  }

  .lead {
    margin: 0;
    text-align: center;
    font-size: 1.45rem;
    font-weight: 700;
    color: #30455f;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 700;
    color: #425a73;
    margin-bottom: 0.6rem;
  }

  .pool {
    display: grid;
    gap: 0.65rem;
  }

  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .pool-card,
  .picker,
  .placed-card {
    min-width: 4.25rem;
    height: 3.4rem;
    border-radius: 12px;
    font-size: 1.5rem;
    font-weight: 700;
    display: grid;
    place-items: center;
  }

  .pool-card {
    border: 3px solid #ff9c31;
    background: white;
    color: #2e4560;
  }

  .bins {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .bin {
    min-height: 18rem;
    border-radius: 18px;
    border: 3px solid #bcc9d6;
    background: #f7fafc;
    padding: 0.9rem;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.8rem;
  }

  .bin.mint {
    background: #dff5ec;
  }

  .bin.pink {
    background: #fbe4ee;
  }

  .bin.plain {
    background: #f5f8fc;
  }

  .bin-title {
    margin: 0 auto;
    min-width: 11rem;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: #4e8de1;
    color: white;
    text-align: center;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .bin-body,
  .bin-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-content: flex-start;
  }

  .placed-card {
    border: 3px solid #63c470;
    background: white;
    color: #31475f;
  }

  .picker {
    border: 2px dashed #a6b7c6;
    background: rgba(255, 255, 255, 0.9);
    color: #566c83;
  }

  .tip {
    margin: 0;
    text-align: center;
    color: #ff8c2b;
    font-size: 1.1rem;
    font-style: italic;
  }

  .reveal {
    padding: 1rem 1.15rem;
    border-radius: 18px;
    background: #eef9ef;
    border: 2px solid #8bd499;
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem 1rem;
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
  .placed-card:disabled,
  .picker:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 860px) {
    .bins {
      grid-template-columns: 1fr;
    }
  }
</style>
