<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { question, revealedAnswer = null, locked = false, onsubmit }: {
    question: any;
    revealedAnswer?: number[] | null;
    locked?: boolean;
    onsubmit?: (data: (number | null)[]) => void;
  } = $props();

  const fixed = question.payload.fixed ?? [];
  const fixedIdx = new Set<number>(fixed.map((item: any) => item.index));
  const total = question.payload.slotCount ?? question.payload.correctOrder?.length ?? 0;

  function buildInitialSlots() {
    const slots: (number | null)[] = Array(total).fill(null);
    for (const item of fixed) slots[item.index] = item.value;
    return slots;
  }

  let slots: (number | null)[] = $state(buildInitialSlots());
  let activeSlot: number | null = $state(null);

  let dragging: { value: number } | null = $state(null);
  let dragStartPos = { x: 0, y: 0 };
  let pointerX = $state(0);
  let pointerY = $state(0);
  let hoveredSlot: number | null = $state(null);

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

  function placeAt(index: number, value: number) {
    if (locked || fixedIdx.has(index)) return;
    const next = [...slots];
    next[index] = value;
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

  function onDragStart(e: PointerEvent, value: number) {
    if (locked) return;
    e.preventDefault();
    dragging = { value };
    pointerX = e.clientX;
    pointerY = e.clientY;
    dragStartPos = { x: e.clientX, y: e.clientY };
    hoveredSlot = null;
  }

  function onDragMove(e: PointerEvent) {
    if (!dragging) return;
    pointerX = e.clientX;
    pointerY = e.clientY;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest('[data-slot-index]') as HTMLElement | null;
    const idx = target?.dataset.slotIndex ? Number(target.dataset.slotIndex) : null;
    hoveredSlot = Number.isFinite(idx as any) ? (idx as number) : null;
  }

  function onDragEnd() {
    if (!dragging) return;

    const dx = pointerX - dragStartPos.x;
    const dy = pointerY - dragStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      placeCard(dragging.value);
    } else if (hoveredSlot != null) {
      placeAt(hoveredSlot, dragging.value);
    }

    dragging = null;
    hoveredSlot = null;
  }

  onMount(() => {
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  });

  onDestroy(() => {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  });

  let pool = $derived(
    (question.payload.pool as number[])
      .filter((value: number) => !slots.includes(value))
      .toSorted((a: number, b: number) => a - b)
  );
  let isComplete = $derived(slots.every((value) => value != null));
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
          class:drop-hover={dragging && hoveredSlot === index && !fixedIdx.has(index)}
          data-slot-index={index}
          disabled={locked}
          onclick={() => (value != null && !fixedIdx.has(index) ? clearSlot(index) : selectSlot(index))}
        >
          {value ?? '?'}
        </button>
      {/each}
    </div>
  </div>

  <div class="tray">
    <div class="section-title">남은 카드</div>
    <div class="cards">
      {#each pool as value}
        <button
          class="pick red"
          disabled={locked || (activeSlot == null && !dragging)}
          onpointerdown={(e) => onDragStart(e, value)}
          onclick={() => placeCard(value)}
        >
          {value}
        </button>
      {/each}
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
    <button class="ghost" disabled={locked} onclick={reset}>초기화</button>
    <button class="submit" disabled={!isComplete || locked} onclick={() => onsubmit?.(slots)}>
      제출하기
    </button>
  </div>
</section>

{#if dragging}
  <div class="drag-ghost" style="left:{pointerX}px; top:{pointerY}px">
    {dragging.value}
  </div>
{/if}

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

  .slot.drop-hover {
    border-style: solid;
    border-color: #ff9c31;
    box-shadow: 0 0 0 4px rgba(255, 156, 49, 0.2);
  }

  .tray {
    border-radius: 18px;
    background: #f7fafc;
    padding: 1rem;
  }

  .pick {
    border: 3px solid #ff6c6c;
    background: white;
    color: #2f4560;
  }

  .pick.red {
    cursor: pointer;
    touch-action: none;
  }

  .drag-ghost {
    position: fixed;
    transform: translate(-50%, -50%);
    padding: 0.5rem 1rem;
    background: #fff;
    border: 3px solid #ff9c31;
    border-radius: 12px;
    font-size: 1.5rem;
    font-weight: 700;
    color: #2e4560;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
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
    .slot,
    .pick {
      width: calc(25% - 0.45rem);
      min-width: 4.3rem;
    }
  }
</style>
