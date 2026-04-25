<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let question: any;
  export let revealedAnswer: number[] | null = null;
  export let locked = false;

  const dispatch = createEventDispatcher();

  const fixed = question.payload.fixed ?? [];
  const fixedIdx = new Set<number>(fixed.map((item: any) => item.index));
  const total = question.payload.slotCount ?? question.payload.correctOrder?.length ?? 0;

  function buildInitialSlots() {
    const slots: (number | null)[] = Array(total).fill(null);
    for (const item of fixed) slots[item.index] = item.value;
    return slots;
  }

  let slots: (number | null)[] = buildInitialSlots();
  let activeSlot: number | null = null;

  function selectSlot(index: number) {
    if (locked || fixedIdx.has(index)) return;
    activeSlot = activeSlot === index ? null : index;
  }

  function placeCard(value: number) {
    if (locked || activeSlot == null) return;
    const next = [...slots];
    next[activeSlot] = value;
    slots = next;
    activeSlot = null;
  }

  function clearSlot(index: number) {
    if (locked || fixedIdx.has(index)) return;
    const next = [...slots];
    next[index] = null;
    slots = next;
  }

  function reset() {
    if (locked) return;
    slots = buildInitialSlots();
    activeSlot = null;
  }

  $: pool = (question.payload.pool as number[]).filter((value: number) => !slots.includes(value));
  $: distractors = (question.payload.distractors as number[]).filter((value: number) => pool.includes(value));
  $: usable = pool.filter((value: number) => !distractors.includes(value));
  $: isComplete = slots.every((value) => value != null);
</script>

<section class="question-card">
  <p class="lead">{question.prompt}</p>

  <div class="solution">
    <div class="section-title">정답 슬롯</div>
    <div class="slots">
      {#each slots as value, index}
        <button
          class="slot"
          class:fixed={fixedIdx.has(index)}
          class:active={activeSlot === index}
          class:filled={value != null && !fixedIdx.has(index)}
          disabled={locked}
          on:click={() => (value != null && !fixedIdx.has(index) ? clearSlot(index) : selectSlot(index))}
        >
          {value ?? '?'}
        </button>
      {/each}
    </div>
  </div>

  <div class="tray-grid">
    <div class="tray">
      <div class="section-title">남은 카드 (드래그 대신 탭)</div>
      <div class="cards">
        {#each usable as value}
          <button class="pick red" disabled={locked || activeSlot == null} on:click={() => placeCard(value)}>
            {value}
          </button>
        {/each}
      </div>
    </div>

    <div class="tray muted">
      <div class="section-title">사용 불필요</div>
      <div class="cards">
        {#each distractors as value}
          <div class="pick gray">{value}</div>
        {/each}
      </div>
    </div>
  </div>

  {#if question.tip}
    <p class="tip">TIP! {question.tip}</p>
  {/if}

  {#if revealedAnswer}
    <div class="reveal">
      {#each revealedAnswer as value}
        <span>{value}</span>
      {/each}
    </div>
  {/if}

  <div class="actions">
    <button class="ghost" disabled={locked} on:click={reset}>초기화</button>
    <button class="submit" disabled={!isComplete || locked} on:click={() => dispatch('submit', slots)}>
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
    margin-bottom: 0.6rem;
    font-size: 1rem;
    font-weight: 700;
    color: #425a73;
  }

  .slots,
  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .slot,
  .pick {
    width: 5.4rem;
    height: 4.5rem;
    border-radius: 14px;
    display: grid;
    place-items: center;
    font-size: 1.9rem;
    font-weight: 700;
  }

  .slot {
    border: 3px dashed #a4b4c1;
    background: white;
    color: #6e8193;
  }

  .slot.fixed {
    border-style: solid;
    border-color: #5fcf74;
    background: #ffd84d;
    color: #2f4560;
  }

  .slot.active {
    border-style: solid;
    border-color: #6b9ce4;
    box-shadow: 0 0 0 4px rgba(107, 156, 228, 0.2);
  }

  .slot.filled {
    border-style: solid;
    border-color: #5fcf74;
    background: #f3fff4;
    color: #2f4560;
  }

  .tray-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 1rem;
  }

  .tray {
    border-radius: 18px;
    background: #f7fafc;
    padding: 1rem;
  }

  .tray.muted {
    background: #f1f5f8;
  }

  .pick {
    border: 3px solid #ff6c6c;
    background: white;
    color: #2f4560;
  }

  .pick.red {
    cursor: pointer;
  }

  .pick.gray {
    border-color: #94a6b0;
    background: #eef2f4;
    color: #8ba0ab;
  }

  .tip {
    margin: 0;
    text-align: center;
    color: #ff8c2b;
    font-style: italic;
  }

  .reveal {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    padding: 1rem;
    border-radius: 18px;
    background: #eef9ef;
    border: 2px solid #8bd499;
  }

  .reveal span {
    width: 4.3rem;
    height: 3.3rem;
    border-radius: 12px;
    background: white;
    border: 2px solid #67c971;
    display: grid;
    place-items: center;
    font-size: 1.4rem;
    font-weight: 700;
    color: #2d5338;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  .ghost,
  .submit {
    min-width: 10rem;
    height: 3.6rem;
    border: 0;
    border-radius: 18px;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .ghost {
    background: #ffd29e;
    color: #7b4a14;
  }

  .submit {
    background: #67c971;
    color: white;
  }

  .ghost:disabled,
  .submit:disabled,
  .slot:disabled,
  .pick:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 760px) {
    .tray-grid {
      grid-template-columns: 1fr;
    }

    .slot,
    .pick {
      width: calc(25% - 0.45rem);
      min-width: 4.3rem;
    }
  }
</style>
