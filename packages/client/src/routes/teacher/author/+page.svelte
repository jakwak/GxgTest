<script lang="ts">
  import { onMount } from 'svelte';
  import { auxJson } from '$lib/colyseus';
  import { buildQuestion, previewLines, templateDraft, type AuthorDraft } from '$lib/authoring';
  import type { QuestionType } from '@gxg/shared';

  type QuestionRow = {
    id: string;
    type: string;
    title: string;
    prompt: string;
    score: number;
    time_limit: number;
    created_at?: string;
  };

  type QuizSetRow = {
    id: string;
    name: string;
    question_ids: string[];
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

  let loading = true;
  let saveError = '';
  let saveMessage = '';
  let setMessage = '';
  let sessionMessage = '';

  let questions: QuestionRow[] = [];
  let quizSets: QuizSetRow[] = [];
  let selectedQuestionIds = new Set<string>();

  let draft: AuthorDraft = templateDraft('matching');
  let setName = '새 종합 세트';
  let targetSetId = '';
  let roomCode = '';

  let preview: ReturnType<typeof buildQuestion> | null = null;
  let previewError = '';

  async function loadBootstrap() {
    loading = true;
    const data = await auxJson<{ questions: QuestionRow[]; quizSets: QuizSetRow[] }>('/author/bootstrap');
    questions = data.questions ?? [];
    quizSets = data.quizSets ?? [];
    targetSetId = targetSetId || quizSets[0]?.id || '';
    loading = false;
  }

  onMount(loadBootstrap);

  function switchType(type: QuestionType) {
    draft = templateDraft(type);
    saveError = '';
    saveMessage = '';
  }

  function toggleQuestion(id: string) {
    if (selectedQuestionIds.has(id)) selectedQuestionIds.delete(id);
    else selectedQuestionIds.add(id);
    selectedQuestionIds = new Set(selectedQuestionIds);
  }

  async function createQuestion() {
    saveError = '';
    saveMessage = '';
    try {
      const created = await auxJson<QuestionRow>('/author/questions', {
        method: 'POST',
        body: JSON.stringify({ question: preview })
      });
      questions = [created, ...questions];
      selectedQuestionIds = new Set([created.id, ...selectedQuestionIds]);
      saveMessage = '문제가 저장되었어요.';
    } catch (error) {
      saveError = error instanceof Error ? error.message : '문제 저장에 실패했습니다.';
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
      const created = await auxJson<QuizSetRow>('/author/quiz-sets', {
        method: 'POST',
        body: JSON.stringify({ name: setName.trim() || '새 세트', questionIds: ids })
      });
      quizSets = [created, ...quizSets];
      targetSetId = created.id;
      setMessage = `세트가 저장되었어요. (${created.name})`;
    } catch (error) {
      setMessage = error instanceof Error ? error.message : '세트 저장에 실패했습니다.';
    }
  }

  async function createSession() {
    sessionMessage = '';
    if (!targetSetId) {
      sessionMessage = '세션으로 만들 퀴즈 세트를 선택하세요.';
      return;
    }

    try {
      const created = await auxJson<{ id: string; room_code: string }>('/author/sessions', {
        method: 'POST',
        body: JSON.stringify({ setId: targetSetId, roomCode })
      });
      roomCode = created.room_code;
      sessionMessage = `세션이 생성되었어요. 입장 코드: ${created.room_code}`;
    } catch (error) {
      sessionMessage = error instanceof Error ? error.message : '세션 생성에 실패했습니다.';
    }
  }

  $: {
    try {
      preview = buildQuestion(draft);
      previewError = '';
    } catch (error) {
      preview = null;
      previewError = error instanceof Error ? error.message : '미리보기를 만들 수 없습니다.';
    }
  }

  $: selectedCount = selectedQuestionIds.size;
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
      <section class="panel form-panel">
        <div class="section-head">
          <h2>1. 문제 작성</h2>
          <select bind:value={draft.type} on:change={() => switchType(draft.type)}>
            {#each questionTypes as item}
              <option value={item.value}>{item.label}</option>
            {/each}
          </select>
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
            <span>정답 연결 (왼쪽번호=오른쪽번호)</span>
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
            <span>카드 목록 (쉼표 구분)</span>
            <textarea rows="2" bind:value={draft.classifyCards}></textarea>
          </label>
          <label>
            <span>상자 이름 (쉼표 구분)</span>
            <input bind:value={draft.classifyBins} />
          </label>
          <label>
            <span>정답 배치 (카드=상자번호, 복수 허용은 1|2)</span>
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
            <textarea rows="5" bind:value={draft.orderingFixed}></textarea>
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
          <button class="primary" disabled={!preview} on:click={createQuestion}>문제 저장</button>
          {#if saveMessage}<span class="ok">{saveMessage}</span>{/if}
          {#if saveError}<span class="error">{saveError}</span>{/if}
        </div>
      </section>

      <aside class="sidebar">
        <section class="panel preview-panel">
          <div class="section-head">
            <h2>미리보기</h2>
          </div>
          {#if preview}
            <div class="preview-card">
              <span class="chip">{preview.type}</span>
              <h3>{preview.title}</h3>
              <p>{preview.prompt}</p>
              <ul>
                {#each previewLines(preview) as line}
                  <li>{line}</li>
                {/each}
              </ul>
              <small>배점 {preview.score}점 · {preview.timeLimit}초</small>
            </div>
          {:else}
            <p class="error">{previewError}</p>
          {/if}
        </section>

        <section class="panel">
          <div class="section-head">
            <h2>2. 퀴즈 세트 구성</h2>
            <span>{selectedCount}개 선택됨</span>
          </div>
          <label>
            <span>세트 이름</span>
            <input bind:value={setName} />
          </label>
          <div class="list">
            {#each questions as item}
              <button class="list-item" class:selected={selectedQuestionIds.has(item.id)} on:click={() => toggleQuestion(item.id)}>
                <strong>{item.title}</strong>
                <small>{item.type} · {item.score}점</small>
              </button>
            {/each}
          </div>
          <div class="action-row">
            <button class="primary" on:click={createSet}>선택 문제로 세트 저장</button>
            {#if setMessage}<span class="ok">{setMessage}</span>{/if}
          </div>
        </section>

        <section class="panel">
          <div class="section-head">
            <h2>3. 세션 발급</h2>
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
            <button class="primary" on:click={createSession}>세션 생성</button>
            {#if sessionMessage}<span class="ok">{sessionMessage}</span>{/if}
          </div>
          {#if roomCode}
            <div class="links">
              <a href={`/student/${roomCode}`}>학생 입장</a>
              <a href={`/teacher/monitor/${roomCode}`}>교사 모니터</a>
            </div>
          {/if}
        </section>
      </aside>
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
    grid-template-columns: 1.35fr 0.95fr;
    gap: 1rem;
  }

  .panel {
    padding: 1.2rem;
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

  .preview-card {
    display: grid;
    gap: 0.6rem;
    border-radius: 18px;
    background: #f7fbff;
    border: 2px solid #d6e6f9;
    padding: 1rem;
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

  .preview-card ul {
    margin: 0;
    padding-left: 1.2rem;
    color: #5e748f;
  }

  .list {
    max-height: 22rem;
    overflow: auto;
    display: grid;
    gap: 0.55rem;
    margin-bottom: 0.9rem;
  }

  .list-item {
    text-align: left;
    cursor: pointer;
    display: grid;
    gap: 0.25rem;
  }

  .list-item.selected {
    border-color: #67c971;
    background: #eef9ef;
  }

  .list-item small {
    color: #76889c;
  }

  .ok {
    color: #38874d;
    font-weight: 700;
  }

  .error {
    color: #cb5656;
    font-weight: 700;
  }

  @media (max-width: 980px) {
    .layout {
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
  }
</style>
