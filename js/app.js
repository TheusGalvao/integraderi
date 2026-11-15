/**
 * ============================================================================
 * CONTROLADOR DE UI/UX, NAVEGAÇÃO DE TELAS E ESTADO DO JOGO (app.js)
 * Fluxo: Splash Screen -> Seleção de Modos -> Configuração -> Gameplay
 * ============================================================================
 */
(() => {
  const ACHIEVEMENTS = [
    { id: 'first_hit', icon: '🎯', name: 'Primeiro Acerto', desc: 'Acertou a 1ª questão', check: (s) => s.totalCorrect >= 1 },
    { id: 'fast_mind', icon: '⚡', name: 'Mente Rápida', desc: 'Acertou em menos de 2.5s', check: (s) => s.fastHits >= 1 },
    { id: 'streak_10', icon: '🔥', name: 'Sequência de 10', desc: 'Combo de 10 acertos', check: (s) => s.bestStreak >= 10 },
    { id: 'deriv_master', icon: '📐', name: 'Mestre Derivadas', desc: '20 derivadas corretas', check: (s) => s.derivCorrect >= 20 },
    { id: 'integ_master', icon: '∫', name: 'Mestre Integrais', desc: '20 integrais corretas', check: (s) => s.integCorrect >= 20 },
    { id: 'trig_domain', icon: '🌊', name: 'Domínio Trig', desc: '25 trigonométricas certas', check: (s) => s.trigCorrect >= 25 },
    { id: 'explorer_lab', icon: '🧪', name: 'Explorador Livre', desc: '15 questões no Exploração', check: (s) => s.exploreCount >= 15 },
    { id: 'chain_tamer', icon: '🔗', name: 'Mestre da Cadeia', desc: '12 questões de cadeia certas', check: (s) => s.chainCorrect >= 12 }
  ];

  const STAGE_INFO = {
    1: { badge: 'Nível 1', title: 'Básico: sen(x), cos(x) e xⁿ', target: 6 },
    2: { badge: 'Nível 2', title: 'Trigonométricas: tg(x) e sec(x)', target: 6 },
    3: { badge: 'Nível 3', title: 'Coeficientes: 2sen(x), -3cos(x), 4tg(x)', target: 7 },
    4: { badge: 'Nível 4', title: 'Regra da Cadeia: sen(2x), cos(3x), tg(2x)', target: 8 },
    5: { badge: 'Nível 5', title: 'Mestre: Combinações e Notáveis', target: 10 }
  };

  const MODE_META = {
    aventura: { icon: '🚀', name: 'Aventura', cta: 'Jogar Aventura ▶' },
    exploracao: { icon: '🧪', name: 'Exploração', cta: 'Iniciar Exploração ▶' },
    blitz: { icon: '⚡', name: 'Blitz 10s', cta: 'Iniciar Desafio Blitz ▶' }
  };

  const TOPIC_LABELS = {
    trig_adapt: 'Trig Adaptativo',
    trig_basic: 'Trig Básico',
    trig_coeff: 'Coeficientes',
    trig_chain: 'Regra da Cadeia',
    poly: 'Polinomiais',
    all: 'Completo'
  };

  const STORAGE_KEY = 'reflexo_calculo_v2_state';

  const state = {
    activeScreen: 'splash', // 'splash' | 'modes' | 'gameplay'
    gameMode: 'aventura',   // 'aventura' | 'exploracao' | 'blitz'
    directionMode: 'caos',  // 'ida' | 'volta' | 'caos'
    stageSelection: 'progressivo', // 'progressivo' | '1'..'5'
    currentStage: 1,
    stageProgress: 0,
    exploreTopic: 'trig_adapt',
    optionsCount: 4,
    soundEnabled: true,
    hasSavedSession: false,

    // Estado da partida ativa
    lives: 3,
    streak: 0,
    score: 0,
    exploreSessionTotal: 0,
    exploreSessionCorrect: 0,

    // Cronômetro Blitz
    blitzSeconds: 10,
    blitzInterval: null,
    questionStartTime: 0,

    // Estatísticas Persistentes e XP
    xp: 0,
    highScore: 0,
    bestStreak: 0,
    totalResolved: 0,
    totalCorrect: 0,
    totalResponseTimeMs: 0,
    fastHits: 0,
    derivTotal: 0,
    derivCorrect: 0,
    integTotal: 0,
    integCorrect: 0,
    trigTotal: 0,
    trigCorrect: 0,
    chainCorrect: 0,
    exploreCount: 0,
    familyStats: {
      sen: { hits: 0, misses: 0 },
      cos: { hits: 0, misses: 0 },
      tg: { hits: 0, misses: 0 },
      chain: { hits: 0, misses: 0 },
      poly: { hits: 0, misses: 0 }
    },
    unlockedBadges: [],

    activeQuest: { type: 'streak', target: 3, progress: 0, rewardXp: 40, text: 'Desafio: Acerte 3 questões seguidas' },

    currentQuestion: null,
    recentSigs: [],
    awaitingNext: false,
    autoAdvanceTimer: null
  };

  // SINTETIZADOR DE ÁUDIO LEVE (Web Audio API)
  let audioCtx = null;
  function playSound(kind) {
    if (!state.soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (kind === 'hit') {
        const f = 500 + Math.min(state.streak * 24, 360);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 1.25, now + 0.11);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (kind === 'miss') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(195, now);
        osc.frequency.linearRampToValueAtTime(135, now + 0.2);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (kind === 'levelup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.08);
        osc.frequency.setValueAtTime(659, now + 0.16);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.start(now);
        osc.stop(now + 0.32);
      }
    } catch (_) {}
  }

  // PERSISTÊNCIA LOCAL
  function loadSavedData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      state.xp = d.xp || 0;
      state.highScore = d.highScore || 0;
      state.bestStreak = d.bestStreak || 0;
      state.totalResolved = d.totalResolved || 0;
      state.totalCorrect = d.totalCorrect || 0;
      state.totalResponseTimeMs = d.totalResponseTimeMs || 0;
      state.fastHits = d.fastHits || 0;
      state.derivTotal = d.derivTotal || 0;
      state.derivCorrect = d.derivCorrect || 0;
      state.integTotal = d.integTotal || 0;
      state.integCorrect = d.integCorrect || 0;
      state.trigTotal = d.trigTotal || 0;
      state.trigCorrect = d.trigCorrect || 0;
      state.chainCorrect = d.chainCorrect || 0;
      state.exploreCount = d.exploreCount || 0;
      state.currentStage = d.currentStage || 1;
      if (d.gameMode) state.gameMode = d.gameMode;
      if (d.directionMode) state.directionMode = d.directionMode;
      if (d.exploreTopic) state.exploreTopic = d.exploreTopic;
      if (d.optionsCount) state.optionsCount = d.optionsCount;
      if (d.familyStats) state.familyStats = { ...state.familyStats, ...d.familyStats };
      if (Array.isArray(d.unlockedBadges)) state.unlockedBadges = d.unlockedBadges;
      if (state.totalResolved > 0) state.hasSavedSession = true;
    } catch (_) {}
  }

  function saveData() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          xp: state.xp,
          highScore: state.highScore,
          bestStreak: state.bestStreak,
          totalResolved: state.totalResolved,
          totalCorrect: state.totalCorrect,
          totalResponseTimeMs: state.totalResponseTimeMs,
          fastHits: state.fastHits,
          derivTotal: state.derivTotal,
          derivCorrect: state.derivCorrect,
          integTotal: state.integTotal,
          integCorrect: state.integCorrect,
          trigTotal: state.trigTotal,
          trigCorrect: state.trigCorrect,
          chainCorrect: state.chainCorrect,
          exploreCount: state.exploreCount,
          currentStage: state.currentStage,
          gameMode: state.gameMode,
          directionMode: state.directionMode,
          exploreTopic: state.exploreTopic,
          optionsCount: state.optionsCount,
          familyStats: state.familyStats,
          unlockedBadges: state.unlockedBadges
        })
      );
      if (state.totalResolved > 0) state.hasSavedSession = true;
    } catch (_) {}
  }

  function showToast(icon, title) {
    const container = document.getElementById('toastContainer');
    const card = document.createElement('div');
    card.className = 'toast-card';
    card.innerHTML = `<span class="toast-icon">${icon}</span><span>${title}</span>`;
    container.appendChild(card);
    setTimeout(() => {
      card.remove();
    }, 3100);
  }

  function checkAchievements() {
    let newlyUnlocked = false;
    ACHIEVEMENTS.forEach((ach) => {
      if (!state.unlockedBadges.includes(ach.id) && ach.check(state)) {
        state.unlockedBadges.push(ach.id);
        newlyUnlocked = true;
        showToast(ach.icon, `Conquista: ${ach.name}!`);
      }
    });
    if (newlyUnlocked) saveData();
  }

  function rotateQuest() {
    const quests = [
      { type: 'streak', target: 4, progress: 0, rewardXp: 50, text: 'Desafio: Acerte 4 questões seguidas' },
      { type: 'integ', target: 3, progress: 0, rewardXp: 45, text: 'Desafio: Acerte 3 integrais' },
      { type: 'deriv', target: 3, progress: 0, rewardXp: 45, text: 'Desafio: Acerte 3 derivadas' },
      { type: 'trig', target: 4, progress: 0, rewardXp: 50, text: 'Desafio: Acerte 4 trigonométricas' }
    ];
    state.activeQuest = quests[Math.floor(Math.random() * quests.length)];
  }

  function updateQuestOnAnswer(isCorrect, q) {
    const quest = state.activeQuest;
    if (!isCorrect) {
      if (quest.type === 'streak') quest.progress = 0;
      return;
    }
    if (quest.type === 'streak') quest.progress += 1;
    else if (quest.type === 'integ' && q.dir === 'volta') quest.progress += 1;
    else if (quest.type === 'deriv' && q.dir === 'ida') quest.progress += 1;
    else if (quest.type === 'trig' && q.promptExpr.kind === 'trig') quest.progress += 1;

    if (quest.progress >= quest.target) {
      state.xp += quest.rewardXp;
      showToast('🌟', `Desafio concluído! +${quest.rewardXp} XP`);
      rotateQuest();
    }
  }

  function getMultiplier() {
    if (state.streak >= 15) return 4;
    if (state.streak >= 10) return 3;
    if (state.streak >= 5) return 2;
    return 1;
  }

  function getWeakestFamily() {
    let worstKey = null;
    let maxMissRatio = 0;
    for (const [key, st] of Object.entries(state.familyStats)) {
      const total = st.hits + st.misses;
      if (total >= 2 && st.misses > 0) {
        const ratio = st.misses / total;
        if (ratio > maxMissRatio) {
          maxMissRatio = ratio;
          worstKey = key;
        }
      }
    }
    return worstKey;
  }

  function generateDiagnosticText() {
    if (state.totalResolved < 3) {
      return 'Pratique algumas questões para receber dicas personalizadas sobre sua evolução em derivadas e integrais.';
    }
    const derivRate = state.derivTotal > 0 ? state.derivCorrect / state.derivTotal : 1;
    const integRate = state.integTotal > 0 ? state.integCorrect / state.integTotal : 1;

    if (state.integTotal >= 3 && integRate + 0.18 < derivRate) {
      return 'Você está errando mais questões de integrais. Atenção à troca de sinal ao integrar sen(x) e ao dividir por "a" na regra da cadeia!';
    }
    if (state.derivTotal >= 3 && derivRate + 0.18 < integRate) {
      return 'Você está errando mais em derivadas. Lembre-se que funções iniciadas com "CO" (cos) ganham sinal negativo ao derivar!';
    }

    const weak = getWeakestFamily();
    if (weak === 'tg') {
      return 'Ponto de atenção em tangente: d/dx[tg(x)] = sec²(x) e ∫tg(x)dx = -ln|cos(x)| + C.';
    }
    if (weak === 'chain') {
      return 'Pratique a Regra da Cadeia: multiplique por "a" na derivada e divida por "a" na integral de f(ax).';
    }
    if (weak === 'sen' || weak === 'cos') {
      return 'Cuidado com a inversão de sinais entre seno e cosseno! Use o Modo Exploração para fixar o padrão.';
    }

    return 'Excelente consistência! Seu reconhecimento de padrões em seno, cosseno e tangente está evoluindo muito bem.';
  }

  // NAVEGAÇÃO ENTRE TELAS (SPLASH -> MODES -> GAMEPLAY)
  function showScreen(screenName) {
    stopBlitzTimer();
    clearTimeout(state.autoAdvanceTimer);
    state.activeScreen = screenName;

    document.querySelectorAll('.app-screen').forEach((el) => {
      el.classList.toggle('active', el.dataset.screen === screenName);
    });

    const mainHeader = document.getElementById('mainHeader');
    mainHeader.style.display = screenName === 'splash' ? 'none' : 'block';

    const backToModesBtn = document.getElementById('backToModesBtn');
    const headerBrandBtn = document.getElementById('headerBrandBtn');
    const activeModeTrigger = document.getElementById('activeModeTrigger');

    if (screenName === 'gameplay') {
      backToModesBtn.style.display = 'inline-flex';
      headerBrandBtn.style.display = 'none';
      activeModeTrigger.style.display = 'inline-flex';
    } else {
      backToModesBtn.style.display = 'none';
      headerBrandBtn.style.display = 'inline-flex';
      activeModeTrigger.style.display = 'none';
    }

    updateAllUI();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ATUALIZAÇÃO DE TODOS OS INDICADORES (SPLASH, HUB, GAMEPLAY, STATS)
  function updateAllUI() {
    const playerLvl = Math.floor(state.xp / 150) + 1;
    const xpInLevel = state.xp % 150;
    const xpPct = Math.round((xpInLevel / 150) * 100);

    // Header XP
    document.getElementById('playerRankText').textContent = `Nv. ${playerLvl}`;
    document.getElementById('playerXpFill').style.width = `${xpPct}%`;
    document.getElementById('playerXpText').textContent = `${state.xp} XP`;

    // Splash Screen Saved Session Pill
    const splashSavedPill = document.getElementById('splashSavedPill');
    const splashContinueBtn = document.getElementById('splashContinueBtn');
    if (state.hasSavedSession) {
      splashSavedPill.classList.add('visible');
      splashSavedPill.textContent = `⚡ Nível ${playerLvl} • ${state.xp} XP • Recorde: ${state.highScore} pts`;
      splashContinueBtn.style.display = 'inline-flex';
      const lastModeName = MODE_META[state.gameMode] ? MODE_META[state.gameMode].name : 'Aventura';
      splashContinueBtn.textContent = `Continuar ${lastModeName} ➔`;
    } else {
      splashSavedPill.classList.remove('visible');
      splashContinueBtn.style.display = 'none';
    }

    // Mode Selection Hub Cards
    document.getElementById('hubAventuraStagePill').textContent = `Nível ${state.currentStage} de 5`;
    document.getElementById('hubAventuraMeta').textContent = `🏆 Recorde: ${state.highScore} pts`;
    document.getElementById('hubExploreMeta').textContent = `🧪 ${state.exploreCount} resolvidas no laboratório`;
    document.getElementById('hubBlitzMeta').textContent = `🔥 Maior sequência: ${state.bestStreak}`;

    // Hub Quick Quest
    document.getElementById('hubQuestText').textContent = state.activeQuest.text;
    document.getElementById('hubQuestReward').textContent = `${state.activeQuest.progress}/${state.activeQuest.target} (+${state.activeQuest.rewardXp} XP)`;

    // Gameplay Screen Theme & Trigger Pill
    const gameplayScreen = document.getElementById('screenGameplay');
    gameplayScreen.className = `app-screen ${state.activeScreen === 'gameplay' ? 'active' : ''} mode-theme-${state.gameMode}`;

    const modeMeta = MODE_META[state.gameMode];
    const dirLabel = state.directionMode === 'ida' ? 'Derivadas' : state.directionMode === 'volta' ? 'Integrais' : 'Misto';
    const activeModeTrigger = document.getElementById('activeModeTrigger');
    if (state.gameMode === 'exploracao') {
      activeModeTrigger.innerHTML = `${modeMeta.icon} Exploração • ${TOPIC_LABELS[state.exploreTopic] || 'Trig'} ▾`;
    } else {
      const stageLvl = state.stageSelection === 'progressivo' ? state.currentStage : state.stageSelection;
      activeModeTrigger.innerHTML = `${modeMeta.icon} ${modeMeta.name} • Nv.${stageLvl} (${dirLabel}) ▾`;
    }

    // Gameplay HUD
    const hudLifeLabel = document.getElementById('hudLifeLabel');
    const hudLifeContent = document.getElementById('hudLifeContent');
    const blitzTimerBox = document.getElementById('blitzTimerBox');

    if (state.gameMode === 'exploracao') {
      hudLifeLabel.textContent = 'Modo Livre';
      hudLifeContent.innerHTML = `<span class="free-pill">∞ Sem Vidas</span>`;
      blitzTimerBox.classList.remove('active');

      const expAcc =
        state.exploreSessionTotal === 0
          ? 100
          : Math.round((state.exploreSessionCorrect / state.exploreSessionTotal) * 100);
      document.getElementById('stagePill').textContent = '🧪 Laboratório';
      document.getElementById('stageNameText').textContent = `${TOPIC_LABELS[state.exploreTopic]} (${expAcc}% acerto)`;
      document.getElementById('stageFill').style.width = `${expAcc}%`;
      document.getElementById('stageCountText').textContent = `${state.exploreSessionTotal} resp.`;
    } else {
      hudLifeLabel.textContent = 'Vidas';
      hudLifeContent.innerHTML = `
        <div class="hearts-group">
          <span class="heart-icon ${state.lives < 1 ? 'lost' : ''}">❤️</span>
          <span class="heart-icon ${state.lives < 2 ? 'lost' : ''}">❤️</span>
          <span class="heart-icon ${state.lives < 3 ? 'lost' : ''}">❤️</span>
        </div>
      `;

      const activeLvl =
        state.stageSelection === 'progressivo'
          ? state.currentStage
          : parseInt(state.stageSelection, 10);
      const info = STAGE_INFO[activeLvl] || STAGE_INFO[1];
      document.getElementById('stagePill').textContent = info.badge;
      document.getElementById('stageNameText').textContent = info.title;
      const pct =
        state.stageSelection === 'progressivo'
          ? Math.min(100, Math.round((state.stageProgress / info.target) * 100))
          : 100;
      document.getElementById('stageFill').style.width = `${pct}%`;
      document.getElementById('stageCountText').textContent =
        state.stageSelection === 'progressivo' ? `${state.stageProgress}/${info.target}` : 'Fixo';

      blitzTimerBox.classList.toggle('active', state.gameMode === 'blitz');
    }

    document.getElementById('streakVal').textContent = state.streak;
    const mult = getMultiplier();
    const multBadge = document.getElementById('multBadge');
    multBadge.textContent = `x${mult}`;
    multBadge.className = `combo-mult-badge ${mult > 1 ? 'x' + mult : ''}`;

    document.getElementById('hudScoreLabel').textContent = `Pontos (Rec: ${state.highScore})`;
    document.getElementById('scoreVal').textContent = state.score;

    // Sincronizar Estatísticas e Conquistas (tanto no Modal Mobile quanto na Sidebar Desktop)
    renderStatsAndBadges();
  }

  function renderStatsAndBadges() {
    const globalAcc =
      state.totalResolved === 0
        ? 100
        : Math.round((state.totalCorrect / state.totalResolved) * 100);
    const avgSec =
      state.totalResolved > 0
        ? `${(state.totalResponseTimeMs / state.totalResolved / 1000).toFixed(1)}s`
        : '--';
    const dAcc = state.derivTotal === 0 ? 100 : Math.round((state.derivCorrect / state.derivTotal) * 100);
    const iAcc = state.integTotal === 0 ? 100 : Math.round((state.integCorrect / state.integTotal) * 100);
    const tAcc = state.trigTotal === 0 ? 100 : Math.round((state.trigCorrect / state.trigTotal) * 100);
    const diagText = generateDiagnosticText();

    const targets = ['Desktop', 'Modal'];
    targets.forEach((suffix) => {
      const totEl = document.getElementById(`statTotal${suffix}`);
      if (!totEl) return;
      totEl.textContent = state.totalResolved;
      document.getElementById(`statAcc${suffix}`).textContent = `${globalAcc}%`;
      document.getElementById(`statStreak${suffix}`).textContent = `${state.bestStreak} 🔥`;
      document.getElementById(`statTime${suffix}`).textContent = avgSec;

      document.getElementById(`perfDerivText${suffix}`).textContent = `${dAcc}% (${state.derivCorrect}/${state.derivTotal})`;
      document.getElementById(`perfDerivFill${suffix}`).style.width = `${dAcc}%`;

      document.getElementById(`perfIntegText${suffix}`).textContent = `${iAcc}% (${state.integCorrect}/${state.integTotal})`;
      document.getElementById(`perfIntegFill${suffix}`).style.width = `${iAcc}%`;

      document.getElementById(`perfTrigText${suffix}`).textContent = `${tAcc}%`;
      document.getElementById(`perfTrigFill${suffix}`).style.width = `${tAcc}%`;

      document.getElementById(`insightText${suffix}`).textContent = diagText;
      document.getElementById(`unlockedCount${suffix}`).textContent = `${state.unlockedBadges.length}/${ACHIEVEMENTS.length}`;

      const grid = document.getElementById(`badgesGrid${suffix}`);
      grid.innerHTML = '';
      ACHIEVEMENTS.forEach((ach) => {
        const unlocked = state.unlockedBadges.includes(ach.id);
        const item = document.createElement('div');
        item.className = `badge-card ${unlocked ? 'unlocked' : ''}`;
        item.innerHTML = `
          <span class="badge-card-icon">${ach.icon}</span>
          <div class="badge-card-meta">
            <span class="badge-card-title">${ach.name}</span>
            <span class="badge-card-desc">${ach.desc}</span>
          </div>
        `;
        grid.appendChild(item);
      });
    });
  }

  // MODAL DE CONFIGURAÇÃO DA PARTIDA (ANTES OU DURANTE O JOGO)
  function openSetupModal(mode) {
    state.gameMode = mode;
    const meta = MODE_META[mode] || MODE_META.aventura;
    document.getElementById('setupModalTitle').innerHTML = `${meta.icon} Configurar Modo ${meta.name}`;
    document.getElementById('startMatchBtn').textContent = meta.cta;

    // Mostrar seletor de nível (Aventura/Blitz) vs chips de laboratório (Exploração)
    document.getElementById('setupStageBlock').style.display = mode === 'exploracao' ? 'none' : 'block';
    document.getElementById('setupExploreBlock').style.display = mode === 'exploracao' ? 'block' : 'none';

    // Sincronizar estado dos botões no modal
    document.querySelectorAll('#setupDirGroup .seg-option').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.dir === state.directionMode);
    });
    document.querySelectorAll('#setupExploreChips .chip-btn').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.topic === state.exploreTopic);
    });
    document.querySelectorAll('#setupStageChips .chip-btn').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.stage === state.stageSelection);
    });
    document.querySelectorAll('#setupOptCountGroup .chip-btn').forEach((chip) => {
      chip.classList.toggle('active', parseInt(chip.dataset.optcount, 10) === state.optionsCount);
    });

    document.getElementById('setupModal').classList.add('open');
  }

  function startMatchFromSetup() {
    document.getElementById('setupModal').classList.remove('open');
    state.lives = 3;
    saveData();
    showScreen('gameplay');
    nextQuestion();
  }

  // CRONÔMETRO DO MODO BLITZ
  function stopBlitzTimer() {
    if (state.blitzInterval) {
      clearInterval(state.blitzInterval);
      state.blitzInterval = null;
    }
  }

  function startBlitzTimer() {
    stopBlitzTimer();
    if (state.activeScreen !== 'gameplay' || state.gameMode !== 'blitz') return;

    const totalMs = state.blitzSeconds * 1000;
    const start = performance.now();
    const numEl = document.getElementById('blitzClockVal');
    const barEl = document.getElementById('blitzBarInner');

    numEl.textContent = '10.0s';
    numEl.classList.remove('urgent');
    barEl.style.width = '100%';
    barEl.classList.remove('urgent');

    state.blitzInterval = setInterval(() => {
      const elapsed = performance.now() - start;
      const remMs = Math.max(0, totalMs - elapsed);
      const ratio = remMs / totalMs;

      numEl.textContent = `${(remMs / 1000).toFixed(1)}s`;
      barEl.style.width = `${ratio * 100}%`;

      if (ratio < 0.3) {
        numEl.classList.add('urgent');
        barEl.classList.add('urgent');
      }
      if (remMs <= 0) {
        stopBlitzTimer();
        handleOptionSelection(null, null, true);
      }
    }, 50);
  }

  // GERAÇÃO E EXIBIÇÃO DE QUESTÃO NA GAMEPLAY
  function nextQuestion() {
    clearTimeout(state.autoAdvanceTimer);
    stopBlitzTimer();
    state.awaitingNext = false;

    const feedbackDock = document.getElementById('feedbackDock');
    feedbackDock.className = 'feedback-dock';

    const dir =
      state.directionMode === 'caos'
        ? Math.random() < 0.5
          ? 'ida'
          : 'volta'
        : state.directionMode;

    const activeLevel =
      state.stageSelection === 'progressivo'
        ? state.currentStage
        : parseInt(state.stageSelection, 10);

    const topicFilter = state.gameMode === 'exploracao' ? state.exploreTopic : 'all';
    const weakFamily = getWeakestFamily();

    const q = window.MathEngine.generateQuestion({
      level: activeLevel,
      dir,
      topicFilter,
      recentSigs: state.recentSigs,
      weakFamily,
      optionsCount: state.optionsCount,
      familyStats: state.familyStats
    });

    state.currentQuestion = q;
    state.recentSigs.push(q.sig);
    if (state.recentSigs.length > 8) state.recentSigs.shift();

    const questionArena = document.getElementById('questionArena');
    questionArena.className = `question-arena ${dir === 'ida' ? 'op-ida' : 'op-volta'}`;

    const opPill = document.getElementById('opPill');
    const promptInstruction = document.getElementById('promptInstruction');
    const mathFormulaDisplay = document.getElementById('mathFormulaDisplay');

    const funcHtml = window.MathEngine.renderExprHtml(q.promptExpr, false);
    if (dir === 'ida') {
      opPill.className = 'op-pill ida';
      opPill.textContent = "➔ DERIVADA (f ➔ f')";
      promptInstruction.textContent = 'Calcule a derivada em relação a x:';
      mathFormulaDisplay.innerHTML = `<span class="deriv-sym"><span class="frac"><span class="num">d</span><span class="den">dx</span></span></span><span>[ ${funcHtml} ]</span>`;
    } else {
      opPill.className = 'op-pill volta';
      opPill.textContent = '⬅ INTEGRAL (∫ f dx)';
      promptInstruction.textContent = 'Encontre a antiderivada F(x) + C:';
      const needsParens = q.promptExpr.kind === 'combo';
      mathFormulaDisplay.innerHTML = `<span class="integral-sym">∫</span><span>${
        needsParens ? '(' + funcHtml + ')' : funcHtml
      } dx</span>`;
    }

    mathFormulaDisplay.classList.remove('anim-question-in');
    void mathFormulaDisplay.offsetWidth;
    mathFormulaDisplay.classList.add('anim-question-in');

    document.getElementById('conceptTag').textContent = q.tag;

    const answerGrid = document.getElementById('answerGrid');
    answerGrid.innerHTML = '';
    const hasLongCombo = q.correctExpr.kind === 'combo';
    answerGrid.classList.toggle('single-col-mobile', hasLongCombo);

    q.options.forEach((optExpr, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer-btn';
      btn.dataset.index = idx;
      btn.innerHTML = `
        <span class="answer-math">${window.MathEngine.renderExprHtml(optExpr, true)}</span>
        <span class="answer-key-hint">${idx + 1}</span>
      `;
      btn.addEventListener('click', () => handleOptionSelection(optExpr, btn, false));
      answerGrid.appendChild(btn);
    });

    state.questionStartTime = performance.now();
    updateAllUI();
    startBlitzTimer();
  }

  // VALIDAÇÃO DE RESPOSTA E FEEDBACK EDUCATIVO IMEDIATO
  function handleOptionSelection(selectedExpr, clickedBtn, isTimeout = false) {
    if (state.awaitingNext) return;
    stopBlitzTimer();
    state.awaitingNext = true;

    const q = state.currentQuestion;
    const elapsedMs = Math.max(100, performance.now() - state.questionStartTime);
    const isCorrect = !isTimeout && window.MathEngine.areEquivalent(selectedExpr, q.correctExpr);

    state.totalResolved += 1;
    state.totalResponseTimeMs += Math.min(elapsedMs, 15000);
    if (q.dir === 'ida') state.derivTotal += 1;
    else state.integTotal += 1;
    if (q.promptExpr.kind === 'trig') state.trigTotal += 1;
    if (state.gameMode === 'exploracao') {
      state.exploreCount += 1;
      state.exploreSessionTotal += 1;
    }

    const famStat = state.familyStats[q.family];

    const allBtns = document.querySelectorAll('#answerGrid .answer-btn');
    allBtns.forEach((btn) => {
      btn.disabled = true;
      const optObj = q.options[parseInt(btn.dataset.index, 10)];
      if (window.MathEngine.areEquivalent(optObj, q.correctExpr)) {
        btn.classList.add('correct');
      }
    });

    const questionArena = document.getElementById('questionArena');
    const feedbackDock = document.getElementById('feedbackDock');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackDetail = document.getElementById('feedbackDetail');

    if (isCorrect) {
      state.totalCorrect += 1;
      state.streak += 1;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      if (elapsedMs <= 2500) state.fastHits += 1;
      if (q.dir === 'ida') state.derivCorrect += 1;
      else state.integCorrect += 1;
      if (q.promptExpr.kind === 'trig') state.trigCorrect += 1;
      if (q.family === 'chain') state.chainCorrect += 1;
      if (state.gameMode === 'exploracao') state.exploreSessionCorrect += 1;
      if (famStat) famStat.hits += 1;

      const mult = getMultiplier();
      const speedBonus = elapsedMs < 3500 ? 5 : 0;
      const ptsGained = (10 + speedBonus) * mult;
      state.score += ptsGained;
      if (state.score > state.highScore) state.highScore = state.score;
      state.xp += 12 + mult * 3;

      questionArena.classList.add('state-correct');
      playSound('hit');

      let leveledUp = false;
      if (state.gameMode !== 'exploracao' && state.stageSelection === 'progressivo' && state.currentStage < 5) {
        state.stageProgress += 1;
        const target = STAGE_INFO[state.currentStage].target;
        if (state.stageProgress >= target) {
          state.currentStage += 1;
          state.stageProgress = 0;
          leveledUp = true;
          playSound('levelup');
          showToast('🚀', `Avançou para o ${STAGE_INFO[state.currentStage].badge}!`);
        }
      }

      updateQuestOnAnswer(true, q);
      checkAchievements();
      saveData();
      updateAllUI();

      if (state.gameMode === 'exploracao' || leveledUp) {
        feedbackDock.className = `feedback-dock visible ${leveledUp ? 'fb-levelup' : 'fb-correct'}`;
        feedbackTitle.innerHTML = leveledUp
          ? `🎉 Nível Desbloqueado: ${STAGE_INFO[state.currentStage].badge}!`
          : `✅ ${q.feedback.hitHeadline}`;
        feedbackDetail.innerHTML = q.feedback.tip;

        state.autoAdvanceTimer = setTimeout(() => {
          if (state.awaitingNext) nextQuestion();
        }, 1400);
      } else {
        state.autoAdvanceTimer = setTimeout(() => {
          if (state.awaitingNext) nextQuestion();
        }, 380);
      }
    } else {
      if (clickedBtn) clickedBtn.classList.add('wrong');
      questionArena.classList.add('state-wrong');
      playSound('miss');

      state.streak = 0;
      if (famStat) famStat.misses += 1;
      updateQuestOnAnswer(false, q);

      if (state.gameMode !== 'exploracao') {
        state.lives -= 1;
      }

      if (state.gameMode !== 'exploracao' && state.lives <= 0) {
        feedbackDock.className = 'feedback-dock visible fb-wrong';
        feedbackTitle.innerHTML = `💔 3 Vidas Perdidas! Ciclo reiniciado (Pontos: ${state.score} | Recorde: ${state.highScore}).`;
        feedbackDetail.innerHTML = `${q.feedback.missHeadline} <strong>Dica:</strong> ${q.feedback.tip}`;
        state.lives = 3;
        state.score = 0;
        state.stageProgress = 0;
      } else {
        feedbackDock.className = 'feedback-dock visible fb-wrong';
        feedbackTitle.innerHTML = isTimeout
          ? `⏱️ Tempo esgotado! ${q.feedback.missHeadline}`
          : `❌ ${q.feedback.missHeadline}`;
        feedbackDetail.innerHTML = `💡 ${q.feedback.tip}`;
      }

      saveData();
      updateAllUI();
    }
  }

  // REGISTRO DE EVENTOS DE INTERAÇÃO
  function bindEvents() {
    // Botões da Splash Screen
    document.getElementById('splashPlayBtn').addEventListener('click', () => {
      showScreen('modes');
    });

    document.getElementById('splashContinueBtn').addEventListener('click', () => {
      showScreen('gameplay');
      nextQuestion();
    });

    // Voltar para a Seleção de Modos
    document.getElementById('backToModesBtn').addEventListener('click', () => {
      showScreen('modes');
    });

    document.getElementById('headerBrandBtn').addEventListener('click', () => {
      showScreen('splash');
    });

    // Seleção de Card de Modo no Hub
    document.querySelectorAll('.mode-card[data-select-mode]').forEach((card) => {
      card.addEventListener('click', () => {
        openSetupModal(card.dataset.selectMode);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSetupModal(card.dataset.selectMode);
        }
      });
    });

    // Abrir Configuração Rápida durante a Partida
    document.getElementById('activeModeTrigger').addEventListener('click', () => {
      openSetupModal(state.gameMode);
    });

    // Controles dentro do Modal de Configuração da Partida
    document.querySelectorAll('#setupDirGroup .seg-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#setupDirGroup .seg-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.directionMode = btn.dataset.dir;
      });
    });

    document.querySelectorAll('#setupExploreChips .chip-btn').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#setupExploreChips .chip-btn').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.exploreTopic = chip.dataset.topic;
      });
    });

    document.querySelectorAll('#setupStageChips .chip-btn').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#setupStageChips .chip-btn').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.stageSelection = chip.dataset.stage;
        state.stageProgress = 0;
      });
    });

    document.querySelectorAll('#setupOptCountGroup .chip-btn').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#setupOptCountGroup .chip-btn').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.optionsCount = parseInt(chip.dataset.optcount, 10);
      });
    });

    document.getElementById('startMatchBtn').addEventListener('click', startMatchFromSetup);
    document.getElementById('closeSetupBtn').addEventListener('click', () => {
      document.getElementById('setupModal').classList.remove('open');
    });

    // Botão Próxima Questão no Feedback
    document.getElementById('nextQuestionBtn').addEventListener('click', () => {
      nextQuestion();
    });

    // Modais de Estatísticas, Conquistas e Cola Mental
    const statsModal = document.getElementById('statsModal');
    const helpModal = document.getElementById('helpModal');
    const setupModal = document.getElementById('setupModal');

    const openStats = () => {
      renderStatsAndBadges();
      statsModal.classList.add('open');
    };
    const openHelp = () => helpModal.classList.add('open');

    document.getElementById('headerStatsBtn').addEventListener('click', openStats);
    document.getElementById('hubStatsBtn').addEventListener('click', openStats);
    document.getElementById('hubBadgesBtn').addEventListener('click', openStats);

    document.getElementById('headerHelpBtn').addEventListener('click', openHelp);
    document.getElementById('hubHelpBtn').addEventListener('click', openHelp);

    document.getElementById('closeStatsBtn').addEventListener('click', () => statsModal.classList.remove('open'));
    document.getElementById('closeHelpBtn').addEventListener('click', () => helpModal.classList.remove('open'));

    [statsModal, helpModal, setupModal].forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    });

    // Som e Tema
    const soundBtn = document.getElementById('soundBtn');
    soundBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      soundBtn.textContent = state.soundEnabled ? '🔊' : '🔇';
    });

    document.getElementById('themeBtn').addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
    });

    // Zerar Estatísticas
    const resetAllStats = () => {
      state.xp = 0;
      state.highScore = 0;
      state.bestStreak = 0;
      state.totalResolved = 0;
      state.totalCorrect = 0;
      state.totalResponseTimeMs = 0;
      state.fastHits = 0;
      state.derivTotal = 0;
      state.derivCorrect = 0;
      state.integTotal = 0;
      state.integCorrect = 0;
      state.trigTotal = 0;
      state.trigCorrect = 0;
      state.chainCorrect = 0;
      state.exploreCount = 0;
      state.score = 0;
      state.streak = 0;
      state.lives = 3;
      state.currentStage = 1;
      state.stageProgress = 0;
      state.unlockedBadges = [];
      state.hasSavedSession = false;
      saveData();
      updateAllUI();
      showToast('🔄', 'Estatísticas reiniciadas!');
    };

    document.getElementById('resetStatsBtnDesktop').addEventListener('click', resetAllStats);
    document.getElementById('resetStatsBtnModal').addEventListener('click', resetAllStats);

    // Atalhos de Teclado para Desktop (1-4, Espaço/Enter, Escape, H, M)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        statsModal.classList.remove('open');
        helpModal.classList.remove('open');
        setupModal.classList.remove('open');
        return;
      }

      if (state.activeScreen !== 'gameplay') return;

      if (state.awaitingNext && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        nextQuestion();
        return;
      }

      if (['1', '2', '3', '4'].includes(e.key) && !state.awaitingNext) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        const btn = document.querySelector(`#answerGrid .answer-btn[data-index="${idx}"]`);
        if (btn) btn.click();
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        helpModal.classList.toggle('open');
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const dirs = ['ida', 'volta', 'caos'];
        state.directionMode = dirs[(dirs.indexOf(state.directionMode) + 1) % dirs.length];
        nextQuestion();
      }
    });
  }

  // INICIALIZAÇÃO
  loadSavedData();
  bindEvents();
  showScreen('splash');
})();
