class SimonGame {
    constructor() {
        // Inicializar variáveis do jogo
        this.sequence = [];
        this.playerSequence = [];
        this.score = 0;
        this.isPlaying = false;
        this.audioEnabled = false;
        this.currentDifficulty = null;

        // Configurações de velocidade para cada dificuldade (em milissegundos)
        this.speeds = {
            facil: { sequenceSpeed: 1000, buttonActiveTime: 500 },
            medio: { sequenceSpeed: 600, buttonActiveTime: 300 },
            dificil: { sequenceSpeed: 300, buttonActiveTime: 150 }
        };

        // Elementos do DOM
        if (!this.initializeDOMElements()) return;
        
        // Configuração do sistema de áudio
        this.initializeAudioSystem();
        
        // Adicionar event listeners
        this.setupEventListeners();
    }

    initializeDOMElements() {
        this.buttons = document.querySelectorAll('.btn');
        this.startButton = document.querySelector('.start-btn');
        this.scoreDisplay = document.querySelector('.score span');
        this.difficultySelect = document.querySelector('#difficulty');
        this.messageOverlay = document.querySelector('#messageOverlay');
        this.messageTitle = document.querySelector('#messageTitle');
        this.messageText = document.querySelector('#messageText');
        this.messageDetail = document.querySelector('#messageDetail');
        this.finalScore = document.querySelector('#finalScore');
        this.playAgainBtn = document.querySelector('#playAgainBtn');
        this.bgMusicToggle = document.querySelector('#bgMusic');
        this.musicVolume = document.querySelector('#musicVolume');
        this.soundVolume = document.querySelector('#soundVolume');

        // Verificar se todos os elementos foram encontrados
        const elements = [
            this.buttons, this.startButton, this.scoreDisplay, this.difficultySelect,
            this.messageOverlay, this.messageTitle, this.messageText, this.messageDetail,
            this.finalScore, this.playAgainBtn, this.bgMusicToggle, this.musicVolume,
            this.soundVolume
        ];

        if (elements.some(el => !el)) {
            console.error('Erro: Alguns elementos do DOM não foram encontrados');
            alert('Erro ao inicializar o jogo. Por favor, recarregue a página.');
            return false;
        }

        return true;
    }

    initializeAudioSystem() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Configurações dos sons para cada cor
            this.sounds = {
                green: { frequency: 392.0 }, // Sol
                red: { frequency: 329.6 },   // Mi
                yellow: { frequency: 261.6 }, // Dó
                blue: { frequency: 440.0 }   // Lá
            };

            // Configurar música de fundo
            this.setupBackgroundMusic();
            
            this.audioEnabled = true;
        } catch (error) {
            console.error('Erro ao inicializar o sistema de áudio:', error);
            this.disableAudioControls();
        }
    }

    disableAudioControls() {
        this.audioEnabled = false;
        this.bgMusicToggle.disabled = true;
        this.musicVolume.disabled = true;
        this.soundVolume.disabled = true;
        alert('Seu navegador não suporta o sistema de áudio. O jogo funcionará sem som.');
    }

    setupEventListeners() {
        // Event listeners do jogo
        this.startButton.addEventListener('click', () => this.startGame());
        this.buttons.forEach(btn => {
            btn.addEventListener('click', () => this.handlePlayerClick(btn));
        });
        this.playAgainBtn.addEventListener('click', () => {
            this.hideMessage();
            this.startGame();
        });

        // Event listeners de áudio
        if (this.audioEnabled) {
            this.bgMusicToggle.addEventListener('change', () => this.toggleBackgroundMusic());
            this.musicVolume.addEventListener('input', () => this.updateMusicVolume());
            this.soundVolume.addEventListener('input', () => this.updateSoundVolume());
        }

        // Event listener para mudança de dificuldade durante o jogo
        this.difficultySelect.addEventListener('change', () => {
            if (this.isPlaying) {
                if (confirm('Mudar a dificuldade reiniciará o jogo. Deseja continuar?')) {
                    this.startGame();
                } else {
                    this.difficultySelect.value = this.currentDifficulty;
                }
            }
        });
    }

    setupBackgroundMusic() {
        this.musicGain = this.audioContext.createGain();
        this.notes = [];
        this.currentNoteIndex = 0;
        
        // Melodia inspirada no estilo de Ward (notas em Hz)
        this.melody = [
            // Primeira parte (misteriosa)
            { note: 246.94, duration: 1.5, type: 'sine' },     // Si
            { note: 293.66, duration: 1.0, type: 'triangle' }, // Ré
            { note: 329.63, duration: 2.0, type: 'sine' },     // Mi
            { note: 392.00, duration: 1.5, type: 'triangle' }, // Sol
            // Segunda parte (atmosférica)
            { note: 440.00, duration: 1.0, type: 'sine' },     // Lá
            { note: 493.88, duration: 2.0, type: 'triangle' }, // Si
            { note: 440.00, duration: 1.5, type: 'sine' },     // Lá
            // Parte experimental
            { note: 329.63, duration: 0.5, type: 'square' },   // Mi (efeito)
            { note: 293.66, duration: 1.0, type: 'sine' },     // Ré
            { note: 246.94, duration: 2.0, type: 'triangle' }  // Si
        ];

        // Configurar volume inicial
        const initialVolume = this.musicVolume.value / 100 * 0.05;
        this.musicGain.gain.setValueAtTime(initialVolume, this.audioContext.currentTime);
        this.musicGain.connect(this.audioContext.destination);

        // Criar processador de efeitos
        this.createEffects();

        // Iniciar a reprodução da melodia
        this.playNextNote();
    }

    createEffects() {
        // Delay para efeito de eco
        this.delay = this.audioContext.createDelay();
        this.delay.delayTime.value = 0.4;
        
        this.delayGain = this.audioContext.createGain();
        this.delayGain.gain.value = 0.3;

        // Filtro para efeito atmosférico
        this.filter = this.audioContext.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1000;
        this.filter.Q.value = 0.5;
    }

    playNextNote() {
        if (!this.audioContext || !this.bgMusicToggle.checked) return;

        try {
            const note = this.melody[this.currentNoteIndex];
            
            // Criar osciladores para a nota principal e harmônicos
            const mainOsc = this.audioContext.createOscillator();
            const harmonicOsc = this.audioContext.createOscillator();
            const noteGain = this.audioContext.createGain();
            const harmonicGain = this.audioContext.createGain();
            
            // Configurar oscilador principal
            mainOsc.type = note.type;
            mainOsc.frequency.setValueAtTime(note.note, this.audioContext.currentTime);
            
            // Configurar harmônico (uma oitava acima, mais suave)
            harmonicOsc.type = 'sine';
            harmonicOsc.frequency.setValueAtTime(note.note * 2, this.audioContext.currentTime);
            harmonicGain.gain.value = 0.1;

            // Envelope ADSR experimental
            const now = this.audioContext.currentTime;
            noteGain.gain.setValueAtTime(0, now);
            
            // Diferentes envelopes baseados no tipo de nota
            if (note.type === 'square') {
                // Notas curtas e marcantes
                noteGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
                noteGain.gain.linearRampToValueAtTime(0, now + note.duration);
            } else {
                // Notas suaves e atmosféricas
                noteGain.gain.linearRampToValueAtTime(0.4, now + 0.2);
                noteGain.gain.linearRampToValueAtTime(0.2, now + 0.4);
                noteGain.gain.linearRampToValueAtTime(0.2, now + note.duration - 0.2);
                noteGain.gain.linearRampToValueAtTime(0, now + note.duration);
            }

            // Conectar os osciladores aos efeitos
            mainOsc.connect(noteGain);
            harmonicOsc.connect(harmonicGain);
            harmonicGain.connect(noteGain);
            
            // Rota principal com filtro
            noteGain.connect(this.filter);
            this.filter.connect(this.musicGain);
            
            // Rota do delay
            noteGain.connect(this.delay);
            this.delay.connect(this.delayGain);
            this.delayGain.connect(this.musicGain);
            
            // Iniciar os osciladores
            mainOsc.start(now);
            harmonicOsc.start(now);
            mainOsc.stop(now + note.duration);
            harmonicOsc.stop(now + note.duration);

            // Adicionar modulação aleatória sutil
            if (Math.random() > 0.7) {
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                lfo.frequency.value = 0.1 + Math.random() * 0.2;
                lfoGain.gain.value = 2 + Math.random() * 3;
                lfo.connect(lfoGain);
                lfoGain.connect(mainOsc.frequency);
                lfo.start();
                lfo.stop(now + note.duration);
            }
            
            // Agendar a próxima nota
            setTimeout(() => {
                this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;
                if (this.bgMusicToggle.checked) {
                    this.playNextNote();
                }
            }, note.duration * 1000);
        } catch (error) {
            console.error('Erro ao tocar música de fundo:', error);
        }
    }

    toggleBackgroundMusic() {
        const volume = this.bgMusicToggle.checked ? this.musicVolume.value / 100 * 0.05 : 0;
        this.musicGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        
        if (this.bgMusicToggle.checked) {
            this.playNextNote();
        }
    }

    updateMusicVolume() {
        if (this.bgMusicToggle.checked) {
            const volume = this.musicVolume.value / 100 * 0.05;
            this.musicGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
    }

    isInitialized() {
        if (!this.buttons || !this.startButton || !this.scoreDisplay) {
            console.error('Erro: Jogo não foi inicializado corretamente');
            alert('Erro ao iniciar o jogo. Por favor, recarregue a página.');
            return false;
        }
        return true;
    }

    startGame() {
        if (!this.isInitialized()) return;

        this.sequence = [];
        this.playerSequence = [];
        this.score = 0;
        this.isPlaying = true;
        this.currentDifficulty = this.difficultySelect.value;
        this.updateScore();
        this.nextRound();
    }

    nextRound() {
        if (!this.isPlaying) return;

        this.playerSequence = [];
        this.sequence.push(this.getRandomButton());
        this.startButton.disabled = true;
        
        setTimeout(() => {
            this.playSequence();
        }, 1000);
    }

    playSequence() {
        if (!this.isPlaying) return;

        let i = 0;
        const speed = this.getCurrentSpeed();
        
        const playNext = () => {
            if (!this.isPlaying) return;
            
            if (i < this.sequence.length) {
                this.activateButton(this.buttons[this.sequence[i]]);
                i++;
                setTimeout(playNext, speed.sequenceSpeed);
            } else {
                this.startButton.disabled = false;
            }
        };

        playNext();
    }

    handlePlayerClick(btn) {
        if (!this.isPlaying) return;

        const btnIndex = Array.from(this.buttons).indexOf(btn);
        if (btnIndex === -1) return;

        this.activateButton(btn);
        this.playerSequence.push(btnIndex);

        if (this.playerSequence[this.playerSequence.length - 1] !== this.sequence[this.playerSequence.length - 1]) {
            this.gameOver(false);
            return;
        }

        if (this.playerSequence.length === this.sequence.length) {
            this.score++;
            this.updateScore();
            setTimeout(() => this.nextRound(), 1000);
        }
    }

    activateButton(btn) {
        if (!btn || !this.isPlaying) return;

        const speed = this.getCurrentSpeed();
        btn.classList.add('active');
        
        if (this.audioEnabled) {
            this.playSound(btn.dataset.btn);
        }
        
        setTimeout(() => {
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
            }
        }, speed.buttonActiveTime);
    }

    getCurrentSpeed() {
        const difficulty = this.difficultySelect.value;
        if (!this.speeds[difficulty]) {
            console.error('Dificuldade inválida:', difficulty);
            return this.speeds.facil; // Fallback para dificuldade fácil
        }
        return this.speeds[difficulty];
    }

    playSound(color) {
        if (!this.audioContext) return; // Verifica se o audioContext existe

        try {
            // Criar oscilador
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Configurar o tipo de onda e frequência
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(this.sounds[color].frequency, this.audioContext.currentTime);
            
            // Configurar envelope do som com o volume do usuário
            const volume = this.soundVolume.value / 100 * 0.5; // Volume máximo de 0.5
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
            
            // Conectar os nós de áudio
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Tocar o som
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Erro ao tocar som:', error);
        }
    }

    getRandomButton() {
        return Math.floor(Math.random() * 4);
    }

    updateScore() {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = this.score;
        }
    }

    showMessage(title, text, detail) {
        if (!this.messageOverlay || !this.messageTitle || !this.messageText || !this.messageDetail || !this.finalScore) {
            console.error('Elementos de mensagem não encontrados');
            return;
        }

        this.messageTitle.textContent = title || 'Fim de Jogo!';
        this.messageText.textContent = text || `Sua pontuação foi: ${this.score}`;
        this.messageDetail.textContent = detail || '';
        this.finalScore.textContent = this.score;
        this.messageOverlay.classList.add('show');
    }

    hideMessage() {
        if (this.messageOverlay) {
            this.messageOverlay.classList.remove('show');
        }
    }

    gameOver(timeout = false) {
        this.isPlaying = false;
        if (this.startButton) {
            this.startButton.disabled = false;
        }

        let title = "Fim de Jogo!";
        let text = `Sua pontuação foi: ${this.score}`;
        let detail = "";

        if (this.score === 0) {
            detail = "Não desista! Tente novamente para melhorar sua pontuação.";
        } else if (timeout) {
            detail = "Tempo esgotado! Seja mais rápido na próxima vez.";
        } else {
            const lastCorrectColor = this.buttons[this.sequence[this.playerSequence.length - 1]]?.dataset.btn;
            const wrongColor = this.buttons[this.playerSequence[this.playerSequence.length - 1]]?.dataset.btn;
            detail = `Sequência errada! A cor correta era ${lastCorrectColor || 'desconhecida'}, mas você clicou em ${wrongColor || 'desconhecida'}.`;
        }

        this.showMessage(title, text, detail);
    }

    updateSoundVolume() {
        // Não é necessário fazer nada aqui, pois o volume dos sons é atualizado dinamicamente no método playSound
    }
}

// Iniciar o jogo
const game = new SimonGame();
