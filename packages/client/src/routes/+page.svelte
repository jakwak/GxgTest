<script lang="ts">
  let code = 'DEMO01';
</script>

<svelte:head>
  <title>GxgTest | 실시간 수학 퀴즈</title>
</svelte:head>

<main class="page">
  <section class="hero">
    <div>
      <h1>GxgTest</h1>
      <p>실시간 수학 퀴즈를 학생 화면, 교사 모니터, 작성실까지 한 번에 연결하는 데모입니다.</p>
    </div>
    <div class="input-card">
      <label>
        <span>입장 코드</span>
        <input bind:value={code} placeholder="예: DEMO01" />
      </label>
      <div class="links">
        <a href={`/student/${code}`}>학생으로 입장</a>
        <a href={`/teacher/monitor/${code}`}>교사 모니터</a>
      </div>
    </div>
  </section>

  <section class="grid">
    <a class="panel" href="/teacher/author">
      <strong>문제 작성실</strong>
      <p>6개 문제 유형을 폼으로 만들고 세트와 세션까지 이어서 생성합니다.</p>
    </a>
    <a class="panel" href={`/teacher/monitor/${code}`}>
      <strong>실시간 모니터</strong>
      <p>학생 제출 현황, 점수, 문제 진행 상태를 한눈에 확인할 수 있습니다.</p>
    </a>
    <a class="panel" href={`/student/${code}`}>
      <strong>학생 플레이</strong>
      <p>학습형 UX로 정리된 6개 문제를 실제 흐름으로 플레이할 수 있습니다.</p>
    </a>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background:
      radial-gradient(circle at top left, rgba(141, 194, 255, 0.28), transparent 34%),
      linear-gradient(180deg, #eef5ff 0%, #f8fbff 100%);
    font-family: 'Pretendard', 'Noto Sans KR', system-ui, sans-serif;
    color: #2f4560;
  }

  .page {
    max-width: 1120px;
    margin: 0 auto;
    padding: 2rem 1.2rem 3rem;
    display: grid;
    gap: 1rem;
  }

  .hero,
  .panel {
    background: rgba(255, 255, 255, 0.86);
    border-radius: 28px;
    box-shadow: 0 24px 60px rgba(70, 110, 170, 0.12);
  }

  .hero {
    padding: 2rem;
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 1rem;
    align-items: center;
  }

  h1,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    line-height: 0.95;
  }

  .hero p {
    margin-top: 0.8rem;
    font-size: 1.15rem;
    color: #647892;
    line-height: 1.65;
  }

  .input-card {
    border-radius: 22px;
    background: linear-gradient(180deg, #4e8de1 0%, #6aa3ef 100%);
    color: white;
    padding: 1.3rem;
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  label span {
    font-weight: 700;
  }

  input {
    width: 100%;
    height: 3.4rem;
    border: 0;
    border-radius: 14px;
    padding: 0 1rem;
    font: inherit;
    box-sizing: border-box;
    color: #2f4560;
  }

  .links {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    margin-top: 0.9rem;
  }

  .links a,
  .panel {
    text-decoration: none;
  }

  .links a {
    min-height: 3.25rem;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.18);
    color: white;
    font-weight: 700;
    display: grid;
    place-items: center;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .panel {
    padding: 1.4rem;
    color: inherit;
    border: 2px solid transparent;
  }

  .panel:hover {
    border-color: #cfe0f4;
  }

  .panel strong {
    display: block;
    margin-bottom: 0.45rem;
    font-size: 1.15rem;
  }

  .panel p {
    color: #6d8199;
    line-height: 1.55;
  }

  @media (max-width: 860px) {
    .hero,
    .grid,
    .links {
      grid-template-columns: 1fr;
    }
  }
</style>
