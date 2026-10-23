const palavrasDisponiveis = ["TREZE", "LULA", "EXERCITO", "DANONE", "ESTRELA", "DEMOCRACIA", "SOBERANIA", "TRABALHADOR", "ANTOMIMIA", "EDUCACAO", "LUFFY"];
const STORAGE_WORDS = 'palavrasUsadas';
const STORAGE_CURRENT = 'palavraSecretaAtual';

let palavrasUsadas = JSON.parse(localStorage.getItem(STORAGE_WORDS) || '[]').map((p) => String(p).toUpperCase());
let palavraSecreta = localStorage.getItem(STORAGE_CURRENT) || '';
let chute = '';
let letterStatuses = {};
let jogoBloqueado = false;
let novoJogoBtn = null;

function salvarPalavrasUsadas() {
    localStorage.setItem(STORAGE_WORDS, JSON.stringify(palavrasUsadas));
}

function normalizarPalavrasUsadas() {
    palavrasUsadas = [...new Set(palavrasUsadas.map((p) => String(p).toUpperCase()))];
    salvarPalavrasUsadas();
}

function escolherNovaPalavra() {
    normalizarPalavrasUsadas();

    let restantes = palavrasDisponiveis.filter((p) => !palavrasUsadas.includes(p.toUpperCase()));

    if (restantes.length === 0) {
        palavrasUsadas = [];
        salvarPalavrasUsadas();
        restantes = [...palavrasDisponiveis];
    }

    const index = Math.floor(Math.random() * restantes.length);
    palavraSecreta = restantes[index].toUpperCase();

    if (!palavrasUsadas.includes(palavraSecreta)) {
        palavrasUsadas.push(palavraSecreta);
        salvarPalavrasUsadas();
    }

    localStorage.setItem(STORAGE_CURRENT, palavraSecreta);
}

function mostrarBotaoNovoJogo() {
    if (!novoJogoBtn) return;
    novoJogoBtn.textContent = 'Novo jogo';
    novoJogoBtn.classList.remove('hidden');
}

function esconderBotaoNovoJogo() {
    if (!novoJogoBtn) return;
    novoJogoBtn.classList.add('hidden');
}

function limparTeclado() {
    letterStatuses = {};
    document.querySelectorAll('.key').forEach((btn) => {
        btn.classList.remove('right', 'place', 'wrong', 'available');
        btn.classList.add('available');
    });
}

function reiniciarJogo() {
    chute = '';
    jogoBloqueado = false;
    esconderBotaoNovoJogo();

    const container = document.getElementById('resultadosContainer');
    if (container) container.innerHTML = '';

    limparTeclado();
    escolherNovaPalavra();
    render();
}

if (!palavraSecreta || !palavrasDisponiveis.includes(palavraSecreta)) {
    escolherNovaPalavra();
} else if (!palavrasUsadas.includes(palavraSecreta)) {
    palavrasUsadas.push(palavraSecreta);
    salvarPalavrasUsadas();
}

document.addEventListener('DOMContentLoaded', () => {
    const maxLetters = 10;
    const lettersEl = document.querySelector('.letters');
    const keyboardEl = document.querySelector('.keyboard');
    const container = document.getElementById('resultadosContainer');
    novoJogoBtn = document.getElementById('novoJogoBtn');

    function render() {
        lettersEl.innerHTML = '';

        for (let ch of chute) {
            const d = document.createElement('div');
            d.className = 'letter';
            d.textContent = ch;
            lettersEl.appendChild(d);
        }

        const cursor = document.createElement('div');
        cursor.className = 'cursor active';
        if (chute.length >= maxLetters) cursor.classList.remove('active');
        lettersEl.appendChild(cursor);
    }

    function handleKey(key) {
        if (jogoBloqueado) return;

        if (key === 'Backspace') {
            chute = chute.slice(0, -1);
            render();
            return;
        }

        if (key === 'Enter') {
            if (chute.length > 0) {
                const resultado = processarChute(chute, palavraSecreta);

                renderizar(chute, resultado);
                updateKeyboard(chute, resultado);

                if (chute === palavraSecreta) {
                    jogoBloqueado = true;
                    mostrarBotaoNovoJogo();
                    return;
                }

                chute = '';
                render();
            }
            return;
        }

        if (key.length === 1 && /[a-zA-ZÀ-ÿ]/.test(key)) {
            if (chute.length < maxLetters) {
                chute += key.toUpperCase();
                render();
            }
        }
    }

    document.addEventListener('keydown', (e) => {
        e.preventDefault();
        handleKey(e.key);
    });

    const rows = [
        'QWERTYUIOP'.split(''),
        [...'ASDFGHJKL'.split(''), 'Backspace'],
        [...'ZXCVBNM'.split(''), 'Enter']
    ];

    rows.forEach((row) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'kb-row';

        row.forEach((k) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'key available';
            btn.textContent = k === 'Backspace' ? '⌫' : k;
            btn.dataset.key = k === 'Backspace' ? 'Backspace' : (k === 'Enter' ? 'Enter' : k);

            btn.addEventListener('click', () => handleKey(btn.dataset.key));
            rowEl.appendChild(btn);
        });

        keyboardEl.appendChild(rowEl);
    });

    if (novoJogoBtn) {
        novoJogoBtn.addEventListener('click', () => {
            reiniciarJogo();
        });
    }

    render();
});

function processarChute(chute, secreta) {
    let res = new Array(chute.length).fill('cinza');
    let inv = {};
    for (let l of secreta) inv[l] = (inv[l] || 0) + 1;

    let sequenciasEncontradas = [];
    encontrarTodasSequencias(chute, secreta, res, inv, sequenciasEncontradas);

    sequenciasEncontradas.sort((a, b) => a.startSecreta - b.startSecreta);

    let proximaPosicaoEsperada = 0;
    let proximaPosicaoChute = 0;
    let sequenciasValidas = [];

    for (let seq of sequenciasEncontradas) {
        if (seq.startSecreta >= proximaPosicaoEsperada && seq.startChute >= proximaPosicaoChute) {
            sequenciasValidas.push({ ...seq, valida: true });
            proximaPosicaoEsperada = seq.endSecreta + 1;
            proximaPosicaoChute = seq.endChute + 1;
        } else {
            sequenciasValidas.push({ ...seq, valida: false });
        }
    }

    for (let seq of sequenciasValidas) {
        let cor = seq.valida ? 'verde-bloco' : 'amarelo-bloco';
        for (let m = 0; m < seq.length; m++) {
            res[seq.startChute + m] = cor;
        }
    }

    const validSeqs = sequenciasValidas.filter((s) => s.valida).sort((a, b) => a.startSecreta - b.startSecreta);
    let svIdx = 0;
    let currSecretPos = 0;
    let currChutePos = 0;

    for (let i = 0; i < chute.length; i++) {
        if (res[i] !== 'cinza') {
            if (svIdx < validSeqs.length && i === validSeqs[svIdx].startChute) {
                currSecretPos = validSeqs[svIdx].endSecreta + 1;
                currChutePos = validSeqs[svIdx].endChute + 1;
                svIdx++;
            }
            continue;
        }

        let letra = chute[i];
        if ((inv[letra] || 0) <= 0) continue;

        let upperSecretBound = (svIdx < validSeqs.length) ? validSeqs[svIdx].startSecreta - 1 : secreta.length - 1;

        let posSecret = -1;
        for (let j = currSecretPos; j <= upperSecretBound; j++) {
            if (secreta[j] === letra) {
                posSecret = j;
                break;
            }
        }

        if (posSecret !== -1 && i >= currChutePos) {
            res[i] = 'verde';
            currSecretPos = posSecret + 1;
            currChutePos = i + 1;
            inv[letra]--;
        } else {
            let existe = false;
            for (let j = 0; j < secreta.length; j++) {
                if (secreta[j] === letra && (inv[letra] || 0) > 0) {
                    existe = true;
                    break;
                }
            }
            if (existe) {
                res[i] = 'amarelo';
                inv[letra]--;
            }
        }
    }

    return res;
}

function encontrarTodasSequencias(chute, secreta, res, inv, sequenciasEncontradas) {
    let maiorSeq = null;

    for (let i = 0; i < chute.length; i++) {
        if (res[i] !== 'cinza') continue;

        for (let j = 0; j < secreta.length; j++) {
            let k = 0;
            while (i + k < chute.length && j + k < secreta.length &&
                chute[i + k] === secreta[j + k] && res[i + k] === 'cinza') k++;

            if (k >= 2) {
                let letrasDisponiveis = true;
                for (let m = 0; m < k; m++) {
                    if ((inv[chute[i + m]] || 0) <= 0) {
                        letrasDisponiveis = false;
                        break;
                    }
                }

                if (letrasDisponiveis && (!maiorSeq || k > maiorSeq.length)) {
                    maiorSeq = {
                        sub: chute.substring(i, i + k),
                        startChute: i,
                        endChute: i + k - 1,
                        startSecreta: j,
                        endSecreta: j + k - 1,
                        length: k
                    };
                }
            }
        }
    }

    if (maiorSeq) {
        for (let m = 0; m < maiorSeq.length; m++) {
            res[maiorSeq.startChute + m] = 'verde-bloco';
            inv[maiorSeq.sub[m]]--;
        }
        sequenciasEncontradas.push(maiorSeq);
        encontrarTodasSequencias(chute, secreta, res, inv, sequenciasEncontradas);
    }
}

function renderizar(chute, resultado) {
    const container = document.getElementById('resultadosContainer');
    const row = document.createElement('div');
    row.className = 'chute-row';

    const vitoria = (chute === palavraSecreta);
    if (vitoria) row.classList.add('vitoria');

    for (let i = 0; i < chute.length; i++) {
        const tile = document.createElement('div');

        let statusBase = resultado[i];
        if (statusBase.includes('verde')) statusBase = 'verde';
        else if (statusBase.includes('amarelo')) statusBase = 'amarelo';

        tile.className = `letra-tile ${statusBase}`;
        tile.textContent = chute[i];

        if (!vitoria) {
            if (resultado[i].endsWith('-bloco')) {
                const cor = resultado[i].split('-')[0];

                const isPrevSame = (i > 0 && resultado[i - 1] === resultado[i]);
                const isNextSame = (i < chute.length - 1 && resultado[i + 1] === resultado[i]);

                const parDireita = isNextSame ? (chute[i] + chute[i + 1]) : '';
                const parEsquerda = isPrevSame ? (chute[i - 1] + chute[i]) : '';

                const conectaDireita = isNextSame && palavraSecreta.includes(parDireita);
                const conectaEsquerda = isPrevSame && palavraSecreta.includes(parEsquerda);

                const isFirstLetterMatch = (i === 0 && chute[0] === palavraSecreta[0]);
                const isLastLetterMatch = (i === chute.length - 1 && chute[i] === palavraSecreta[palavraSecreta.length - 1]);

                if (cor === 'verde' && isFirstLetterMatch && conectaDireita) {
                    tile.classList.add('verde-inicial-seq');
                } else if (cor === 'verde' && isLastLetterMatch && conectaEsquerda) {
                    tile.classList.add('verde-final-seq');
                } else if (!conectaEsquerda && conectaDireita) {
                    tile.classList.add(`${cor}-inicio`);
                } else if (conectaEsquerda && conectaDireita) {
                    tile.classList.add(`${cor}-meio`);
                } else if (conectaEsquerda && !conectaDireita) {
                    tile.classList.add(`${cor}-fim`);
                } else {
                    tile.classList.add(`${cor}-unico`);
                }
            } else if (resultado[i] === 'verde' || resultado[i] === 'amarelo') {
                const cor = resultado[i];

                if (cor === 'verde' && i === 0 && chute[0] === palavraSecreta[0]) {
                    tile.classList.add('verde-inicial');
                } else if (cor === 'verde' && i === chute.length - 1 && chute[i] === palavraSecreta[palavraSecreta.length - 1]) {
                    tile.classList.add('verde-final');
                } else {
                    tile.classList.add(`${cor}-unico`);
                }
            }
        }

        row.appendChild(tile);
    }

    container.appendChild(row);
}

function updateKeyboard(chute, resultado) {
    for (let i = 0; i < chute.length; i++) {
        let letter = chute[i];
        let status = resultado[i];
        let current = letterStatuses[letter] || 'available';
        let newStatus;

        if (status.includes('verde')) {
            newStatus = 'right';
        } else if (status.includes('amarelo')) {
            newStatus = 'place';
        } else {
            newStatus = 'wrong';
        }

        let priorities = { 'right': 4, 'place': 3, 'wrong': 2, 'available': 1 };
        if (priorities[newStatus] > priorities[current]) {
            letterStatuses[letter] = newStatus;
        }
    }

    document.querySelectorAll('.key').forEach((btn) => {
        let key = btn.dataset.key;
        if (key && key.length === 1) {
            let status = letterStatuses[key] || 'available';
            btn.classList.remove('right', 'place', 'wrong', 'available');
            btn.classList.add(status);
        }
    });
}
