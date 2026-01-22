const palavrasDisponiveis = ["NEQUIOCA", "TREMILICOS", "ACOGUEIRO", "COQUELUCHE", "LAFUFU", "MACANETA", "CEPIBOLA", "TOFREU", "CYBEROVOS"];
let palavrasUsadas = [];
let palavraSecreta = palavrasDisponiveis[Math.floor(Math.random() * palavrasDisponiveis.length)].toUpperCase();
palavrasUsadas.push(palavraSecreta);
let chute = '';let letterStatuses = {};
document.addEventListener('DOMContentLoaded', () => {
	const maxLetters = 10;
	const lettersEl = document.querySelector('.letters');
	const keyboardEl = document.querySelector('.keyboard');
	const container = document.getElementById('resultadosContainer');

	function mudarPalavra() {
		palavraSecreta = palavrasDisponiveis[Math.floor(Math.random() * palavrasDisponiveis.length)].toUpperCase();
		chute = '';
		container.innerHTML = '';
		render();
	}

	function render() {
		lettersEl.innerHTML = '';
		// render each letter
		for (let ch of chute) {
			const d = document.createElement('div');
			d.className = 'letter';
			d.textContent = ch;
			lettersEl.appendChild(d);
		}

		// render cursor if space left
		const cursor = document.createElement('div');
		cursor.className = 'cursor active';
		if (chute.length >= maxLetters) cursor.classList.remove('active');
		lettersEl.appendChild(cursor);
	}

	function handleKey(key) {
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
				chute = '';
				render();
			}
			return;
		}

		// accept only single letters
		if (key.length === 1 && /[a-zA-ZÀ-ÿ]/.test(key)) {
			if (chute.length < maxLetters) {
				chute += key.toUpperCase();
				render();
			}
		}
	}

	// physical keyboard
	document.addEventListener('keydown', (e) => {
		e.preventDefault();
		handleKey(e.key);
	});

	// build virtual keyboard
	const rows = [
		'QWERTYUIOP'.split(''),
		[...'ASDFGHJKL'.split(''), 'Backspace'],
		[...'ZXCVBNM'.split(''), 'Enter']
	];

	rows.forEach(row => {
		const rowEl = document.createElement('div');
		rowEl.className = 'kb-row';
		row.forEach(k => {
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


});

// --- LÓGICA DE PROCESSAMENTO COM 3 PRIORIDADES ---
// Prioridade 1: Maior sequência (bloco verde)
// Prioridade 2: Outras sequências em amarelo
// Prioridade 3: Ordem da letra na palavra secreta (em caso de empate)

function processarChute(chute, secreta) {
    let res = new Array(chute.length).fill('cinza');
    let inv = {};
    for (let l of secreta) inv[l] = (inv[l] || 0) + 1;
    
    // --- FASE 1: ENCONTRAR TODAS AS SEQUÊNCIAS RECURSIVAMENTE ---
    let sequenciasEncontradas = [];
    encontrarTodasSequencias(chute, secreta, res, inv, sequenciasEncontradas);
    
    // --- FASE 2: ORDENAR SEQUÊNCIAS PELA POSIÇÃO NA PALAVRA CHAVE ---
    sequenciasEncontradas.sort((a, b) => a.startSecreta - b.startSecreta);
    
    // --- FASE 3: VALIDAR SEQUÊNCIAS COM ORDEM PROGRESSIVA ---
    let proximaPosicaoEsperada = 0; // Próxima posição esperada na palavra chave
    let proximaPosicaoChute = 0;    // Próxima posição esperada no chute
    let sequenciasValidas = [];     // Sequências que mantêm a ordem
    
    for (let seq of sequenciasEncontradas) {
        // Verificar se essa sequência mantém a ordem
        if (seq.startSecreta >= proximaPosicaoEsperada && seq.startChute >= proximaPosicaoChute) {
            sequenciasValidas.push({ ...seq, valida: true });
            proximaPosicaoEsperada = seq.endSecreta + 1;
            proximaPosicaoChute = seq.endChute + 1;
        } else {
            sequenciasValidas.push({ ...seq, valida: false });
        }
    }
    
    // --- FASE 4: MARCAR SEQUÊNCIAS NO RESULTADO ---
    for (let seq of sequenciasValidas) {
        let cor = seq.valida ? 'verde-bloco' : 'amarelo-bloco';
        for (let m = 0; m < seq.length; m++) {
            res[seq.startChute + m] = cor;
        }
    }
    
    // --- FASE 5: PROCESSAR LETRAS RESTANTES RESPEITANDO GAP ENTRE SEQUÊNCIAS ---
    // Vamos permitir que letras que apareçam antes de um bloco validado também
    // sejam VERDE se estiverem corretamente posicionadas na janela entre
    // sequências validadas (ordem progressiva).
    const validSeqs = sequenciasValidas.filter(s => s.valida).sort((a,b) => a.startSecreta - b.startSecreta);
    let svIdx = 0; // índice da próxima sequência validada
    let currSecretPos = 0;
    let currChutePos = 0;

    for (let i = 0; i < chute.length; i++) {
        // Se já foi marcado (parte de bloco), avançar ponteiros quando encontrar
        // o início da próxima sequência validada.
        if (res[i] !== 'cinza') {
            if (svIdx < validSeqs.length && i === validSeqs[svIdx].startChute) {
                currSecretPos = validSeqs[svIdx].endSecreta + 1;
                currChutePos = validSeqs[svIdx].endChute + 1;
                svIdx++;
            }
            continue;
        }

        let letra = chute[i];
        if ((inv[letra] || 0) <= 0) continue; // sem cópia disponível

        // limite superior na palavra secreta: antes da próxima sequência validada
        let upperSecretBound = (svIdx < validSeqs.length) ? validSeqs[svIdx].startSecreta - 1 : secreta.length - 1;

        // procurar ocorrência da letra entre currSecretPos e upperSecretBound (incl.)
        let posSecret = -1;
        for (let j = currSecretPos; j <= upperSecretBound; j++) {
            if (secreta[j] === letra) {
                posSecret = j;
                break;
            }
        }

        if (posSecret !== -1 && i >= currChutePos) {
            // Está na janela correta -> VERDE
            res[i] = 'verde';
            currSecretPos = posSecret + 1;
            currChutePos = i + 1;
            inv[letra]--;
        } else {
            // marcar AMARELO se existir a letra em qualquer posição restante da secreta
            let existe = false;
            for (let j = 0; j < secreta.length; j++) {
                if (secreta[j] === letra && (inv[letra] || 0) > 0) { existe = true; break; }
            }
            if (existe) {
                res[i] = 'amarelo';
                inv[letra]--;
            }
        }
    }

    return res;
}

// Função recursiva que encontra todas as sequências de 2+ letras
function encontrarTodasSequencias(chute, secreta, res, inv, sequenciasEncontradas) {
    let maiorSeq = null;
    
    // Encontrar a maior sequência de 2+ letras não processada
    for (let i = 0; i < chute.length; i++) {
        if (res[i] !== 'cinza') continue;
        
        for (let j = 0; j < secreta.length; j++) {
            let k = 0;
            while (i+k < chute.length && j+k < secreta.length && 
                   chute[i+k] === secreta[j+k] && res[i+k] === 'cinza') k++;
            
            if (k >= 2) {
                // Verificar se as letras estão disponíveis no inventário
                let letrasDisponiveis = true;
                for (let m = 0; m < k; m++) {
                    if ((inv[chute[i+m]] || 0) <= 0) {
                        letrasDisponiveis = false;
                        break;
                    }
                }
                
                if (letrasDisponiveis && (!maiorSeq || k > maiorSeq.length)) {
                    maiorSeq = {
                        sub: chute.substring(i, i+k),
                        startChute: i,
                        endChute: i+k-1,
                        startSecreta: j,
                        endSecreta: j+k-1,
                        length: k
                    };
                }
            }
        }
    }
    
    // Se encontrou sequência, marcar e continuar recursivamente
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

    // Verifica vitória exata (opcional, para estilização extra)
    const vitoria = (chute === palavraSecreta);
    if (vitoria) row.classList.add('vitoria');

    for (let i = 0; i < chute.length; i++) {
        const tile = document.createElement('div');
        
        // 1. Define a classe base de cor (verde, amarelo, cinza)
        let statusBase = resultado[i];
        if (statusBase.includes('verde')) statusBase = 'verde';
        else if (statusBase.includes('amarelo')) statusBase = 'amarelo';
        
        tile.className = `letra-tile ${statusBase}`;
        tile.textContent = chute[i];
        
        // Se não for vitória (onde tudo fica verde bonito), aplicamos a lógica de pílulas
        if (!vitoria) {
            
            // --- LÓGICA UNIFICADA PARA BLOCOS (VERDES E AMARELOS) ---
            if (resultado[i].endsWith('-bloco')) {
                // Pega a cor prefixo ('verde' ou 'amarelo')
                const cor = resultado[i].split('-')[0]; 

                // A. Verifica vizinhos pelo status (são da mesma cor/tipo?)
                const isPrevSame = (i > 0 && resultado[i-1] === resultado[i]);
                const isNextSame = (i < chute.length - 1 && resultado[i+1] === resultado[i]);

                // B. Verifica CONECTIVIDADE REAL (O par existe na palavra secreta?)
                // Se o vizinho é da mesma cor, formamos a sílaba (ex: "AN") e buscamos na secreta.
                const parDireita = isNextSame ? (chute[i] + chute[i+1]) : '';
                const parEsquerda = isPrevSame ? (chute[i-1] + chute[i]) : '';

                const conectaDireita = isNextSame && palavraSecreta.includes(parDireita);
                const conectaEsquerda = isPrevSame && palavraSecreta.includes(parEsquerda);

                // C. Aplica as classes de borda (CSS)
                
                // Casos Especiais de posição absoluta (apenas para Verde)
                const isFirstLetterMatch = (i === 0 && chute[0] === palavraSecreta[0]);
                const isLastLetterMatch = (i === chute.length -1 && chute[i] === palavraSecreta[palavraSecreta.length -1]);

                if (cor === 'verde' && isFirstLetterMatch && conectaDireita) {
                    tile.classList.add('verde-inicial-seq');
                }
                else if (cor === 'verde' && isLastLetterMatch && conectaEsquerda) {
                    tile.classList.add('verde-final-seq'); 
                }
                // Casos Gerais de Pílula (Funciona para Verde e Amarelo)
                else if (!conectaEsquerda && conectaDireita) {
                    tile.classList.add(`${cor}-inicio`); // Ex: amarelo-inicio
                }
                else if (conectaEsquerda && conectaDireita) {
                    tile.classList.add(`${cor}-meio`);   // Ex: verde-meio
                }
                else if (conectaEsquerda && !conectaDireita) {
                    tile.classList.add(`${cor}-fim`);    // Ex: amarelo-fim
                }
                else {
                    tile.classList.add(`${cor}-unico`);  // Ex: verde-unico
                }
            } 
            
            // --- LÓGICA PARA LETRAS ISOLADAS (VERDES OU AMARELAS NÃO-BLOCO) ---
            else if (resultado[i] === 'verde' || resultado[i] === 'amarelo') {
                const cor = resultado[i];
                
                if (cor === 'verde' && i === 0 && chute[0] === palavraSecreta[0]) {
                    tile.classList.add('verde-inicial');
                }
                else if (cor === 'verde' && i === chute.length -1 && chute[i] === palavraSecreta[palavraSecreta.length -1]) {
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
        // Update only if better: right > place > wrong > available
        let priorities = { 'right': 4, 'place': 3, 'wrong': 2, 'available': 1 };
        if (priorities[newStatus] > priorities[current]) {
            letterStatuses[letter] = newStatus;
        }
    }
    // Update the buttons
    document.querySelectorAll('.key').forEach(btn => {
        let key = btn.dataset.key;
        if (key && key.length === 1) {
            let status = letterStatuses[key] || 'available';
            btn.classList.remove('right', 'place', 'wrong', 'available');
            btn.classList.add(status);
        }
    });
}