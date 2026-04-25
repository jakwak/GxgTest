<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import {
    currentQuestion,
    ended,
    joinAsTeacher,
    leaveRoom,
    revealedAnswer,
    room,
    state as gameState
  } from '$lib/colyseus';

  let error = $state('');

  async function join() {
    error = '';
    try {
      await joinAsTeacher($page.params.code ?? '');
    } catch (e) {
      error = e instanceof Error ? e.message : '모니터 입장에 실패했습니다.';
    }
  }

  onMount(join);
  onDestroy(() => leaveRoom());

  function startQuiz() {
    $room?.send('start');
  }

  function nextQuestion() {
    $room?.send('next');
  }

  let players = $derived([...($gameState?.players ?? [])].sort((a: any, b: any) => b.score - a.score));
  let questionNumber = $derived(($gameState?.currentIndex ?? 0) + 1);
</script>

<svelte:head>
  <title>교사 모니터 | GxgTest</title>
</svelte:head>

<main class="page">
  <header class="hero">
    <div>
      <h1>교사 모니터</h1>
      <p>입장 코드 <strong>{$page.params.code}</strong> 세션을 실시간으로 관리합니다.</p>
    </div>
    <div class="hero-links">
      <a href="/">홈으로</a>
      <a href="/teacher/author">문제 작성</a>
      <a href={`/student/${$page.params.code}`}>학생 화면</a>
    </div>
  </header>

  {#if error}
    <section class="panel error">{error}</section>
  {:else if !$room}
    <section class="panel loading">세션에 접속하는 중입니다...</section>
  {:else}
    <div class="layout">
      <section class="panel stage">
        <div class="topline">
          <div class="badge">상태: {$gameState?.status ?? 'waiting'}</div>
          <div class="badge">문제 {questionNumber} / {$gameState?.totalQuestions ?? 0}</div>
          <div class="badge">남은 시간 {$gameState?.timeLeft ?? 0}초</div>
        </div>

        {#if $ended}
          <div class="status-card ended">
            <h2>모든 문제가 종료되었습니다.</h2>
            <p>학생 점수표를 확인한 뒤 새 세션을 발급할 수 있어요.</p>
          </div>
        {:else if $gameState?.status === 'waiting'}
          <div class="status-card">
            <h2>대기 중</h2>
            <p>학생 입장을 확인한 뒤 시작 버튼을 눌러 주세요.</p>
            <button class="primary" onclick={startQuiz}>퀴즈 시작</button>
          </div>
        {:else}
          <div class="status-card">
            <h2>{$currentQuestion?.title ?? '문제 준비 중'}</h2>
            <p>{$currentQuestion?.prompt}</p>

            {#if $gameState?.status === 'playing'}
              <button class="primary" onclick={nextQuestion} disabled>
                공개 전에는 다음 문제로 넘어갈 수 없어요
              </button>
            {:else if $gameState?.status === 'reveal'}
              <div class="answer-box">
                <strong>정답 공개됨</strong>
                <pre>{JSON.stringify($revealedAnswer, null, 2)}</pre>
              </div>
              <button class="primary" onclick={nextQuestion}>다음 문제</button>
            {/if}
          </div>
        {/if}
      </section>

      <section class="panel scoreboard">
        <div class="section-head">
          <h2>학생 현황</h2>
          <span>{players.length}명 접속</span>
        </div>

        {#if players.length === 0}
          <p class="muted">아직 학생이 입장하지 않았습니다.</p>
        {:else}
          <div class="table">
            {#each players as player, index}
              <div class="row">
                <div>
                  <strong>{index + 1}. {player.name}</strong>
                  <small>{player.hasSubmitted ? '제출 완료' : '풀이 중'}</small>
                </div>
                <div class="score">
                  <span>{player.score}점</span>
                  <small>{player.answeredCount}문제 정답 처리</small>
                </div>
              </div>
            {/each}
          </div>
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
    max-width: 1240px;
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
  p,
  pre {
    margin: 0;
  }

  .hero p {
    margin-top: 0.35rem;
    color: #6d8199;
  }

  .hero-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .hero-links a {
    padding: 0.8rem 1rem;
    border-radius: 12px;
    background: #4e8de1;
    color: white;
    font-weight: 700;
    text-decoration: none;
  }

  .layout {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 1rem;
  }

  .panel {
    padding: 1.2rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
  }

  .topline,
  .section-head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.9rem;
  }

  .badge {
    padding: 0.45rem 0.8rem;
    border-radius: 999px;
    background: #eef4ff;
    color: #4e8de1;
    font-weight: 700;
  }

  .status-card {
    border-radius: 18px;
    background: #f7fbff;
    border: 2px solid #d6e6f9;
    padding: 1.1rem;
    display: grid;
    gap: 0.8rem;
  }

  .status-card.ended {
    background: #f4fbf4;
    border-color: #d7edd8;
  }

  .primary {
    width: fit-content;
    min-width: 12rem;
    height: 3.2rem;
    border: 0;
    border-radius: 14px;
    background: #67c971;
    color: white;
    font-size: 1rem;
    font-weight: 700;
  }

  .primary:disabled {
    opacity: 0.55;
  }

  .answer-box {
    border-radius: 16px;
    background: #fff8eb;
    padding: 0.9rem;
  }

  pre {
    margin-top: 0.45rem;
    white-space: pre-wrap;
    font-size: 0.92rem;
    color: #536a84;
  }

  .muted {
    color: #76889c;
  }

  .table {
    display: grid;
    gap: 0.65rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    padding: 0.9rem 1rem;
    border-radius: 16px;
    background: #f7fbff;
    border: 2px solid #d6e6f9;
  }

  .row small,
  .score small {
    display: block;
    margin-top: 0.2rem;
    color: #7b8da1;
  }

  .score {
    text-align: right;
    font-weight: 700;
    color: #4e8de1;
  }

  .error {
    color: #cb5656;
    font-weight: 700;
  }

  @media (max-width: 900px) {
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

    .row {
      flex-direction: column;
      align-items: stretch;
    }

    .score {
      text-align: left;
    }
  }
</style>
