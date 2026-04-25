<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { question, revealedAnswer = null, locked = false, onsubmit }: {
    question: any;
    revealedAnswer?: Record<string, string> | null;
    locked?: boolean;
    onsubmit?: (data: Record<string, string>) => void;
  } = $props();

  let pairs: Record<string, string> = $state({});
  let selectedLeft: string | null = $state(null);

  let dragging: { id: string; label: string } | null = $state(null);
  let dragStartPos = { x: 0, y: 0 };
  let pointerX = $state(0);
  let pointerY = $state(0);
  let hoveredRight: string | null = $state(null);
  let boardEl: HTMLElement;

  const leftItems = question.payload.left ?? [];
  const rightItems = question.payload.right ?? [];
  const allowReuse = question.payload.allowReuse ?? false;

  let leftDotRefs: Record<string, HTMLElement> = {};
  let rightDotRefs: Record<string, HTMLElement> = {};

  function leftDotRef(node: HTMLElement, id: string) {
    leftDotRefs[id] = node;
    return { destroy() { delete leftDotRefs[id]; } };
  }

  function rightDotRef(node: HTMLElement, id: string) {
    rightDotRefs[id] = node;
    return { destroy() { delete rightDotRefs[id]; } };
  }

  const PAIR_COLORS = ['#d4a8e8', '#8cb4ff', '#ff8c8c', '#a8d48c', '#ffc08c', '#8cdad4'];
  function colorOf(leftId: string) {
    const i = leftItems.findIndex((it: any) => it.id === leftId);
    return PAIR_COLORS[i % PAIR_COLORS.length];
  }

  type Line = { x1: number; y1: number; x2: number; y2: number; color: string };
  let connLines: Line[] = $state([]);
  let correctLines: Line[] = $state([]);
  let activeDragLine: Line | null = $state(null);

  function recomputeLines() {
    if (!boardEl) { connLines = []; return; }
    const br = boardEl.getBoundingClientRect();
    const result: Line[] = [];
    for (const [lid, rid] of Object.entries(pairs)) {
      const ld = leftDotRefs[lid];
      const rd = rightDotRefs[rid];
      if (!ld || !rd) continue;
      const lr = ld.getBoundingClientRect();
      const rr = rd.getBoundingClientRect();
      result.push({
        x1: lr.left + lr.width / 2 - br.left,
        y1: lr.top + lr.height / 2 - br.top,
        x2: rr.left + rr.width / 2 - br.left,
        y2: rr.top + rr.height / 2 - br.top,
        color: colorOf(lid),
      });
    }
    connLines = result;
  }

  function recomputeCorrectLines() {
    if (!boardEl || !revealedAnswer) { correctLines = []; return; }
    const br = boardEl.getBoundingClientRect();
    const result: Line[] = [];
    for (const [lid, rid] of Object.entries(revealedAnswer)) {
      if (pairs[lid] === rid) continue;
      const ld = leftDotRefs[lid];
      const rd = rightDotRefs[rid];
      if (!ld || !rd) continue;
      const lr = ld.getBoundingClientRect();
      const rr = rd.getBoundingClientRect();
      result.push({
        x1: lr.left + lr.width / 2 - br.left,
        y1: lr.top + lr.height / 2 - br.top,
        x2: rr.left + rr.width / 2 - br.left,
        y2: rr.top + rr.height / 2 - br.top,
        color: colorOf(lid),
      });
    }
    correctLines = result;
  }

  function recomputeDragLine() {
    if (!dragging || !boardEl) { activeDragLine = null; return; }
    const br = boardEl.getBoundingClientRect();
    const ld = leftDotRefs[dragging.id];
    if (!ld) { activeDragLine = null; return; }
    const lr = ld.getBoundingClientRect();
    activeDragLine = {
      x1: lr.left + lr.width / 2 - br.left,
      y1: lr.top + lr.height / 2 - br.top,
      x2: pointerX - br.left,
      y2: pointerY - br.top,
      color: colorOf(dragging.id),
    };
  }

  $effect(() => {
    pairs;
    selectedLeft;
    recomputeLines();
    recomputeCorrectLines();
  });

  function onDragStart(e: PointerEvent, item: any) {
    if (locked) return;
    e.preventDefault();
    dragging = { id: item.id, label: item.label };
    pointerX = e.clientX;
    pointerY = e.clientY;
    dragStartPos = { x: e.clientX, y: e.clientY };
    recomputeDragLine();
  }

  function onDragMove(e: PointerEvent) {
    if (!dragging) return;
    pointerX = e.clientX;
    pointerY = e.clientY;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest('[data-right-id]') as HTMLElement | null;
    hoveredRight = target?.dataset.rightId ?? null;

    recomputeDragLine();
  }

  function onDragEnd() {
    if (!dragging) return;

    const dx = pointerX - dragStartPos.x;
    const dy = pointerY - dragStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      selectedLeft = selectedLeft === dragging.id ? null : dragging.id;
    } else if (hoveredRight) {
      applyPair(dragging.id, hoveredRight);
      selectedLeft = null;
    }

    dragging = null;
    hoveredRight = null;
    activeDragLine = null;
  }

  function onRightTap(id: string) {
    if (locked || !selectedLeft) return;
    applyPair(selectedLeft, id);
    selectedLeft = null;
  }

  function applyPair(leftId: string, rightId: string) {
    const next = { ...pairs };
    if (!allowReuse) {
      for (const [k, v] of Object.entries(next)) {
        if (v === rightId) delete next[k];
      }
    }
    next[leftId] = rightId;
    pairs = next;
  }

  function removePair(leftId: string) {
    if (locked) return;
    const next = { ...pairs };
    delete next[leftId];
    pairs = next;
  }

  function reset() {
    if (locked) return;
    pairs = {};
    selectedLeft = null;
  }

  let resizeObserver: ResizeObserver;

  onMount(() => {
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    resizeObserver = new ResizeObserver(() => {
      recomputeLines();
      recomputeCorrectLines();
    });
    if (boardEl) resizeObserver.observe(boardEl);
  });

  onDestroy(() => {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    resizeObserver?.disconnect();
  });

  let pairCount = $derived(Object.keys(pairs).length);
  let isComplete = $derived(pairCount === leftItems.length);
  let summaries = $derived(leftItems
    .filter((it: any) => pairs[it.id])
    .map((it: any) => ({
      leftId: it.id,
      left: it.label,
      right: rightItems.find((c: any) => c.id === pairs[it.id])?.label ?? '',
    })));

  function revealedLabel(leftId: string) {
    return rightItems.find((c: any) => c.id === revealedAnswer?.[leftId])?.label ?? '';
  }
</script>

<section class="question-card">
  <p class="lead">{question.prompt}</p>

  <div class="board" bind:this={boardEl}>
    <svg class="lines-svg" aria-hidden="true">
      {#each correctLines as line}
        <line
          x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
          stroke={line.color} stroke-width="3" stroke-linecap="round"
          stroke-dasharray="10 6" opacity="0.55"
        />
      {/each}
      {#each connLines as line}
        <line
          x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
          stroke={line.color} stroke-width="3" stroke-linecap="round"
        />
      {/each}
      {#if activeDragLine}
        <line
          x1={activeDragLine.x1} y1={activeDragLine.y1}
          x2={activeDragLine.x2} y2={activeDragLine.y2}
          stroke={activeDragLine.color} stroke-width="3"
          stroke-dasharray="8 4" stroke-linecap="round" opacity="0.7"
        />
      {/if}
    </svg>

    <div class="col-left">
      {#each leftItems as item}
        <div class="row-left">
          <button
            class="item left"
            class:selected={selectedLeft === item.id}
            class:dragging-source={dragging?.id === item.id}
            class:filled={!!pairs[item.id]}
            style={pairs[item.id] ? `--pair-color: ${colorOf(item.id)}` : ''}
            disabled={locked}
            onpointerdown={(e) => onDragStart(e, item)}
          >
            <span>{item.label}</span>
          </button>
          <span
            class="dot left-dot"
            class:dot-active={selectedLeft === item.id || dragging?.id === item.id}
            class:dot-filled={!!pairs[item.id]}
            style={pairs[item.id] ? `--dot-color: ${colorOf(item.id)}` : ''}
            use:leftDotRef={item.id}
          ></span>
        </div>
      {/each}
    </div>

    <div class="col-middle"></div>

    <div class="col-right">
      {#each rightItems as item}
        <div class="row-right" data-right-id={item.id}>
          <span
            class="dot right-dot"
            class:dot-used={!allowReuse && Object.values(pairs).includes(item.id)}
            class:dot-hover={hoveredRight === item.id}
            use:rightDotRef={item.id}
          ></span>
          <button
            class="item right"
            class:drop-hover={hoveredRight === item.id}
            class:used={!allowReuse && Object.values(pairs).includes(item.id)}
            data-right-id={item.id}
            disabled={locked}
            onclick={() => onRightTap(item.id)}
          >
            <span>{item.label}</span>
          </button>
        </div>
      {/each}
    </div>
  </div>

  <div class="summary-panel">
    <div class="section-title">현재 연결</div>
    {#if summaries.length === 0}
      <p class="empty">왼쪽 항목을 드래그해서 오른쪽 답에 놓으세요.</p>
    {:else}
      <div class="summary-list">
        {#each summaries as s}
          <button class="summary-pill" disabled={locked} onclick={() => removePair(s.leftId)}>
            {s.left} → {s.right} ✕
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if question.tip}
    <p class="tip">TIP! {question.tip}</p>
  {/if}

  {#if revealedAnswer}
    <div class="reveal">
      {#each leftItems as item}
        <div class="answer-row">
          <span>{item.label}</span>
          <strong>{revealedLabel(item.id)}</strong>
        </div>
      {/each}
    </div>
  {/if}

  <div class="actions">
    <button class="ghost" disabled={locked} onclick={reset}>초기화</button>
    <button class="submit" disabled={!isComplete || locked} onclick={() => onsubmit?.(pairs)}>
      제출하기
    </button>
  </div>
</section>

{#if dragging}
  <div class="drag-ghost" style="left:{pointerX}px; top:{pointerY}px">
    {dragging.label}
  </div>
{/if}

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

  .board {
    position: relative;
    display: grid;
    grid-template-columns: 1fr minmax(80px, 0.6fr) 1fr;
    gap: 0;
    align-items: start;
  }

  .lines-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
    overflow: visible;
  }

  .col-left,
  .col-right {
    display: grid;
    gap: 0.75rem;
  }

  .col-middle {
    min-height: 100%;
  }

  .row-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .row-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dot {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ff8c8c;
    z-index: 3;
    transition: transform 120ms ease, box-shadow 120ms ease;
  }

  .dot.dot-active {
    transform: scale(1.3);
    box-shadow: 0 0 0 4px rgba(255, 140, 140, 0.25);
  }

  .dot.dot-filled {
    background: var(--dot-color, #70c580);
  }

  .dot.dot-used {
    background: #9d71cb;
  }

  .dot.dot-hover {
    transform: scale(1.3);
    box-shadow: 0 0 0 4px rgba(255, 140, 140, 0.25);
    background: #ff8c8c;
  }

  .item {
    position: relative;
    flex: 1;
    min-height: 4.75rem;
    border-radius: 18px;
    border: 3px solid #b4d8f5;
    background: #fff;
    color: #2f4560;
    font-size: 1.15rem;
    font-weight: 700;
    transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    user-select: none;
    -webkit-user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item.left {
    cursor: grab;
    touch-action: none;
  }

  .item.left:active:enabled {
    cursor: grabbing;
  }

  .item.left.selected {
    border-color: #ff8c8c;
    box-shadow: 0 0 0 4px rgba(255, 140, 140, 0.16);
  }

  .item.left.dragging-source {
    opacity: 0.5;
    transform: scale(0.95);
  }

  .item.left.filled {
    border-color: var(--pair-color, #70c580);
    background: #f4fff6;
  }

  .item.right {
    background: linear-gradient(180deg, #ffe46a 0%, #ffd84d 100%);
    cursor: pointer;
  }

  .item.right.drop-hover {
    transform: scale(1.06);
    border-color: #ff8c8c;
    box-shadow: 0 0 0 4px rgba(255, 140, 140, 0.25);
  }

  .item.right.used {
    border-color: #9d71cb;
    box-shadow: inset 0 0 0 2px rgba(157, 113, 203, 0.22);
  }

  .drag-ghost {
    position: fixed;
    transform: translate(-50%, -50%);
    padding: 0.6rem 1.2rem;
    background: #fff;
    border: 3px solid #ff8c8c;
    border-radius: 14px;
    font-size: 1.1rem;
    font-weight: 700;
    color: #2f4560;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
  }

  .tip,
  .reveal {
    border-radius: 18px;
    padding: 1rem 1.15rem;
  }

  .tip {
    background: #fff3d8;
    color: #d7770a;
    text-align: center;
    font-style: italic;
  }

  .reveal {
    background: #e7f7e9;
    border: 2px solid #8cd39a;
    display: grid;
    gap: 0.5rem;
  }

  .answer-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    color: #29503a;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  .summary-panel {
    border: 2px solid #f7c07f;
    border-radius: 18px;
    background: #fff8ef;
    padding: 1rem 1.15rem;
  }

  .summary-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .summary-pill {
    padding: 0.7rem 1rem;
    border-radius: 999px;
    background: white;
    border: 2px solid #ffbf82;
    font-weight: 700;
    color: #5f4b34;
    cursor: pointer;
    transition: background 120ms ease;
  }

  .summary-pill:hover:enabled {
    background: #fff0e0;
  }

  .summary-pill:disabled {
    cursor: not-allowed;
  }

  .section-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #5e7ea3;
    margin-bottom: 0.4rem;
  }

  .empty {
    margin: 0;
    color: #71849a;
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
  .item:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 760px) {
    .board {
      grid-template-columns: 1fr 40px 1fr;
    }
  }
</style>
