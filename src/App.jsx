import React, { useState, useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import './App.css';

// const URL_HUB_SIGNALR = import.meta.env.VITE_API_SIGNALR_URL || 'https://localhost:7001/painelHub';
// const URL_HUB_SIGNALR = import.meta.env.VITE_API_SIGNALR_URL || 'https://painel-50bm.onrender.com/painelHub';

// const URL_HUB_SIGNALR = 'https://onrender.com/painelHub';

const URL_HUB_SIGNALR = 'https://painel-50bm.onrender.com/painelHub';






function App() {
  const [senhaAtual, setSenhaAtual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [piscar, setPiscar] = useState(false);
  const [esconderMouse, setEsconderMouse] = useState(false);
  const [somAtivo, setSomAtivo] = useState(true); // Controla se o som/voz deve ser executado
  
  const conexaoRef = useRef(null);
  const senhaAtualRef = useRef(null);
  const somAtivoRef = useRef(true); // Referência mutável para leitura imediata na API de som
  
  const [bloqueadoPorVoz, setBloqueadoPorVoz] = useState(false);
  const bloqueadoPorVozRef = useRef(false);
  const timerMouseRef = useRef(null);

  // Sincroniza referências para evitar Race Conditions nos listeners assíncronos
  useEffect(() => {
    bloqueadoPorVozRef.current = bloqueadoPorVoz;
  }, [bloqueadoPorVoz]);

  useEffect(() => {
    senhaAtualRef.current = senhaAtual;
  }, [senhaAtual]);

  useEffect(() => {
    somAtivoRef.current = somAtivo;
  }, [somAtivo]);

  // Monitora inatividade do mouse para esconder cursor e controles (10 segundos)
  const lidarComMovimentoMouse = () => {
    setEsconderMouse(false);
    if (timerMouseRef.current) clearTimeout(timerMouseRef.current);
    timerMouseRef.current = setTimeout(() => setEsconderMouse(true), 10000);
  };

  useEffect(() => {
    return () => {
      if (timerMouseRef.current) clearTimeout(timerMouseRef.current);
    };
  }, []);

  // Som "Blim Blom" + Leitura de voz integrada
  const tocarSomChamada = (dadosSenha, forcarClique = false) => {
    try {
      if (!dadosSenha) return;
      if (!forcarClique && bloqueadoPorVozRef.current) return;

      setPiscar(true);

      // Se o som estiver inativado pelo botão, ainda mantém o alerta visual e encerra apenas o áudio
      if (!forcarClique && !somAtivoRef.current) return;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const tempoSegundoBip = 0.45; 
      const duracaoSustentacao = 3.5; 

      const criarNotaSino = (frequenciaPrincipal, tempoInicio, volume) => {
        const oscPrincipal = ctx.createOscillator();
        const gainPrincipal = ctx.createGain();
        oscPrincipal.type = 'sine';
        oscPrincipal.frequency.setValueAtTime(frequenciaPrincipal, tempoInicio);
        gainPrincipal.gain.setValueAtTime(volume, tempoInicio);
        gainPrincipal.gain.exponentialRampToValueAtTime(0.001, tempoInicio + duracaoSustentacao);
        oscPrincipal.connect(gainPrincipal);
        gainPrincipal.connect(ctx.destination);
        
        const oscHarm1 = ctx.createOscillator();
        const gainHarm1 = ctx.createGain();
        oscHarm1.type = 'sine';
        oscHarm1.frequency.setValueAtTime(frequenciaPrincipal * 2, tempoInicio); 
        gainHarm1.gain.setValueAtTime(volume * 0.3, tempoInicio); 
        gainHarm1.gain.exponentialRampToValueAtTime(0.001, tempoInicio + (duracaoSustentacao * 0.7)); 
        oscHarm1.connect(gainHarm1);
        gainHarm1.connect(ctx.destination);

        oscPrincipal.start(tempoInicio);
        oscPrincipal.stop(tempoInicio + duracaoSustentacao);
        oscHarm1.start(tempoInicio);
        oscHarm1.stop(tempoInicio + duracaoSustentacao);
      };

      if (!forcarClique) setBloqueadoPorVoz(true);

      criarNotaSino(587.33, ctx.currentTime, 0.25);
      criarNotaSino(440.00, ctx.currentTime + tempoSegundoBip, 0.25);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const matchLetras = dadosSenha.numero.match(/[A-Z]+/g);
        const letras = matchLetras ? matchLetras : '';
        
        const matchNumeros = dadosSenha.numero.match(/\d+/g);
        const numerosString = matchNumeros ? matchNumeros : '';
        const numerosSoletrados = String(numerosString).split('').join(' ');

        let textoParaFalar = `Senha. ${letras}. ${numerosSoletrados}. Guichê. ${parseInt(dadosSenha.guiche, 10)}.`;
        if (dadosSenha.nomeCliente) {
          textoParaFalar += ` Cliente: ${dadosSenha.nomeCliente}.`;
        }
        
        const utterance = new SpeechSynthesisUtterance(textoParaFalar);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.95; 
        utterance.pitch = 1.0;

        const vozes = window.speechSynthesis.getVoices();
        const vozFeminina = vozes.find(v => 
          v.lang.includes('pt') && 
          (v.name.toLowerCase().includes('maria') || 
           v.name.toLowerCase().includes('luciana') || 
           v.name.toLowerCase().includes('francisca') || 
           v.name.toLowerCase().includes('google') || 
           v.name.toLowerCase().includes('zira') || 
           v.name.toLowerCase().includes('natural'))
        );
        
        if (vozFeminina) {
          utterance.voice = vozFeminina;
        } else {
          const qualquerPt = vozes.find(v => v.lang.includes('pt'));
          if (qualquerPt) utterance.voice = qualquerPt;
        }

        utterance.onend = () => {
          if (!forcarClique) setBloqueadoPorVoz(false);
          setPiscar(false);
        };

        utterance.onerror = () => {
          if (!forcarClique) setBloqueadoPorVoz(false);
          setPiscar(false);
        };

        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 800);
      } else {
        if (!forcarClique) setBloqueadoPorVoz(false);
        setTimeout(() => setPiscar(false), 4000);
      }

    } catch (error) {
      console.error("Erro na reprodução:", error);
      if (!forcarClique) setBloqueadoPorVoz(false);
      setPiscar(false);
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const normalizarStatus = (status) => {
    const valor = String(status ?? '').trim().toLowerCase();

    if (['em atendimento', 'em_atendimento', 'atendimento', 'em-atendimento'].includes(valor)) {
      return 'em-atendimento';
    }

    if (['atendido', 'finalizado', 'concluido'].includes(valor)) {
      return 'atendido';
    }

    if (['cancelado', 'cancelada', 'recusado', 'recusada'].includes(valor)) {
      return 'cancelado';
    }

    return 'chamando';
  };

  const montarDadosSenha = (dadosDoCsharp) => {
    const prefixo = dadosDoCsharp.prefixo ?? 'A';
    const numeroAtual = Number(dadosDoCsharp.numeroAtual ?? 0);
    const guicheAtual = Number(dadosDoCsharp.guicheAtual ?? 0);
    const statusNormalizado = normalizarStatus(dadosDoCsharp.status);
    const nomeCliente = dadosDoCsharp.nomeCliente ?? '';

    return {
      numero: `${prefixo}${String(numeroAtual).padStart(3, '0')}`,
      guiche: String(guicheAtual).padStart(2, '0'),
      prioridade: dadosDoCsharp.prioridade ?? 'Normal',
      status: statusNormalizado,
      nomeCliente: nomeCliente && String(nomeCliente).trim() ? String(nomeCliente).trim() : ''
    };
  };

  const chaveSenha = (dadosSenha) => `${dadosSenha?.numero ?? ''}|${dadosSenha?.guiche ?? ''}`;

  const atualizarHistoricoComStatus = (dadosSenha) => {
    const statusNormalizado = normalizarStatus(dadosSenha.status);

    setHistorico(prev => {
      const chave = chaveSenha(dadosSenha);
      const indiceExistente = prev.findIndex(item => chaveSenha(item) === chave);

      if (indiceExistente >= 0) {
        const atualizado = {
          ...prev[indiceExistente],
          ...dadosSenha,
          status: statusNormalizado
        };

        const proximo = [...prev];
        proximo[indiceExistente] = atualizado;
        return proximo;
      }

      return prev;
    });
  };

  // Conexão Hub SignalR
  useEffect(() => {
    const novaConexao = new HubConnectionBuilder()
      .withUrl(URL_HUB_SIGNALR)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    conexaoRef.current = novaConexao;

    novaConexao.start()
      .then(() => {
        console.log(`Conectado ao SignalR Hub em: ${URL_HUB_SIGNALR}`);

        novaConexao.on('NovaChamada', (dadosDoCsharp) => {
          const dadosSenhaFormatada = montarDadosSenha(dadosDoCsharp);
          const senhaAnterior = senhaAtualRef.current;

          setHistorico(prev => {
            const proximo = [...prev];

            if (senhaAnterior && chaveSenha(senhaAnterior) !== chaveSenha(dadosSenhaFormatada)) {
              const jaExiste = proximo.some(item => chaveSenha(item) === chaveSenha(senhaAnterior));
              if (!jaExiste) {
                proximo.unshift({
                  ...senhaAnterior,
                  status: normalizarStatus(senhaAnterior.status)
                });
              }
            }

            return proximo.slice(0, 4);
          });

          setSenhaAtual(dadosSenhaFormatada);
          tocarSomChamada(dadosSenhaFormatada, false);
        });

        novaConexao.on('StatusAtendimento', (dadosDoCsharp) => {
          const dadosSenhaFormatada = montarDadosSenha(dadosDoCsharp);

          setHistorico(prev => {
            const chave = chaveSenha(dadosSenhaFormatada);
            const indiceExistente = prev.findIndex(item => chaveSenha(item) === chave);

            if (indiceExistente < 0) {
              return prev;
            }

            const atualizados = [...prev];
            atualizados[indiceExistente] = {
              ...atualizados[indiceExistente],
              ...dadosSenhaFormatada,
              status: normalizarStatus(dadosSenhaFormatada.status)
            };
            return atualizados;
          });

          if (senhaAtualRef.current) {
            const chaveAtual = `${senhaAtualRef.current.numero}|${senhaAtualRef.current.guiche}`;
            const chaveStatus = `${dadosSenhaFormatada.numero}|${dadosSenhaFormatada.guiche}`;

            if (chaveAtual === chaveStatus) {
              setSenhaAtual(prev => prev ? { ...prev, status: normalizarStatus(dadosSenhaFormatada.status) } : prev);
            }
          }
        });
      })
      .catch(erro => console.error('Erro ao conectar ao Hub do SignalR:', erro));

    return () => {
      if (conexaoRef.current) {
        conexaoRef.current.stop();
      }
    };
  }, []);

  // Interceptador para evitar que o clique no botão ative a chamada geral do container de fundo
  const alternarMuteSinal = (e) => {
    e.stopPropagation();
    setSomAtivo(!somAtivo);
  };

  return (
    <div 
      className={`painel-container ${esconderMouse ? 'esconder-cursor' : ''}`} 
      onClick={() => tocarSomChamada(senhaAtual, true)}
      onMouseMove={lidarComMovimentoMouse}
    >
      {/* Botão de Controle de Som - Fica invisível/escondido junto com o mouse */}
      <button 
        className={`botao-audio-controle ${somAtivo ? 'ativo' : 'mutado'} ${esconderMouse ? 'ocultar-controles' : ''}`}
        onClick={alternarMuteSinal}
        title={somAtivo ? "Silenciar chamadas de voz e áudio" : "Ativar chamadas de voz e áudio"}
      >
        {somAtivo ? '🔊' : '🔇'}
      </button>

      <div className={`bloco-principal ${piscar ? 'alerta-animacao' : ''}`}>
        {senhaAtual ? (
          <>
            <div className={`tag-prioridade ${senhaAtual.prioridade.toLowerCase() === 'preferencial' ? 'preferencial' : ''}`}>
              {senhaAtual.prioridade.toUpperCase()}
            </div>
            <h1 className="numero-principal">{senhaAtual.numero}</h1>
            <h2 className="guiche-principal">GUICHÊ {senhaAtual.guiche}</h2>
            
            {senhaAtual.nomeCliente && (
              <div className="cliente-principal">
                {senhaAtual.nomeCliente.toUpperCase()}
              </div>
            )}
          </>
        ) : (
          <div className="aguardando">AGUARDANDO PRÓXIMA CHAMADA...</div>
        )}
      </div>

      <div className="bloco-historico">
        <h3 className="titulo-historico">ÚLTIMAS CHAMADAS</h3>
        <div className="lista-historico">
          {historico.length > 0 ? (
            historico.map((item, index) => {
              const statusResumo = String(item.status ?? '').replace(/_/g, '-').toLowerCase();
              const estaVerde = ['em-atendimento', 'atendido', 'finalizado'].includes(statusResumo);
              const estaVermelho = ['cancelado', 'cancelada', 'recusado', 'recusada'].includes(statusResumo);

              return (
                <div 
                  key={`${item.numero}-${item.guiche}-${index}`} 
                  className={`item-historico ${estaVerde ? 'quadrado-verde' : estaVermelho ? 'quadrado-vermelho' : ''}`}
                >
                  {estaVermelho && <span className="x-vermelho">✕</span>}
                  <span className="hist-numero">{item.numero}</span>
                  <span className="hist-separador">➔</span>
                  <span className="hist-guiche">Guichê {item.guiche}</span>
                </div>
              );
            })
          ) : (
            <div className="item-historico vazio">Nenhum histórico recente</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
