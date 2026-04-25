<script lang="ts">
  import { onMount } from 'svelte';
  import { auxJson } from '$lib/colyseus';
  import { buildQuestion, draftFromQuestion, templateDraft, type AuthorDraft } from '$lib/authoring';
  import type { Question, QuestionType } from '@gxg/shared';
  import MatchingQ from '$lib/components/questions/MatchingQ.svelte';
  import MultipleChoiceQ from '$lib/components/questions/MultipleChoiceQ.svelte';
  import ClassifyQ from '$lib/components/questions/ClassifyQ.svelte';
  import OrderingQ from '$lib/components/questions/OrderingQ.svelte';
  import HotspotQ from '$lib/components/questions/HotspotQ.svelte';
  import SliderQ from '$lib/components/questions/SliderQ.svelte';

  type QuestionRow = {
    id: string;
    type: QuestionType;
    title: string;
    prompt: string;
    tip?: string;
    score: number;
    time_limit: number;
    payload: Question['payload'];
    created_at?: string;
  };

  type QuizSetRow = {
    id: string;
    name: string;
    question_ids: string[];
    created_at?: string;
  };

  type SessionRow = {
    id: string;
    room_code: string;
    status: string;
    set_id: string;
    created_at?: string;
  };

  const questionTypes: { value: QuestionType; label: string }[] = [
    { value: 'matching', label: '짝 맞추기' },
    { value: 'multiple_choice', label: '이야기 객관식' },
    { value: 'classify', label: '분류하기' },
    { value: 'ordering', label: '순서 배열' },
    { value: 'hotspot', label: '핫스팟' },
    { value: 'slider', label: '슬라이더' }
  ];

  let loading = $state(true);
  let saveError = $state('');
  let saveMessage = $state('');
  let setMessage = $state('');
  let sessionMessage = $state('');

  let questions: QuestionRow[] = $state([]);
  let quizSets: QuizSetRow[] = $state([]);
  let sessions: SessionRow[] = $state([]);
  let selectedQuestionIds = $state<string[]>([]);
  let draggingQuestionId = $state('');

  let draft: AuthorDraft = $state(templateDraft('matching'));
  let editingQuestionId = $state('');
  let setName = $state('새 종합 세트');
  let editingSetId = $state('');
  let targetSetId = $state('');
  let roomCode = $state('');
  let formPanelEl = $state<HTMLElement | null>(null);
  let setBuilderEl = $state<HTMLElement | null>(null);

  let preview: ReturnType<typeof buildQuestion> | null = $state(null);
  let previewError = $state('');
  let previewShowAnswer = $state(false);
  let previewSubmitted = $state<any>(null);

  const previewComponents: Record<string, any> = {
    matching: MatchingQ,
    multiple_choice: MultipleChoiceQ,
    classify: ClassifyQ,
    ordering: OrderingQ,
    hotspot: HotspotQ,
    slider: SliderQ
  };

  function previewRevealedFor(question: any) {
    if (!previewShowAnswer || !question) return null;
    switch (question.type) {
      case 'matching':
        return question.payload.correct ?? null;
      case 'multiple_choice':
        return question.payload.correctId ?? null;
      case 'classify':
        return question.payload.correct ?? null;
      case 'ordering':
        return question.payload.correctOrder ?? null;
      case 'hotspot':
        return question.payload.correct ?? null;
      case 'slider':
        return question.payload.correct ?? null;
    }
    return null;
  }

  function capturePreviewSubmit(response: any) {
    previewSubmitted = response;
  }

  async function loadBootstrap() {
    loading = true;
    const data = await auxJson<{ questions: QuestionRow[]; quizSets: QuizSetRow[]; sessions: SessionRow[] }>('/author/bootstrap');
    questions = data.questions ?? [];
    quizSets = data.quizSets ?? [];
    sessions = data.sessions ?? [];
    targetSetId = targetSetId || quizSets[0]?.id || '';
    loading = false;
  }

  onMount(loadBootstrap);

  function switchType(type: QuestionType) {
    draft = templateDraft(type);
    editingQuestionId = '';
    saveError = '';
    saveMessage = '';
  }

  function rowToQuestion(row: QuestionRow): Question {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      prompt: row.prompt,
      tip: row.tip ?? '',
      score: row.score,
      timeLimit: row.time_limit,
      payload: row.payload as Question['payload']
    } as Question;
  }

  function resetDraft(type: QuestionType = draft.type) {
    draft = templateDraft(type);
    editingQuestionId = '';
    saveError = '';
    saveMessage = '';
  }

  function normalizeOrderingFixed(text: string, slotCount: number) {
    const map = new Map<number, number>();
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const [indexRaw, valueRaw] = line.split('=');
      const index = Number(indexRaw?.trim());
      const value = Number(valueRaw?.trim());
      if (!Number.isFinite(index) || !Number.isFinite(value)) continue;
      if (index < 1 || index > slotCount) continue;
      map.set(index, value);
    }
    const entries = Array.from(map.entries()).sort((a, b) => a[0] - b[0]).slice(0, slotCount);
    return entries.map(([i, v]) => `${i}=${v}`).join('\n');
  }

  function toggleQuestion(id: string) {
    if (selectedQuestionIds.includes(id)) selectedQuestionIds = selectedQuestionIds.filter((itemId) => itemId !== id);
    else selectedQuestionIds = [...selectedQuestionIds, id];
  }

  function isSelected(id: string) {
    return selectedQuestionIds.includes(id);
  }

  function selectedItemAt(index: number) {
    const id = selectedQuestionIds[index];
    return questions.find((item) => item.id === id) ?? null;
  }

  function moveSelectedQuestion(fromId: string, toId: string) {
    if (!fromId || fromId === toId) return;

    const fromIndex = selectedQuestionIds.indexOf(fromId);
    const toIndex = selectedQuestionIds.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...selectedQuestionIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    selectedQuestionIds = next;
  }

  function startQuestionDrag(event: DragEvent, id: string) {
    draggingQuestionId = id;
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function endQuestionDrag() {
    draggingQuestionId = '';
  }

  function handleQuestionDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function handleQuestionDragEnter(id: string) {
    moveSelectedQuestion(draggingQuestionId, id);
  }

  function handleQuestionDrop(event: DragEvent, id: string) {
    event.preventDefault();
    moveSelectedQuestion(draggingQuestionId, id);
    endQuestionDrag();
  }

  async function saveQuestion() {
    saveError = '';
    saveMessage = '';
    try {
      const saved = await auxJson<QuestionRow>(editingQuestionId ? `/author/questions/${editingQuestionId}` : '/author/questions', {
        method: editingQuestionId ? 'PATCH' : 'POST',
        body: JSON.stringify({ question: preview })
      });

      if (editingQuestionId) {
        questions = questions.map((item) => (item.id === saved.id ? saved : item));
        saveMessage = '문제가 수정되었어요.';
      } else {
        questions = [saved, ...questions];
        selectedQuestionIds = [saved.id, ...selectedQuestionIds];
        saveMessage = '문제가 저장되었어요.';
      }

      editingQuestionId = '';
    } catch (error) {
      saveError = error instanceof Error ? error.message : '문제 저장에 실패했습니다.';
    }
  }

  function editQuestion(item: QuestionRow) {
    draft = draftFromQuestion(rowToQuestion(item));
    editingQuestionId = item.id;
    saveError = '';
    saveMessage = '';
    formPanelEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteQuestion(id: string) {
    saveError = '';
    saveMessage = '';
    setMessage = '';

    if (!confirm('이 문제를 삭제할까요? 퀴즈 세트에서도 함께 제거됩니다.')) return;

    try {
      await auxJson(`/author/questions/${id}`, { method: 'DELETE' });
      questions = questions.filter((item) => item.id !== id);
      selectedQuestionIds = selectedQuestionIds.filter((itemId) => itemId !== id);
      quizSets = quizSets.map((set) => ({
        ...set,
        question_ids: set.question_ids.filter((questionId) => questionId !== id)
      }));
      if (editingQuestionId === id) resetDraft();
      setMessage = '문제가 삭제되었어요.';
    } catch (error) {
      saveError = error instanceof Error ? error.message : '문제 삭제에 실패했습니다.';
    }
  }

  async function createSet() {
    setMessage = '';
    const ids = [...selectedQuestionIds];
    if (ids.length === 0) {
      setMessage = '세트에 넣을 문제를 먼저 선택하세요.';
      return;
    }

    try {
      const name = uniqueSetName(setName);
      const created = await auxJson<QuizSetRow>('/author/quiz-sets', {
        method: 'POST',
        body: JSON.stringify({ name, questionIds: ids })
      });
      quizSets = [created, ...quizSets];
      targetSetId = created.id;
      setName = created.name;
      setMessage = `세트가 저장되었어요. (${created.name})`;
    } catch (error) {
      setMessage = error instanceof Error ? error.message : '세트 저장에 실패했습니다.';
    }
  }

  function uniqueSetName(input: string, excludeId = '') {
    const existing = new Set(quizSets.filter((s) => s.id !== excludeId).map((s) => s.name));
    const raw = input.trim() || '새 세트';
    if (!existing.has(raw)) return raw;

    const match = raw.match(/^(.*)_(\d+)$/);
    const stem = match ? match[1] : raw;
    let i = match ? Number(match[2]) + 1 : 1;
    while (existing.has(`${stem}_${i}`)) i += 1;
    return `${stem}_${i}`;
  }

  function editSet(set: QuizSetRow) {
    editingSetId = set.id;
    targetSetId = set.id;
    setName = set.name;
    selectedQuestionIds = set.question_ids.filter((id) => questions.some((q) => q.id === id));
    setMessage = `세트 수정 중: ${set.name}`;
    setBuilderEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelSetEdit() {
    editingSetId = '';
    setName = '새 종합 세트';
    selectedQuestionIds = [];
    setMessage = '';
  }

  async function updateSet() {
    setMessage = '';
    const ids = [...selectedQuestionIds];
    if (!editingSetId) return;
    if (ids.length === 0) {
      setMessage = '세트에 넣을 문제를 먼저 선택하세요.';
      return;
    }

    try {
      const name = uniqueSetName(setName, editingSetId);
      const updated = await auxJson<QuizSetRow>(`/author/quiz-sets/${editingSetId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, questionIds: ids })
      });
      quizSets = quizSets.map((s) => (s.id === updated.id ? updated : s));
      targetSetId = updated.id;
      setName = updated.name;
      setMessage = `세트가 업데이트되었어요. (${updated.name})`;
    } catch (error) {
      setMessage = error instanceof Error ? error.message : '세트 수정에 실패했습니다.';
    }
  }

  async function deleteSet(id: string) {
    try {
      await auxJson(`/author/quiz-sets/${id}`, { method: 'DELETE' });
      quizSets = quizSets.filter((s) => s.id !== id);
      sessions = sessions.filter((s) => s.set_id !== id);
      if (targetSetId === id) targetSetId = '';
      if (editingSetId === id) cancelSetEdit();
    } catch (error) {
      setMessage = error instanceof Error ? error.message : '세트 삭제에 실패했습니다.';
    }
  }

  async function createSession() {
    sessionMessage = '';
    if (!targetSetId) {
      sessionMessage = '세션으로 만들 퀴즈 세트를 선택하세요.';
      return;
    }

    try {
      const created = await auxJson<SessionRow>('/author/sessions', {
        method: 'POST',
        body: JSON.stringify({ setId: targetSetId, roomCode })
      });
      sessions = [created, ...sessions];
      roomCode = created.room_code;
      sessionMessage = `세션이 생성되었어요. 입장 코드: ${created.room_code}`;
    } catch (error) {
      sessionMessage = error instanceof Error ? error.message : '세션 생성에 실패했습니다.';
    }
  }

  async function deleteSession(id: string) {
    try {
      const deleted = sessions.find((s) => s.id === id);
      await auxJson(`/author/sessions/${id}`, { method: 'DELETE' });
      sessions = sessions.filter((s) => s.id !== id);
      if (deleted && deleted.room_code === roomCode) {
        roomCode = '';
        sessionMessage = '';
      }
    } catch (error) {
      sessionMessage = error instanceof Error ? error.message : '세션 삭제에 실패했습니다.';
    }
  }

  $effect(() => {
    try {
      preview = buildQuestion(draft);
      previewError = '';
    } catch (error) {
      preview = null;
      previewError = error instanceof Error ? error.message : '미리보기를 만들 수 없습니다.';
    }
  });

  $effect(() => {
    preview;
    previewSubmitted = null;
  });

  let selectedCount = $derived(selectedQuestionIds.length);

  function setNameById(setId: string) {
    return quizSets.find((s) => s.id === setId)?.name ?? '—';
  }

  const statusLabel: Record<string, string> = {
    waiting: '대기',
    playing: '진행 중',
    reveal: '정답 공개',
    ended: '종료'
  };
</script>

<svelte:head>
  <title>교사용 작성실 | GxgTest</title>
</svelte:head>

<main class="page">
  <header class="hero">
    <div>
      <h1>교사용 문제 작성실</h1>
      <p>문제 작성, 세트 구성, 세션 발급을 한 화면에서 이어서 진행할 수 있어요.</p>
    </div>
    <div class="hero-actions">
      <a href="/">홈으로</a>
      <a href={roomCode ? `/teacher/monitor/${roomCode}` : '/teacher/monitor/DEMO01'}>모니터 화면</a>
    </div>
  </header>

  {#if loading}
    <section class="panel loading">데이터를 불러오는 중입니다...</section>
  {:else}
    <div class="layout">
      <section class="panel form-panel" bind:this={formPanelEl}>
        <div class="section-head stacked">
          <h2>1. 문제 작성</h2>
          <label>
            <span>문제 유형</span>
            <select bind:value={draft.type} onchange={() => switchType(draft.type)}>
              {#each questionTypes as item}
                <option value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>
        </div>

        <div class="grid two">
          <label>
            <span>문제 제목</span>
            <input bind:value={draft.title} />
          </label>
          <label>
            <span>배점 / 제한 시간(초)</span>
            <div class="split">
              <input type="number" bind:value={draft.score} min="10" step="10" />
              <input type="number" bind:value={draft.timeLimit} min="30" step="10" />
            </div>
          </label>
        </div>

        <label>
          <span>안내 문구</span>
          <textarea rows="2" bind:value={draft.prompt}></textarea>
        </label>

        <label>
          <span>힌트</span>
          <textarea rows="2" bind:value={draft.tip}></textarea>
        </label>

        {#if draft.type === 'matching'}
          <div class="grid two">
            <label>
              <span>왼쪽 항목 (줄바꿈)</span>
              <textarea rows="6" bind:value={draft.matchingLeft}></textarea>
            </label>
            <label>
              <span>오른쪽 항목 (줄바꿈)</span>
              <textarea rows="6" bind:value={draft.matchingRight}></textarea>
            </label>
          </div>
          <label>
            <span class="label-row">정답 연결 (왼쪽번호=오른쪽번호)
              <label class="reuse-toggle">
                <input type="checkbox" bind:checked={draft.matchingAllowReuse} />
                <span>중복 연결</span>
              </label>
            </span>
            <textarea rows="4" bind:value={draft.matchingCorrect}></textarea>
          </label>
        {/if}

        {#if draft.type === 'multiple_choice'}
          <label>
            <span>상황 설명</span>
            <textarea rows="4" bind:value={draft.mcSituation}></textarea>
          </label>
          <label>
            <span>질문</span>
            <textarea rows="2" bind:value={draft.mcQuestion}></textarea>
          </label>
          <div class="grid two">
            <label>
              <span>선택지 (줄바꿈)</span>
              <textarea rows="5" bind:value={draft.mcOptions}></textarea>
            </label>
            <label>
              <span>정답 번호</span>
              <input type="number" bind:value={draft.mcCorrectIndex} min="1" />
            </label>
          </div>
        {/if}

        {#if draft.type === 'classify'}
          <label>
            <span class="label-row">카드 목록 (쉼표 구분)
              <label class="reuse-toggle">
                <input type="checkbox" bind:checked={draft.classifyAllowReuse} />
                <span>반복 사용</span>
              </label>
            </span>
            <textarea rows="2" bind:value={draft.classifyCards}></textarea>
          </label>
          <label>
            <span>상자 이름 (별칭=이름, 쉼표 구분)</span>
            <input bind:value={draft.classifyBins} />
          </label>
          <label>
            <span>정답 배치 (카드=상자별칭, 복수 허용은 약수|배수)</span>
            <textarea rows="7" bind:value={draft.classifyCorrect}></textarea>
          </label>
        {/if}

        {#if draft.type === 'ordering'}
          <div class="grid two">
            <label>
              <span>전체 슬롯 수</span>
              <input type="number" bind:value={draft.orderingSlotCount} min="2" />
            </label>
            <label>
              <span>정답 순서 (쉼표 구분)</span>
              <input bind:value={draft.orderingCorrectOrder} />
            </label>
          </div>
          <div class="grid two">
            <label>
              <span>풀 카드</span>
              <input bind:value={draft.orderingPool} />
            </label>
            <label>
              <span>사용 불필요 카드</span>
              <input bind:value={draft.orderingDistractors} />
            </label>
          </div>
          <label>
            <span>고정 카드 (위치=값, 위치는 1부터)</span>
            <textarea
              rows={Number(draft.orderingSlotCount) === 3 ? 3 : 5}
              bind:value={draft.orderingFixed}
              onblur={() => (draft.orderingFixed = normalizeOrderingFixed(draft.orderingFixed, Number(draft.orderingSlotCount)))}
            ></textarea>
          </label>
        {/if}

        {#if draft.type === 'hotspot'}
          <div class="grid three">
            <label>
              <span>범위 시작</span>
              <input type="number" bind:value={draft.hotspotRangeFrom} />
            </label>
            <label>
              <span>범위 끝</span>
              <input type="number" bind:value={draft.hotspotRangeTo} />
            </label>
            <label>
              <span>오답 강조 후보</span>
              <input bind:value={draft.hotspotDecoys} />
            </label>
          </div>
          <label>
            <span>정답 숫자 (쉼표 구분)</span>
            <textarea rows="2" bind:value={draft.hotspotCorrect}></textarea>
          </label>
        {/if}

        {#if draft.type === 'slider'}
          <div class="grid three">
            <label>
              <span>첫 번째 수</span>
              <input type="number" bind:value={draft.sliderA} />
            </label>
            <label>
              <span>두 번째 수</span>
              <input type="number" bind:value={draft.sliderB} />
            </label>
            <label>
              <span>정답</span>
              <input type="number" bind:value={draft.sliderCorrect} />
            </label>
          </div>
          <div class="grid two">
            <label>
              <span>슬라이더 최소값</span>
              <input type="number" bind:value={draft.sliderMin} />
            </label>
            <label>
              <span>슬라이더 최대값</span>
              <input type="number" bind:value={draft.sliderMax} />
            </label>
          </div>
        {/if}

        <div class="action-row">
          <button class="primary" disabled={!preview} onclick={saveQuestion}>{editingQuestionId ? '문제 수정 저장' : '문제 저장'}</button>
          {#if editingQuestionId}
            <button class="secondary" onclick={() => resetDraft()}>새 문제로 전환</button>
          {/if}
          {#if saveMessage}<span class="ok">{saveMessage}</span>{/if}
          {#if saveError}<span class="error">{saveError}</span>{/if}
        </div>
      </section>

      <aside class="sidebar">
        <section class="panel preview-panel">
          <div class="section-head">
            <h2>2. 미리보기</h2>
          </div>
          {#if preview}
            <div class="preview-corner">
              <div class="preview-meta">배점 {preview.score}점 · {preview.timeLimit}초</div>
            </div>

            <div class="preview-header">
              <div class="preview-heading">
                <span class="chip">{preview.type}</span>
                <h3 class="preview-title">{preview.title}</h3>
              </div>
            </div>

            {@const Comp = previewComponents[preview.type]}
            {#if Comp}
              {#key preview}
                <div class="student-preview">
                  <label class="reuse-toggle student-answer-toggle">
                    <input type="checkbox" bind:checked={previewShowAnswer} />
                    <span>정답 표시</span>
                  </label>
                  <Comp question={preview} revealedAnswer={previewRevealedFor(preview)} locked={false} onsubmit={capturePreviewSubmit} />
                </div>
              {/key}
            {/if}
            {#if previewSubmitted != null}
              <div class="preview-submitted">
                <div class="submitted-title">제출 데이터</div>
                <pre>{JSON.stringify(previewSubmitted, null, 2)}</pre>
              </div>
            {/if}
          {:else}
            <p class="error">{previewError}</p>
          {/if}
        </section>
      </aside>

      <div class="set-layout">
        <section class="panel set-builder" bind:this={setBuilderEl}>
          <div class="section-head">
            <h2>3. 퀴즈 세트 구성</h2>
            <span>{selectedCount}개 선택됨</span>
          </div>
          <div class="question-list">
            <div class="list">
              {#each questions as item}
                <div class="question-card" class:selected={isSelected(item.id)}>
                  <button class="list-item" onclick={() => toggleQuestion(item.id)}>
                    <strong>{item.title}</strong>
                  </button>
                  <span class="type-badge card-type">{item.type}</span>
                  <div class="card-meta">
                    {item.score}점 · {item.time_limit}초
                  </div>
                  <div class="question-actions">
                    <button class="mini-action" onclick={() => editQuestion(item)}>수정</button>
                    <button class="mini-delete" onclick={() => deleteQuestion(item.id)}>삭제</button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
          <label>
            <span>세트 이름</span>
            <input bind:value={setName} />
          </label>
          <div class="selected-stack">
            <div class="selected-head">
              <strong>선택된 문제 순서</strong>
              <small>드래그해서 출제 순서를 조정하세요.</small>
            </div>
            {#if selectedQuestionIds.length > 0}
              <div class="selected-list" role="list">
                {#each selectedQuestionIds as id, index (id)}
                  {@const item = selectedItemAt(index)}
                  {#if item}
                    <div
                      class="selected-row"
                      class:dragging={draggingQuestionId === id}
                      role="listitem"
                      draggable={true}
                      ondragstart={(event) => startQuestionDrag(event, id)}
                      ondragend={endQuestionDrag}
                      ondragover={handleQuestionDragOver}
                      ondragenter={() => handleQuestionDragEnter(id)}
                      ondrop={(event) => handleQuestionDrop(event, id)}
                    >
                      <div class="selected-order">{index + 1}</div>
                      <div class="selected-body">
                        <strong>{item.title}</strong>
                      </div>
                      <span class="type-badge card-type">{item.type}</span>
                      <div class="card-meta">
                        {item.score}점 · {item.time_limit}초
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            {:else}
              <p class="selected-empty">위 문제 목록에서 세트에 넣을 문제를 선택하세요.</p>
            {/if}
          </div>
          <div class="action-row">
            <button class="primary" onclick={editingSetId ? updateSet : createSet}>
              {editingSetId ? '세트 업데이트' : '선택 문제로 세트 저장'}
            </button>
            {#if editingSetId}
              <button class="secondary" onclick={cancelSetEdit}>새 세트로 전환</button>
            {/if}
            {#if setMessage}<span class="ok">{setMessage}</span>{/if}
          </div>
        </section>

        <section class="panel set-library">
          <div class="section-head">
            <h2>4. 퀴즈 세트 목록</h2>
            <span>{quizSets.length}개</span>
          </div>
          {#if quizSets.length > 0}
            <div class="set-list">
              {#each quizSets as qs}
                <div class="session-item">
                  <div class="session-info">
                    <strong>{qs.name}</strong>
                    <small>{qs.question_ids.length}문항</small>
                  </div>
                    <div class="session-actions">
                      <button class="mini-action" onclick={() => editSet(qs)}>수정</button>
                      <button class="mini-delete" onclick={() => deleteSet(qs.id)}>삭제</button>
                    </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty">저장된 퀴즈 세트가 없습니다.</p>
          {/if}
        </section>
      </div>
    </div>

    <div class="session-layout">
      <section class="panel">
        <div class="section-head">
          <h2>5. 세션 발급</h2>
        </div>
        <label>
          <span>사용할 퀴즈 세트</span>
          <select bind:value={targetSetId}>
            <option value="">세트를 선택하세요</option>
            {#each quizSets as item}
              <option value={item.id}>{item.name} ({item.question_ids.length}문항)</option>
            {/each}
          </select>
        </label>
        <label>
          <span>입장 코드 (비우면 자동 생성)</span>
          <input bind:value={roomCode} placeholder="예: GXG001" />
        </label>
        <div class="action-row">
          <button class="primary" onclick={createSession}>세션 생성</button>
          {#if sessionMessage}<span class="ok">{sessionMessage}</span>{/if}
        </div>
        {#if roomCode}
          <div class="links">
            <a href={`/student/${roomCode}`}>학생 입장</a>
            <a href={`/teacher/monitor/${roomCode}`}>교사 모니터</a>
          </div>
        {/if}
      </section>

      <section class="panel">
        <div class="section-head">
          <h2>6. 세션 목록</h2>
          <span>{sessions.length}개</span>
        </div>
        {#if sessions.length > 0}
          <div class="session-list">
            {#each sessions as sess}
              <div class="session-item">
                <div class="session-info">
                  <strong>{sess.room_code}</strong>
                  <small>{setNameById(sess.set_id)} · {statusLabel[sess.status] ?? sess.status}</small>
                </div>
                <div class="session-actions">
                  <a href={`/teacher/monitor/${sess.room_code}`} class="mini-link">모니터</a>
                  <button class="mini-delete" onclick={() => deleteSession(sess.id)}>삭제</button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty">생성된 세션이 없습니다.</p>
        {/if}
      </section>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: linear-gradient(180deg, #eef5ff 0%, #f8fbff 100%);
    font-family: 'Pretendard', 'Noto Sans KR', system-ui, sans-serif;
    color: #2f4560;
  }

  .page {
    max-width: 1320px;
    margin: 0 auto;
    padding: 1.25rem;
  }

  .hero,
  .panel {
    background: rgba(255, 255, 255, 0.86);
    border-radius: 24px;
    box-shadow: 0 24px 60px rgba(70, 110, 170, 0.12);
  }

  .hero {
    padding: 1.5rem 1.7rem;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .hero h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  .hero p {
    margin-top: 0.35rem;
    color: #6d8199;
  }

  .hero-actions,
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .hero-actions a,
  .links a {
    padding: 0.8rem 1rem;
    border-radius: 12px;
    background: #4e8de1;
    color: white;
    font-weight: 700;
    text-decoration: none;
  }

  .loading {
    padding: 2rem;
    text-align: center;
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .set-layout {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.46fr);
    gap: 1rem;
    align-items: start;
  }

  .set-builder,
  .set-library {
    display: grid;
    gap: 0.85rem;
    align-content: start;
  }

  .panel {
    padding: 1.2rem;
  }

  .session-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .sidebar {
    display: grid;
    gap: 1rem;
    align-content: start;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.85rem;
  }

  .section-head.stacked {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .grid {
    display: grid;
    gap: 0.8rem;
  }

  .grid.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  label {
    display: grid;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
  }

  .label-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .reuse-toggle {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin: 0;
    cursor: pointer;
  }

  .reuse-toggle input[type='checkbox'] {
    width: 0.95rem;
    height: 0.95rem;
    accent-color: #9ab;
  }

  .reuse-toggle span {
    font-size: 0.8rem;
    font-weight: 600;
    color: #9aadbe;
  }

  label span {
    font-size: 0.95rem;
    font-weight: 700;
    color: #5d7694;
  }

  input,
  textarea,
  select,
  .list-item {
    width: 100%;
    border-radius: 14px;
    border: 2px solid #cfe0f4;
    background: white;
    padding: 0.85rem 0.95rem;
    font: inherit;
    box-sizing: border-box;
    color: #2f4560;
  }

  textarea {
    resize: vertical;
  }

  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    align-items: center;
    justify-content: flex-end;
  }

  .action-row .ok,
  .action-row .error {
    flex-basis: 100%;
    text-align: right;
  }

  .primary {
    height: 3.2rem;
    padding: 0 1.25rem;
    border: 0;
    border-radius: 14px;
    background: #67c971;
    color: white;
    font-size: 1rem;
    font-weight: 700;
  }

  .secondary {
    height: 3.2rem;
    padding: 0 1.1rem;
    border: 2px solid #c9d9eb;
    border-radius: 14px;
    background: white;
    color: #55708d;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
  }

  .chip {
    width: fit-content;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    background: #dfeeff;
    color: #4e8de1;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .preview-panel {
    position: relative;
  }

  .preview-corner {
    position: absolute;
    top: 1.05rem;
    right: 1.2rem;
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    gap: 0.5rem;
    z-index: 5;
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .preview-heading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .preview-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 900;
    color: #2f4560;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-meta {
    color: #5e748f;
    font-weight: 700;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .student-preview {
    border-radius: 18px;
    border: 2px solid #d6e6f9;
    background: #f7fbff;
    padding: 0.75rem;
    position: relative;
  }

  .student-answer-toggle {
    position: absolute;
    top: -1.5rem;
    right: 0.35rem;
    z-index: 6;
    white-space: nowrap;
    background: transparent;
    padding: 0.15rem 0.25rem;
    border-radius: 10px;
  }

  .student-answer-toggle span {
    font-size: 0.7rem;
  }

  .preview-submitted {
    margin-top: 0.75rem;
    border-radius: 18px;
    border: 2px solid #d6e6f9;
    background: #ffffff;
    padding: 0.75rem 0.9rem;
  }

  .submitted-title {
    font-size: 0.9rem;
    font-weight: 800;
    color: #4d6784;
    margin-bottom: 0.4rem;
  }

  .preview-submitted pre {
    margin: 0;
    padding: 0.65rem 0.75rem;
    border-radius: 14px;
    background: #f7fbff;
    border: 2px solid #d6e6f9;
    color: #35506d;
    overflow: auto;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .list {
    max-height: 22rem;
    overflow: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.75rem;
  }

  .question-list {
    border: 2px solid #cfe0f4;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.65);
    padding: 0.75rem;
  }

  .selected-stack {
    display: grid;
    gap: 0.65rem;
    margin-bottom: 0.85rem;
  }

  .selected-head {
    display: grid;
    gap: 0.15rem;
  }

  .selected-head strong {
    font-size: 0.95rem;
    color: #4d6784;
  }

  .selected-head small,
  .selected-empty {
    color: #7d91a7;
  }

  .selected-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.75rem;
  }

  .selected-row {
    position: relative;
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr);
    gap: 0.3rem;
    align-items: center;
    padding: 1.25rem 0.9rem 2.05rem;
    border-radius: 16px;
    border: 2px solid #cfe0f4;
    background: #f7fbff;
    cursor: grab;
    user-select: none;
    -webkit-user-drag: element;
  }

  .selected-row.dragging {
    opacity: 0.55;
  }

  .selected-order {
    position: static;
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #dfeeff;
    border: 1px solid rgba(47, 95, 166, 0.28);
    color: #2f5fa6;
    font-size: 1.08rem;
    font-weight: 900;
    margin-top: 0;
  }

  .selected-body {
    display: grid;
    gap: 0.15rem;
    padding-left: 0;
    padding-top: 0;
    min-width: 0;
  }

  .selected-body strong {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .question-card {
    position: relative;
    border-radius: 16px;
    border: 2px solid #cfe0f4;
    background: #f7fbff;
  }

  .question-card .list-item {
    text-align: left;
    cursor: pointer;
    display: grid;
    gap: 0.25rem;
    padding-top: 1.35rem;
    padding-right: 0.95rem;
    padding-bottom: 2.05rem;
    border: 0;
    background: transparent;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }

  .question-card .list-item strong {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-meta {
    position: absolute;
    right: 0.75rem;
    bottom: 0.35rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: #93a3b3;
    white-space: nowrap;
    pointer-events: none;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    height: 1rem;
    padding: 0 0.38rem;
    border-radius: 999px;
    background: rgba(78, 141, 225, 0.12);
    color: #7f92a6;
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.01em;
  }

  .card-type {
    position: absolute;
    top: 0.35rem;
    left: 0.35rem;
    pointer-events: none;
  }

  .selected-row .card-type {
    top: 0.35rem;
    left: 0.35rem;
  }

  .question-card.selected .list-item {
    border-color: #67c971;
    background: #eef9ef;
  }

  .question-actions {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    transform: none;
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.16s ease;
  }

  .question-card:hover .question-actions,
  .question-card:focus-within .question-actions {
    opacity: 1;
    pointer-events: auto;
  }

  .question-actions .mini-action,
  .question-actions .mini-delete {
    padding: 0.2rem 0.45rem;
    border-radius: 7px;
    font-size: 0.72rem;
    line-height: 1;
  }

  .mini-action,
  .mini-delete {
    padding: 0.35rem 0.65rem;
    border-radius: 8px;
    background: white;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }

  .mini-action {
    border: 2px solid #99bbe8;
    color: #3f74bc;
  }

  .ok {
    color: #38874d;
    font-weight: 700;
  }

  .error {
    color: #cb5656;
    font-weight: 700;
  }

  .empty {
    text-align: center;
    color: #8a9db2;
  }

  .set-list,
  .session-list {
    margin-top: 0.8rem;
    display: grid;
    gap: 0.5rem;
  }

  .session-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem 0.85rem;
    border-radius: 12px;
    border: 2px solid #cfe0f4;
    background: white;
  }

  .session-info {
    display: grid;
    gap: 0.15rem;
  }

  .session-info small {
    color: #76889c;
  }

  .session-actions {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .mini-link {
    padding: 0.35rem 0.65rem;
    border-radius: 8px;
    background: #4e8de1;
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
  }

  .mini-delete {
    border: 2px solid #e0a0a0;
    color: #cb5656;
  }

  @media (max-width: 980px) {
    .layout,
    .session-layout {
      grid-template-columns: 1fr;
    }

    .set-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .page {
      padding: 0.8rem;
    }

    .hero {
      flex-direction: column;
      align-items: stretch;
    }

    .grid.two,
    .grid.three,
    .split {
      grid-template-columns: 1fr;
    }

    .question-actions {
      opacity: 1;
      pointer-events: auto;
    }
  }
</style>
