/**
 * ============================================================================
 * MOTOR MATEMÁTICO SIMBÓLICO E GERADOR PROCEDURAL (MathEngine)
 * Trabalha com representações matemáticas estruturadas (AST) e equivalência real.
 * ============================================================================
 */
window.MathEngine = (() => {
  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b !== 0) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function createExpr({
    kind,        // 'trig' | 'ln_trig' | 'poly' | 'inv' | 'exp' | 'combo'
    fn = '',     // 'sen' | 'cos' | 'tg' | 'sec2' | 'sec' | 'sec_tg' | 'cotg' | 'cosec2' | 'ln_cos' | 'ln_sec' | 'ln_sen' | 'ln_x'
    num = 1,     // numerador do coeficiente externo (com sinal)
    den = 1,     // denominador do coeficiente externo (>0)
    inner = 1,   // coeficiente linear interno 'a' em f(ax)
    power = 1,   // expoente para polinomiais
    plusC = false,
    comboTerms = null
  }) {
    if (den < 0) {
      num = -num;
      den = -den;
    }
    if (num === 0) {
      den = 1;
    } else {
      const d = gcd(num, den);
      num = num / d;
      den = den / d;
    }
    return { kind, fn, num, den, inner, power, plusC, comboTerms };
  }

  function getCanonicalSignature(expr) {
    if (!expr) return 'null';
    if (expr.kind === 'combo' && Array.isArray(expr.comboTerms)) {
      const subSigs = expr.comboTerms.map((t) => getCanonicalSignature({ ...t, plusC: false })).sort();
      return `combo(${subSigs.join('+')})|C:${expr.plusC ? 1 : 0}`;
    }

    let normKind = expr.kind;
    let normFn = expr.fn;
    let normNum = expr.num;
    let normDen = expr.den;

    // Equivalência: -k * ln|cos(ax)| + C === +k * ln|sec(ax)| + C
    if (normKind === 'ln_trig' && normFn === 'ln_sec') {
      normFn = 'ln_cos';
      normNum = -normNum;
    }

    return `${normKind}|${normFn}|${normNum}/${normDen}|in:${expr.inner}|p:${expr.power}|C:${expr.plusC ? 1 : 0}`;
  }

  function areEquivalent(exprA, exprB) {
    if (!exprA || !exprB) return false;
    return getCanonicalSignature(exprA) === getCanonicalSignature(exprB);
  }

  function formatCoeffPrefix(num, den, isLeading = true) {
    const sign = num < 0 ? '-' : isLeading ? '' : ' + ';
    const absNum = Math.abs(num);

    if (den === 1) {
      if (absNum === 1) return sign;
      return `${sign}${absNum}`;
    }
    return `${sign}<span class="frac"><span class="num">${absNum}</span><span class="den">${den}</span></span>`;
  }

  function renderExprHtml(expr, includePlusC = true) {
    if (!expr) return '';

    if (expr.kind === 'combo' && Array.isArray(expr.comboTerms)) {
      const parts = expr.comboTerms.map((term, idx) => renderSingleTermHtml(term, idx === 0));
      const suffix = includePlusC && expr.plusC ? ' + C' : '';
      return parts.join('') + suffix;
    }

    const core = renderSingleTermHtml(expr, true);
    const suffix = includePlusC && expr.plusC ? ' + C' : '';
    return core + suffix;
  }

  function renderSingleTermHtml(expr, isLeading = true) {
    const { kind, fn, num, den, inner, power } = expr;
    const signStr = num < 0 ? (isLeading ? '-' : ' - ') : (isLeading ? '' : ' + ');
    const absNum = Math.abs(num);
    const argStr = inner === 1 ? 'x' : `${inner}x`;

    if (kind === 'poly') {
      if (power === 0) {
        if (den === 1) return `${signStr}${absNum}`;
        return `${signStr}<span class="frac"><span class="num">${absNum}</span><span class="den">${den}</span></span>`;
      }
      const xPart = power === 1 ? 'x' : `x<sup>${power}</sup>`;
      if (den === 1) {
        const cStr = absNum === 1 ? '' : `${absNum}`;
        return `${signStr}${cStr}${xPart}`;
      }
      const numStr = absNum === 1 ? xPart : `${absNum}${xPart}`;
      return `${signStr}<span class="frac"><span class="num">${numStr}</span><span class="den">${den}</span></span>`;
    }

    if (kind === 'inv') {
      const denPart = power === 1 ? 'x' : `x<sup>${power}</sup>`;
      const denFull = den === 1 ? denPart : `${den}${denPart}`;
      return `${signStr}<span class="frac"><span class="num">${absNum}</span><span class="den">${denFull}</span></span>`;
    }

    if (kind === 'exp') {
      const expPart = inner === 1 ? 'e<sup>x</sup>' : `e<sup>${inner}x</sup>`;
      const prefix = formatCoeffPrefix(num, den, isLeading);
      return `${prefix}${expPart}`;
    }

    if (kind === 'ln_trig') {
      const prefix = formatCoeffPrefix(num, den, isLeading);
      if (fn === 'ln_x') return `${prefix}ln|x|`;
      if (fn === 'ln_cos') return `${prefix}ln|cos(${argStr})|`;
      if (fn === 'ln_sec') return `${prefix}ln|sec(${argStr})|`;
      if (fn === 'ln_sen') return `${prefix}ln|sen(${argStr})|`;
    }

    if (kind === 'trig') {
      const prefix = formatCoeffPrefix(num, den, isLeading);
      if (fn === 'sen') return `${prefix}sen(${argStr})`;
      if (fn === 'cos') return `${prefix}cos(${argStr})`;
      if (fn === 'tg') return `${prefix}tg(${argStr})`;
      if (fn === 'sec2') return `${prefix}sec<sup>2</sup>(${argStr})`;
      if (fn === 'sec') return `${prefix}sec(${argStr})`;
      if (fn === 'sec_tg') return `${prefix}sec(${argStr})·tg(${argStr})`;
      if (fn === 'cotg') return `${prefix}cotg(${argStr})`;
      if (fn === 'cosec2') return `${prefix}cosec<sup>2</sup>(${argStr})`;
      if (fn === 'cosec_cotg') return `${prefix}cosec(${argStr})·cotg(${argStr})`;
    }

    return '';
  }

  function computeDerivative(expr) {
    if (expr.kind === 'combo') {
      return createExpr({
        kind: 'combo',
        plusC: false,
        comboTerms: expr.comboTerms.map((t) => computeDerivative(t))
      });
    }

    const { kind, fn, num, den, inner, power } = expr;

    if (kind === 'trig') {
      if (fn === 'sen') return createExpr({ kind: 'trig', fn: 'cos', num: num * inner, den, inner });
      if (fn === 'cos') return createExpr({ kind: 'trig', fn: 'sen', num: -num * inner, den, inner });
      if (fn === 'tg') return createExpr({ kind: 'trig', fn: 'sec2', num: num * inner, den, inner });
      if (fn === 'sec') return createExpr({ kind: 'trig', fn: 'sec_tg', num: num * inner, den, inner });
      if (fn === 'cotg') return createExpr({ kind: 'trig', fn: 'cosec2', num: -num * inner, den, inner });
    }

    if (kind === 'poly') {
      return createExpr({ kind: 'poly', num: num * power, den, power: power - 1 });
    }

    if (kind === 'inv' && power === 1) {
      return createExpr({ kind: 'inv', num: -num, den, power: 2 });
    }

    if (kind === 'ln_trig' && fn === 'ln_x') {
      return createExpr({ kind: 'inv', num, den, power: 1 });
    }

    if (kind === 'exp') {
      return createExpr({ kind: 'exp', num: num * inner, den, inner });
    }

    return expr;
  }

  function computeIntegral(expr) {
    if (expr.kind === 'combo') {
      return createExpr({
        kind: 'combo',
        plusC: true,
        comboTerms: expr.comboTerms.map((t) => {
          const intTerm = computeIntegral(t);
          return { ...intTerm, plusC: false };
        })
      });
    }

    const { kind, fn, num, den, inner, power } = expr;

    if (kind === 'trig') {
      if (fn === 'sen') {
        return createExpr({ kind: 'trig', fn: 'cos', num: -num, den: den * inner, inner, plusC: true });
      }
      if (fn === 'cos') {
        return createExpr({ kind: 'trig', fn: 'sen', num, den: den * inner, inner, plusC: true });
      }
      if (fn === 'tg') {
        const useSecForm = Math.random() < 0.35;
        if (useSecForm) {
          return createExpr({ kind: 'ln_trig', fn: 'ln_sec', num, den: den * inner, inner, plusC: true });
        }
        return createExpr({ kind: 'ln_trig', fn: 'ln_cos', num: -num, den: den * inner, inner, plusC: true });
      }
      if (fn === 'sec2') {
        return createExpr({ kind: 'trig', fn: 'tg', num, den: den * inner, inner, plusC: true });
      }
      if (fn === 'sec_tg') {
        return createExpr({ kind: 'trig', fn: 'sec', num, den: den * inner, inner, plusC: true });
      }
      if (fn === 'cosec2') {
        return createExpr({ kind: 'trig', fn: 'cotg', num: -num, den: den * inner, inner, plusC: true });
      }
    }

    if (kind === 'poly') {
      return createExpr({ kind: 'poly', num, den: den * (power + 1), power: power + 1, plusC: true });
    }

    if (kind === 'inv') {
      if (power === 1) return createExpr({ kind: 'ln_trig', fn: 'ln_x', num, den, plusC: true });
      if (power === 2) return createExpr({ kind: 'inv', num: -num, den, power: 1, plusC: true });
    }

    if (kind === 'exp') {
      return createExpr({ kind: 'exp', num, den: den * inner, inner, plusC: true });
    }

    return { ...expr, plusC: true };
  }

  function buildDistractors(promptExpr, dir, correctExpr) {
    const candidates = [];
    const plusC = dir === 'volta';

    const pushUnique = (cand) => {
      if (!cand) return;
      const withC = { ...cand, plusC };
      if (areEquivalent(withC, correctExpr)) return;
      if (candidates.some((existing) => areEquivalent(existing, withC))) return;
      candidates.push(withC);
    };

    if (correctExpr.kind === 'combo' && Array.isArray(correctExpr.comboTerms)) {
      const [t1, t2] = correctExpr.comboTerms;
      pushUnique(createExpr({ kind: 'combo', plusC, comboTerms: [t1, { ...t2, num: -t2.num }] }));
      pushUnique(createExpr({ kind: 'combo', plusC, comboTerms: [{ ...t1, num: -t1.num }, t2] }));
      pushUnique(createExpr({ kind: 'combo', plusC, comboTerms: [{ ...t1, num: -t1.num }, { ...t2, num: -t2.num }] }));
      return candidates.slice(0, 3);
    }

    // 1. Inversão de sinal
    pushUnique(createExpr({ ...correctExpr, num: -correctExpr.num, plusC }));

    // 2. Confusão na Regra da Cadeia
    if (promptExpr.inner > 1) {
      const a = promptExpr.inner;
      if (dir === 'ida') {
        pushUnique(createExpr({ ...correctExpr, num: promptExpr.num * (correctExpr.num < 0 ? -1 : 1), den: 1, plusC }));
        pushUnique(createExpr({ ...correctExpr, num: promptExpr.num * (correctExpr.num < 0 ? -1 : 1), den: a, plusC }));
        pushUnique(createExpr({ ...correctExpr, num: -promptExpr.num * (correctExpr.num < 0 ? -1 : 1), den: 1, plusC }));
      } else {
        pushUnique(createExpr({ ...correctExpr, num: promptExpr.num * a * (correctExpr.num < 0 ? -1 : 1), den: 1, plusC }));
        pushUnique(createExpr({ ...correctExpr, num: promptExpr.num * (correctExpr.num < 0 ? -1 : 1), den: 1, plusC }));
        pushUnique(createExpr({ ...correctExpr, num: -promptExpr.num * a * (correctExpr.num < 0 ? -1 : 1), den: 1, plusC }));
      }
    }

    // 3. Confusão entre funções trigonométricas
    if (promptExpr.kind === 'trig') {
      const pNum = promptExpr.num;
      const pInner = promptExpr.inner;
      if (promptExpr.fn === 'tg' && dir === 'volta') {
        pushUnique(createExpr({ kind: 'trig', fn: 'sec2', num: pNum, den: pInner, inner: pInner, plusC: true }));
        pushUnique(createExpr({ kind: 'ln_trig', fn: 'ln_sen', num: pNum, den: pInner, inner: pInner, plusC: true }));
      }
      if (promptExpr.fn === 'tg' && dir === 'ida') {
        pushUnique(createExpr({ kind: 'trig', fn: 'sec_tg', num: pNum * pInner, den: 1, inner: pInner, plusC: false }));
        pushUnique(createExpr({ kind: 'ln_trig', fn: 'ln_cos', num: -pNum, den: 1, inner: pInner, plusC: false }));
      }
      const altFnMap = {
        sen: 'cos',
        cos: 'sen',
        sec2: 'sec_tg',
        sec_tg: 'sec2',
        sec: 'tg',
        cotg: 'cosec_cotg',
        cosec2: 'cotg'
      };
      const swappedFn = altFnMap[correctExpr.fn] || 'sen';
      pushUnique(createExpr({ ...correctExpr, fn: swappedFn, plusC }));
      pushUnique(createExpr({ ...correctExpr, fn: swappedFn, num: -correctExpr.num, plusC }));
    }

    if (promptExpr.kind === 'poly') {
      const p = promptExpr.power;
      const n = promptExpr.num;
      if (dir === 'ida') {
        pushUnique(createExpr({ kind: 'poly', num: n, den: p + 1, power: p + 1, plusC: false }));
        pushUnique(createExpr({ kind: 'poly', num: n, den: 1, power: Math.max(1, p - 1), plusC: false }));
        pushUnique(createExpr({ kind: 'poly', num: n * p, den: 1, power: p, plusC: false }));
      } else {
        pushUnique(createExpr({ kind: 'poly', num: n * p, den: 1, power: Math.max(0, p - 1), plusC: true }));
        pushUnique(createExpr({ kind: 'poly', num: n, den: 1, power: p + 1, plusC: true }));
        pushUnique(createExpr({ kind: 'poly', num: n * (p + 1), den: 1, power: p + 1, plusC: true }));
      }
    }

    if (promptExpr.kind === 'inv' || promptExpr.kind === 'ln_trig') {
      pushUnique(createExpr({ kind: 'inv', num: -promptExpr.num, den: 1, power: 2, plusC }));
      pushUnique(createExpr({ kind: 'inv', num: promptExpr.num, den: 1, power: 2, plusC }));
      pushUnique(createExpr({ kind: 'ln_trig', fn: 'ln_x', num: promptExpr.num, den: 1, plusC }));
      pushUnique(createExpr({ kind: 'ln_trig', fn: 'ln_x', num: -promptExpr.num, den: 1, plusC }));
    }

    if (promptExpr.kind === 'exp') {
      const a = promptExpr.inner;
      pushUnique(createExpr({ kind: 'exp', num: promptExpr.num, den: 1, inner: a, plusC }));
      pushUnique(createExpr({ kind: 'exp', num: promptExpr.num * a, den: 1, inner: a, plusC }));
      pushUnique(createExpr({ kind: 'exp', num: promptExpr.num, den: a, inner: a, plusC }));
      pushUnique(createExpr({ kind: 'exp', num: -promptExpr.num * a, den: 1, inner: a, plusC }));
    }

    let multFallback = 2;
    while (candidates.length < 3) {
      pushUnique(createExpr({ ...correctExpr, num: correctExpr.num * multFallback, plusC }));
      pushUnique(createExpr({ ...correctExpr, num: -correctExpr.num * multFallback, plusC }));
      multFallback += 1;
    }

    return candidates.slice(0, 3);
  }

  function buildFeedback(promptExpr, dir, correctExpr) {
    const promptHtml = renderExprHtml(promptExpr, false);
    const answerHtml = renderExprHtml(correctExpr, true);
    const opName = dir === 'ida' ? 'derivada' : 'integral';

    let tip = '';
    if (promptExpr.kind === 'trig') {
      const fn = promptExpr.fn;
      const hasChain = promptExpr.inner > 1;
      const a = promptExpr.inner;

      if (fn === 'sen' && dir === 'ida') {
        tip = hasChain
          ? `Seno vira +cosseno na derivação e multiplica pelo coeficiente interno (${a}).`
          : 'Sen(x) vira +cos(x) (sinal positivo!) na derivação.';
      } else if (fn === 'sen' && dir === 'volta') {
        tip = hasChain
          ? `A integral de sen(${a}x) ganha sinal negativo (-cos) e divide por ${a}.`
          : 'Atenção ao sinal: a integral de sen(x) é -cos(x) + C!';
      } else if (fn === 'cos' && dir === 'ida') {
        tip = hasChain
          ? `Cosseno ganha sinal negativo (-sen) ao derivar e multiplica por ${a}.`
          : 'Funções iniciadas com "CO" (cosseno) ganham sinal negativo (-) na derivada!';
      } else if (fn === 'cos' && dir === 'volta') {
        tip = hasChain
          ? `A antiderivada de cos(${a}x) é positiva (+sen) e divide por ${a}.`
          : 'Na integração, cos(x) volta para +sen(x) + C (sinal positivo!).';
      } else if (fn === 'tg' && dir === 'ida') {
        tip = hasChain
          ? `A derivada de tg(${a}x) é sec²(${a}x) multiplicada por ${a}.`
          : 'Par fundamental: a derivada de tg(x) é sec²(x).';
      } else if (fn === 'tg' && dir === 'volta') {
        tip = 'A integral de tg(u) é -ln|cos(u)| + C (equivalente a ln|sec(u)| + C).';
      } else if (fn === 'sec2' && dir === 'volta') {
        tip = 'Como a derivada de tg(x) é sec²(x), a integral de sec²(x) volta para tg(x) + C!';
      } else if (fn === 'sec' || fn === 'sec_tg') {
        tip = 'A derivada de sec(x) é sec(x)·tg(x), e sua integral faz o caminho inverso!';
      } else {
        tip = 'Nas co-funções (cotg, cosec), lembre-se sempre da troca de sinal negativo (-).';
      }
    } else if (promptExpr.kind === 'poly') {
      tip = dir === 'ida'
        ? 'Regra do Tombo: o expoente desce multiplicando e diminui 1 unidade.'
        : 'Regra da Potência na integral: soma 1 ao expoente e divide pelo novo expoente!';
    } else if (promptExpr.kind === 'combo') {
      tip = 'Resolva termo a termo aplicando a regra de sinal individual de cada função.';
    } else {
      tip = dir === 'ida'
        ? 'Lembre-se: d/dx[ln|x|] = 1/x, d/dx[1/x] = -1/x² e d/dx[eᵃˣ] = a·eᵃˣ.'
        : 'Lembre-se: ∫(1/x)dx = ln|x| + C e ∫eᵃˣdx = (1/a)eᵃˣ + C.';
    }

    const hitHeadline =
      dir === 'ida'
        ? `Isso! A derivada de ${promptHtml} é ${answerHtml}.`
        : `Boa! A antiderivada de ${promptHtml} é ${answerHtml}.`;

    const missHeadline =
      dir === 'ida'
        ? `Quase! A derivada correta de ${promptHtml} é ${answerHtml}.`
        : `Atenção: a ${opName} de ${promptHtml} é ${answerHtml}.`;

    return { hitHeadline, missHeadline, tip };
  }

  function generateQuestion({
    level = 1,
    dir = 'ida',
    topicFilter = 'all',
    recentSigs = [],
    weakFamily = null,
    optionsCount = 4,
    familyStats = null
  }) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    let masteredSenCos = false;
    if (familyStats && familyStats.sen && familyStats.cos) {
      const senTot = familyStats.sen.hits + familyStats.sen.misses;
      const cosTot = familyStats.cos.hits + familyStats.cos.misses;
      if (senTot + cosTot >= 4) {
        const acc = (familyStats.sen.hits + familyStats.cos.hits) / (senTot + cosTot);
        if (acc >= 0.78) masteredSenCos = true;
      }
    }

    const genBasicTrig = () => {
      const fns = ['sen', 'cos'];
      const fn = weakFamily && fns.includes(weakFamily) && Math.random() < 0.6 ? weakFamily : pick(fns);
      const sign = Math.random() < 0.25 ? -1 : 1;
      return {
        expr: createExpr({ kind: 'trig', fn, num: sign, den: 1, inner: 1 }),
        family: fn,
        tag: 'Básico • Seno e Cosseno'
      };
    };

    const genPureSenCosTg = () => {
      const fns = masteredSenCos ? ['sen', 'cos', 'tg', 'tg'] : ['sen', 'cos', 'tg'];
      const fn = weakFamily && ['sen', 'cos', 'tg'].includes(weakFamily) && Math.random() < 0.55 ? weakFamily : pick(fns);
      const sign = Math.random() < 0.2 ? -1 : 1;
      return {
        expr: createExpr({ kind: 'trig', fn, num: sign, den: 1, inner: 1 }),
        family: fn,
        tag: 'Trigonométricas • sen(x), cos(x), tg(x)'
      };
    };

    const genBasicPoly = () => {
      const powers = [1, 2, 3, 4];
      const p = pick(powers);
      const coeff = p === 2 && Math.random() < 0.4 ? 3 : 1;
      return {
        expr: createExpr({ kind: 'poly', num: coeff, den: 1, power: p }),
        family: 'poly',
        tag: 'Básico • Polinomial xⁿ'
      };
    };

    const genLevel2Trig = () => {
      if (dir === 'ida') {
        const fn = pick(['tg', 'tg', 'sec', 'sen', 'cos']);
        const sign = Math.random() < 0.25 ? -1 : 1;
        return {
          expr: createExpr({ kind: 'trig', fn, num: sign, den: 1, inner: 1 }),
          family: fn === 'sec' ? 'tg' : fn,
          tag: 'Trigonométricas • Tangente e Secante'
        };
      } else {
        const fn = pick(['tg', 'sec2', 'sec_tg', 'sen', 'cos']);
        const sign = Math.random() < 0.25 ? -1 : 1;
        return {
          expr: createExpr({ kind: 'trig', fn, num: sign, den: 1, inner: 1 }),
          family: fn === 'sec2' || fn === 'sec_tg' ? 'tg' : fn,
          tag: 'Trigonométricas • Tangente e Secante'
        };
      }
    };

    const genCoeffTrig = () => {
      const coeffs = [2, 3, 4, 5, -2, -3, -4];
      const c = pick(coeffs);
      const fns = dir === 'ida' ? ['sen', 'cos', 'tg'] : ['sen', 'cos', 'tg', 'sec2'];
      const fn = pick(fns);
      return {
        expr: createExpr({ kind: 'trig', fn, num: c, den: 1, inner: 1 }),
        family: fn === 'sec2' ? 'tg' : fn,
        tag: 'Coeficientes • k·f(x)'
      };
    };

    const genChainTrig = () => {
      const inners = [2, 3, 4];
      const a = pick(inners);
      const outerCoeffs = [1, 1, 2, 3, -1, -2];
      const k = pick(outerCoeffs);
      const fns = dir === 'ida' ? ['sen', 'cos', 'tg'] : ['sen', 'cos', 'tg', 'sec2'];
      const fn = pick(fns);
      return {
        expr: createExpr({ kind: 'trig', fn, num: k, den: 1, inner: a }),
        family: 'chain',
        tag: 'Regra da Cadeia • f(ax)'
      };
    };

    const genMasterLevel = () => {
      const roll = Math.random();
      if (roll < 0.38) {
        const c1 = pick([1, 2, 3, -1, -2]);
        const c2 = pick([1, 2, 3, -1, -2]);
        const t1 = createExpr({ kind: 'trig', fn: 'sen', num: c1, den: 1, inner: 1 });
        const t2 = createExpr({ kind: 'trig', fn: 'cos', num: c2, den: 1, inner: 1 });
        return {
          expr: createExpr({ kind: 'combo', comboTerms: [t1, t2] }),
          family: 'trig_combo',
          tag: 'Mestre • Combinação Trigonométrica'
        };
      } else if (roll < 0.68) {
        return genChainTrig();
      } else if (roll < 0.85) {
        if (Math.random() < 0.5) {
          const a = pick([1, 2, 3]);
          return {
            expr: createExpr({ kind: 'exp', num: pick([1, 2, -1]), den: 1, inner: a }),
            family: 'exp_ln',
            tag: 'Mestre • Exponencial eᵃˣ'
          };
        } else {
          return {
            expr: createExpr({ kind: 'inv', num: pick([1, -1, 2]), den: 1, power: 1 }),
            family: 'exp_ln',
            tag: 'Mestre • Inversa 1/x e ln|x|'
          };
        }
      } else {
        const fn = dir === 'ida' ? 'cotg' : 'cosec2';
        return {
          expr: createExpr({ kind: 'trig', fn, num: pick([1, -1, 2]), den: 1, inner: 1 }),
          family: 'tg',
          tag: 'Mestre • Co-funções'
        };
      }
    };

    for (let attempt = 0; attempt < 18; attempt++) {
      let generated;
      if (topicFilter === 'trig_basic') {
        generated = genPureSenCosTg();
      } else if (topicFilter === 'trig' || topicFilter === 'trig_adapt') {
        const subRoll = Math.random();
        if (weakFamily === 'chain' && subRoll < 0.45) {
          generated = genChainTrig();
        } else if (masteredSenCos) {
          if (subRoll < 0.28) generated = genPureSenCosTg();
          else if (subRoll < 0.65) generated = genCoeffTrig();
          else generated = genChainTrig();
        } else {
          if (subRoll < 0.5) generated = genPureSenCosTg();
          else if (subRoll < 0.82) generated = genCoeffTrig();
          else generated = genChainTrig();
        }
      } else if (topicFilter === 'trig_coeff') {
        generated = genCoeffTrig();
      } else if (topicFilter === 'trig_chain') {
        generated = genChainTrig();
      } else if (topicFilter === 'poly') {
        const p = pick([1, 2, 3, 4, 5]);
        const c = pick([1, 2, 3, 4, -2]);
        generated = {
          expr: createExpr({ kind: 'poly', num: c, den: 1, power: p }),
          family: 'poly',
          tag: 'Polinomiais • k·xⁿ'
        };
      } else {
        if (level === 1) {
          generated = Math.random() < 0.75 ? genBasicTrig() : genBasicPoly();
        } else if (level === 2) {
          generated = genLevel2Trig();
        } else if (level === 3) {
          generated = genCoeffTrig();
        } else if (level === 4) {
          generated = genChainTrig();
        } else {
          generated = genMasterLevel();
        }
      }

      const promptExpr = generated.expr;
      const correctExpr = dir === 'ida' ? computeDerivative(promptExpr) : computeIntegral(promptExpr);
      const qSig = `${dir}:${getCanonicalSignature(promptExpr)}`;

      if (!recentSigs.includes(qSig) || attempt === 17) {
        const distractors = buildDistractors(promptExpr, dir, correctExpr).slice(0, Math.max(1, optionsCount - 1));
        const allOptions = [correctExpr, ...distractors];

        for (let i = allOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
        }

        const feedback = buildFeedback(promptExpr, dir, correctExpr);

        return {
          sig: qSig,
          dir,
          level,
          family: generated.family,
          tag: generated.tag,
          promptExpr,
          correctExpr,
          options: allOptions,
          feedback
        };
      }
    }
  }

  return {
    createExpr,
    areEquivalent,
    renderExprHtml,
    computeDerivative,
    computeIntegral,
    generateQuestion
  };
})();
