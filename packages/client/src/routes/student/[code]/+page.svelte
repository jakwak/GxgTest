<script lang="ts">
  import { page } from '$app/stores';
  import {
    currentQuestion,
    ended,
    joinAsStudent,
    revealedAnswer,
    room,
    state
  } from '$lib/colyseus';
  import MatchingQ from '$lib/components/questions/MatchingQ.svelte';
  import MultipleChoiceQ from '$lib/components/questions/MultipleChoiceQ.svelte';
  import ClassifyQ from '$lib/components/questions/ClassifyQ.svelte';
  import OrderingQ from '$lib/components/questions/OrderingQ.svelte';
  import HotspotQ from '$lib/components/questions/HotspotQ.svelte';
  import SliderQ from '$lib/components/questions/SliderQ.svelte';

  let name = '';
  let error = '';

  const components: Record<string, any> = {
    matching: MatchingQ,
    multiple_choice: MultipleChoiceQ,
    classify: ClassifyQ,
    ordering: OrderingQ,
    hotspot: HotspotQ,
    slider: SliderQ
  };

  async function join() {
    error = '';
    try {
      await joinAsStudent($page.params.code ?? '', name.trim() || '익명');
    } catch (e: any) {
      error = e?.message ?? String(e);
    }
  }

  function submit(event: CustomEvent) {
    $room?.send('answer', { response: event.detail });
  }

  $: me = $state?.players?.find((player: any) => player.id === $room?.sessionId);
  $: questionNumber = ($state?.currentIndex ?? 0) + 1;
  $: totalQuestions = $state?.totalQuestions ?? '?';
  $: locked = Boolean(me?.hasSubmitted || $state?.status === 'reveal');
  $: answerShown = $revealedAnswer != null;
</script>

<main class="page">
  {#if !$room}
    <section class="join-card">
      <h1>실시간 수학 퀴즈 입장</h1>
      <p>입장 코드 <strong>{$page.params.code}</strong> 방으로 들어갑니다.</p>
      <div class="join-row">
        <input bind:value={name} placeholder="닉네임" maxlength="12" />
        <button on:click={join}>입장하기</button>
      </div>
      {#if error}
        <p class="error">{error}</p>
      {/if}
    </section>
  {:else if $ended}
    <section class="end-card">
      <h1>수업이 종료되었어요</h1>
      <p>최종 점수는 <strong>{me?.score ?? 0}점</strong>입니다.</p>
      <p>맞춘 문제 수: {me?.answeredCount ?? 0} / {$state?.totalQuestions ?? 0}</p>
      <a href="/" class="home-link">처음으로 돌아가기</a>
    </section>
  {:else}
    <section class="quiz-shell">
      <header class="topbar">
        <span>문제 {questionNumber}/{totalQuestions}</span>
        <span class="title">[{($currentQuestion?.title ?? '대기 중')}]</span>
        <div class="meta">
          <span>[{String(Math.floor(($state?.timeLeft ?? 0) / 60)).padStart(2, '0')}:{String(($state?.timeLeft ?? 0) % 60).padStart(2, '0')}]</span>
          <span>{me?.score ?? 0}점</span>
        </div>
      </header>

      {#if $state?.status === 'waiting'}
        <div class="waiting-card">
          <h2>교사가 시작하기를 기다리고 있어요</h2>
          <p>잠시만 기다리면 첫 문제가 열립니다.</p>
        </div>
      {:else if $currentQuestion}
        <section class="content-card">
          <svelte:component
            this={components[$currentQuestion.type]}
            question={$currentQuestion}
            revealedAnswer={$revealedAnswer}
            {locked}
            on:submit={submit}
          />

          {#if me?.hasSubmitted && !answerShown}
            <div class="feedback submitted">제출 완료! 다른 친구들이 마칠 때까지 잠시 기다려요.</div>
          {/if}

          {#if answerShown}
            <div class="feedback" class:correct={me?.lastCorrect} class:wrong={!me?.lastCorrect}>
              {me?.lastCorrect ? '정답이에요! 점수가 반영되었어요.' : '이번 문제는 아쉬웠어요. 공개된 정답을 확인해보세요.'}
            </div>
          {/if}
        </section>
      {/if}
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: linear-gradient(180deg, #ecf5ff 0%, #f3f8ff 100%);
    font-family: 'Pretendard', 'Noto Sans KR', system-ui, sans-serif;
    color: #2f4560;
  }

  .page {
    max-width: 1120px;
    margin: 0 auto;
    padding: 1.1rem;
  }

  .join-card,
  .end-card,
  .waiting-card,
  .content-card {
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 24px 60px rgba(70, 110, 170, 0.12);
  }

  .join-card,
  .end-card {
    margin: 6rem auto;
    max-width: 38rem;
    padding: 2rem;
    text-align: center;
  }

  .join-row {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1.2rem;
  }

  input {
    min-width: 16rem;
    height: 3.4rem;
    border-radius: 14px;
    border: 2px solid #b7d6f4;
    padding: 0 1rem;
    font-size: 1rem;
  }

  button,
  .home-link {
    height: 3.4rem;
    border-radius: 14px;
    border: 0;
    background: #4e8de1;
    color: white;
    padding: 0 1.25rem;
    font-size: 1rem;
    font-weight: 700;
    text-decoration: none;
  }

  .error {
    color: #d04b4b;
  }

  .quiz-shell {
    display: grid;
    gap: 1rem;
  }

  .topbar {
    min-height: 3.8rem;
    border-radius: 16px;
    background: #4e8de1;
    color: white;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 1rem;
    padding: 0 1.3rem;
    font-size: 1.25rem;
  }

  .title {
    text-align: center;
    font-size: 2rem;
    font-weight: 700;
  }

  .meta {
    display: flex;
    gap: 1.2rem;
  }

  .waiting-card {
    padding: 4rem 2rem;
    text-align: center;
  }

  .content-card {
    padding: 1.4rem;
    display: grid;
    gap: 1rem;
  }

  .feedback {
    border-radius: 16px;
    padding: 1rem 1.2rem;
    font-size: 1.05rem;
    font-weight: 700;
    text-align: center;
  }

  .feedback.submitted {
    background: #eef4ff;
    color: #4e71a7;
  }

  .feedback.correct {
    background: #eaf8ea;
    color: #2d7f3d;
  }

  .feedback.wrong {
    background: #fff0f0;
    color: #cc5050;
  }

  @media (max-width: 760px) {
    .page {
      padding: 0.75rem;
    }

    .topbar {
      grid-template-columns: 1fr;
      text-align: center;
      padding: 0.8rem 1rem;
      gap: 0.45rem;
    }

    .title {
      font-size: 1.35rem;
    }

    .meta,
    .join-row {
      flex-direction: column;
      align-items: stretch;
    }

    input,
    button,
    .home-link {
      width: 100%;
    }
  }
</style>
