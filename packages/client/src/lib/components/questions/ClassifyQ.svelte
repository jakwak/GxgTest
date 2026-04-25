<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { question, revealedAnswer = null, locked = false, onsubmit }: {
    question: any;
    revealedAnswer?: Record<string, string | string[]> | null;
    locked?: boolean;
    onsubmit?: (data: Record<string, string | string[]>) => void;
  } = $props();

  const allowReuse: boolean = question.payload.allowReuse ?? false;

  let assigned: Record<string, string> = $state({});
  let multiAssigned: Record<string, string[]> = $state({});

  let dragging: { card: string } | null = $state(null);
  let dragStartPos = { x: 0, y: 0 };
  let pointerX = $state(0);
  let pointerY = $state(0);
  let hoveredBin: string | null = $state(null);

  function place(card: string | number, binId: string) {
    if (locked) return;
    const key = String(card);
    if (allowReuse) {
      const current = multiAssigned[key] ?? [];
      if (current.includes(binId)) return;
      multiAssigned = { ...multiAssigned, [key]: [...current, binId] };
    } else {
      assigned = { ...assigned, [key]: binId };
    }
  }

  function remove(card: string | number, binId?: string) {
    if (locked) return;
    const key = String(card);
    if (allowReuse && binId) {
      const current = multiAssigned[key] ?? [];
      const filtered = current.filter((id) => id !== binId);
      const next = { ...multiAssigned };
      if (filtered.length === 0) delete next[key];
      else next[key] = filtered;
      multiAssigned = next;
    } else {
      const next = { ...assigned };
      delete next[key];
      assigned = next;
    }
  }

  function onDragStart(e: PointerEvent, card: string | number) {
    if (locked) return;
    e.preventDefault();
    dragging = { card: String(card) };
    pointerX = e.clientX;
    pointerY = e.clientY;
    dragStartPos = { x: e.clientX, y: e.clientY };
  }

  function onDragMove(e: PointerEvent) {
    if (!dragging) return;
    pointerX = e.clientX;
    pointerY = e.clientY;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest('[data-bin-id]') as HTMLElement | null;
    hoveredBin = target?.dataset.binId ?? null;
  }

  function onDragEnd() {
    if (!dragging) return;

    const dx = pointerX - dragStartPos.x;
    const dy = pointerY - dragStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= 8 && hoveredBin) {
      place(dragging.card, hoveredBin);
    }

    dragging = null;
    hoveredBin = null;
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
    allowReuse
      ? question.payload.cards.map((c: string | number) => String(c))
      : question.payload.cards.filter((card: string | number) => !(String(card) in assigned))
  );

  let isComplete = $derived(
    allowReuse
      ? question.payload.cards.every((card: string | number) => (multiAssigned[String(card)]?.length ?? 0) > 0)
      : question.payload.cards.every((card: string | number) => String(card) in assigned)
  );

  let byBin = $derived((binId: string) => {
    if (allowReuse) {
      return Object.entries(multiAssigned)
        .filter(([, bins]) => bins.includes(binId))
        .map(([card]) => card);
    }
    return Object.entries(assigned)
      .filter(([, value]) => value === binId)
      .map(([card]) => card);
  });

  let submitData = $derived(
    allowReuse ? multiAssigned : assigned
  );

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

  {#if allowReuse}
    <p class="reuse-hint">하나의 카드를 여러 상자에 넣을 수 있어요.</p>
  {/if}

  <div class="pool">
    <div class="pool-frame">
      <div class="section-title">보기</div>
      <div class="cards">
        {#each pool as card}
          <button
            class="pool-card"
            class:dragging-source={dragging?.card === String(card)}
            class:has-assignment={allowReuse && (multiAssigned[String(card)]?.length ?? 0) > 0}
            disabled={locked}
            onpointerdown={(e) => onDragStart(e, card)}
          >
            {card}
            {#if allowReuse && (multiAssigned[String(card)]?.length ?? 0) > 0}
              <span class="assign-badge">{multiAssigned[String(card)].length}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="bins">
    {#each question.payload.bins as bin, index}
      <div
        class="bin"
        class:mint={index === 0}
        class:pink={index === 1}
        class:plain={index === 2}
        class:drop-hover={hoveredBin === bin.id}
        data-bin-id={bin.id}
      >
        <div class="bin-title">{bin.label}</div>
        <div class="bin-body">
          {#each byBin(bin.id) as card}
            <button class="placed-card" disabled={locked} onclick={() => remove(card, bin.id)}>{card}</button>
          {/each}
        </div>
        <div class="bin-count">{byBin(bin.id).length}개</div>
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
    <button class="submit" disabled={!isComplete || locked} onclick={() => onsubmit?.(submitData)}>
      제출하기
    </button>
  </div>
</section>

{#if dragging}
  <div class="drag-ghost" style="left:{pointerX}px; top:{pointerY}px">
    {dragging.card}
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

  .reuse-hint {
    margin: 0;
    text-align: center;
    font-size: 1rem;
    color: #4e8de1;
    font-weight: 600;
  }

  .section-title {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    width: fit-content;
    font-size: 1rem;
    font-weight: 700;
    color: #425a73;
    padding: 0.35rem 0.9rem;
    background: white;
    line-height: 1.1;
  }

  .pool {
    display: grid;
    gap: 0.65rem;
  }

  .pool-frame {
    position: relative;
    padding: 1.4rem 1rem 1rem;
    border: 2px solid #b8c8da;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.9);
  }

  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    justify-content: center;
  }

  .pool-card,
  .placed-card {
    min-width: 4.25rem;
    height: 3.4rem;
    border-radius: 12px;
    font-size: 1.5rem;
    font-weight: 700;
    display: grid;
    place-items: center;
    padding: 0 0.75rem;
    position: relative;
  }

  .pool-card {
    border: 3px solid #ff9c31;
    background: white;
    color: #2e4560;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    transition: transform 120ms ease, opacity 120ms ease;
  }

  .pool-card:active:enabled {
    cursor: grabbing;
  }

  .pool-card.dragging-source {
    opacity: 0.4;
    transform: scale(0.9);
  }

  .pool-card.has-assignment {
    border-color: #63c470;
    background: #f0fff2;
  }

  .assign-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 50%;
    background: #4e8de1;
    color: white;
    font-size: 0.75rem;
    display: grid;
    place-items: center;
  }

  .bins {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
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
    transition: border-color 120ms ease, box-shadow 120ms ease;
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

  .bin.drop-hover {
    border-color: #ff9c31;
    box-shadow: 0 0 0 4px rgba(255, 156, 49, 0.2);
  }

  .bin-title {
    margin: 0 auto;
    width: 100%;
    padding: 0.55rem 0.6rem;
    border-radius: 12px;
    background: #4e8de1;
    color: white;
    text-align: center;
    font-size: 0.95rem;
    font-weight: 700;
    box-sizing: border-box;
    word-break: keep-all;
    line-height: 1.15;
  }

  .bin-body {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-content: flex-start;
  }

  .bin-count {
    text-align: center;
    font-size: 0.9rem;
    font-weight: 700;
    color: #8a9db2;
  }

  .placed-card {
    border: 3px solid #63c470;
    background: white;
    color: #31475f;
    cursor: pointer;
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
  .placed-card:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 860px) {
    .bins {
      grid-auto-columns: minmax(0, 1fr);
    }
  }
</style>
