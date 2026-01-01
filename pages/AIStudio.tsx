import React, { useState, useRef, useEffect } from 'react';
import { geminiService, ai } from '../services/geminiService';
import { Button, Input, Badge } from '../components/UI';
import { Icons } from '../components/Icons';
import { QuizData, QuizQuestion } from '../types';
import { LiveServerMessage, Modality, Blob } from '@google/genai';

// --- Helper Functions for Audio Processing ---
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  // Manual encode function as per instructions (do not use external lib)
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export default function AIStudio() {
  const [activeTab, setActiveTab] = useState<'plan' | 'quiz' | 'live'>('plan');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [resultPlan, setResultPlan] = useState('');
  const [resultQuiz, setResultQuiz] = useState<QuizData | null>(null);
  
  // Interactive Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  // --- Live API State ---
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0); // For visualizer
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
      // Cleanup on unmount
      return () => {
          disconnectLive();
      };
  }, []);

  const connectLive = async () => {
    try {
        setLoading(true);
        setError(null);
        
        // Setup Audio Contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        
        // Microphone Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // Connect to Gemini Live
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                systemInstruction: 'Você é um tutor amigável e experiente em tecnologia da EduTech PT. Fale de forma clara, em Português de Portugal, e ajude o aluno a aprender novos conceitos tecnológicos. Seja conciso.',
            },
            callbacks: {
                onopen: () => {
                    console.log('Live Session Opened');
                    setIsLiveConnected(true);
                    setLoading(false);
                    
                    // Input Processing (Mic -> Gemini)
                    if (!inputAudioContextRef.current) return;
                    
                    const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        
                        // Simple visualizer logic
                        let sum = 0;
                        for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                        setVolumeLevel(Math.sqrt(sum / inputData.length) * 5); // Scale up

                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Output Processing (Gemini -> Speaker)
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    
                    if (base64Audio && audioContextRef.current) {
                         const ctx = audioContextRef.current;
                         nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                         
                         const audioBytes = decodeBase64(base64Audio);
                         const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
                         
                         const source = ctx.createBufferSource();
                         source.buffer = audioBuffer;
                         source.connect(ctx.destination);
                         
                         source.addEventListener('ended', () => {
                             sourcesRef.current.delete(source);
                         });
                         
                         source.start(nextStartTimeRef.current);
                         nextStartTimeRef.current += audioBuffer.duration;
                         sourcesRef.current.add(source);
                    }
                    
                    if (message.serverContent?.interrupted) {
                        sourcesRef.current.forEach(s => s.stop());
                        sourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                    }
                },
                onclose: () => {
                    console.log('Live Session Closed');
                    setIsLiveConnected(false);
                },
                onerror: (e) => {
                    console.error('Live Session Error', e);
                    setError("Erro na sessão Live. Verifique a consola.");
                    setIsLiveConnected(false);
                }
            }
        });
        
        sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
        console.error(e);
        setError("Não foi possível conectar ao microfone ou à API.");
        setLoading(false);
    }
  };

  const disconnectLive = () => {
      if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (inputAudioContextRef.current) {
          inputAudioContextRef.current.close();
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
      }
      // Note: No explicit session.close() in current SDK typings in context, 
      // but closing stream/context effectively ends client side. 
      // Ideally we would call session.close() if available on the resolved promise.
      // Re-setting state:
      setIsLiveConnected(false);
      setVolumeLevel(0);
      setLoading(false);
  };

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    setResultPlan('');
    setResultQuiz(null);
    
    try {
      if (activeTab === 'plan') {
        const plan = await geminiService.generateCoursePlan(topic);
        if (plan.startsWith("Erro") || plan.startsWith("Não foi possível")) {
           setError(plan);
        } else {
           setResultPlan(plan);
        }
      } else if (activeTab === 'quiz') {
        const quiz = await geminiService.generateQuiz(topic);
        if (quiz) {
          setResultQuiz(quiz);
          // Reset quiz state
          setCurrentQuestionIndex(0);
          setQuizScore(0);
          setQuizFinished(false);
          setLastAnswerCorrect(null);
        } else {
          setError("Não foi possível gerar o quiz. O modelo pode estar sobrecarregado ou o tema é inválido. Tente novamente.");
        }
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado. Verifique a sua ligação.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (option: string) => {
    if (!resultQuiz) return;
    const currentQ = resultQuiz.questions[currentQuestionIndex];
    const isCorrect = option === currentQ.correctAnswer;
    
    setLastAnswerCorrect(isCorrect);
    if (isCorrect) setQuizScore(prev => prev + 1);

    setTimeout(() => {
        setLastAnswerCorrect(null);
        if (currentQuestionIndex < resultQuiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setQuizFinished(true);
        }
    }, 1500); // Delay to show feedback
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg text-white transition-colors duration-500 ${isLiveConnected ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                {isLiveConnected ? <Icons.Mic className="w-6 h-6" /> : <Icons.AI className="w-6 h-6" />}
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Estúdio de Criação IA</h2>
                <p className="text-sm text-gray-500">
                    {isLiveConnected ? <span className="text-red-500 font-bold">● EM DIRETO</span> : "Desenvolvido com Gemini 3 Flash & Live API"}
                </p>
            </div>
        </div>

        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
           <button 
             className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'plan' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             onClick={() => { setActiveTab('plan'); setError(null); }}
             disabled={isLiveConnected}
           >
             Gerador de Plano de Curso
           </button>
           <button 
             className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'quiz' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             onClick={() => { setActiveTab('quiz'); setError(null); }}
             disabled={isLiveConnected}
           >
             Gerador de Quiz Interativo
           </button>
           <button 
             className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'live' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             onClick={() => { setActiveTab('live'); setError(null); }}
           >
             <Icons.Mic className="w-4 h-4" /> Tutor IA (Live)
           </button>
        </div>

        {/* --- LIVE TAB CONTENT --- */}
        {activeTab === 'live' ? (
             <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                 {isLiveConnected ? (
                     <div className="text-center space-y-8">
                         <div className="relative">
                             <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center mx-auto relative z-10">
                                 <Icons.Mic className="w-16 h-16 text-red-600" />
                             </div>
                             {/* Visualizer Rings */}
                             <div className="absolute top-0 left-0 w-32 h-32 bg-red-200 rounded-full animate-ping opacity-50 z-0" style={{ animationDuration: '2s' }}></div>
                             <div 
                                className="absolute top-0 left-0 w-32 h-32 rounded-full border-4 border-red-400 z-20 transition-all duration-75"
                                style={{ transform: `scale(${1 + volumeLevel})` }}
                             ></div>
                         </div>
                         
                         <div>
                             <h3 className="text-xl font-bold text-gray-900">Tutor IA Ativo</h3>
                             <p className="text-gray-500">Estou a ouvir... Fale comigo sobre qualquer tópico!</p>
                         </div>

                         <Button onClick={disconnectLive} variant="danger" size="lg" className="px-8">
                             <Icons.Stop className="w-5 h-5 mr-2" /> Terminar Sessão
                         </Button>
                     </div>
                 ) : (
                     <div className="text-center max-w-md">
                         <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                             <Icons.Active className="w-10 h-10 text-indigo-600" />
                         </div>
                         <h3 className="text-xl font-bold text-gray-900 mb-2">Converse em Tempo Real</h3>
                         <p className="text-gray-500 mb-8">
                             Pratique os seus conhecimentos ou tire dúvidas com o nosso Tutor IA. 
                             Utiliza a tecnologia de baixa latência Gemini Live para uma conversa natural.
                         </p>
                         
                         {loading ? (
                             <Button disabled className="px-8 py-3">
                                 <span className="animate-spin mr-2">⟳</span> A Conectar...
                             </Button>
                         ) : (
                             <Button onClick={connectLive} size="lg" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transform transition hover:-translate-y-1">
                                 <Icons.Mic className="w-5 h-5 mr-2" /> Iniciar Conversa
                             </Button>
                         )}
                         <p className="text-xs text-gray-400 mt-4">Requer permissão de microfone. Funciona melhor com auscultadores.</p>
                     </div>
                 )}
                 
                 {error && (
                    <div className="mt-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-left max-w-lg w-full">
                        <p className="font-bold">Erro de Ligação</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
             </div>
        ) : (
            // --- PLAN & QUIZ CONTENT ---
            <>
                <div className="flex gap-4 items-end mb-6">
                    <div className="flex-1">
                        <Input 
                        label="Tema do Conteúdo" 
                        value={topic} 
                        onChange={e => setTopic(e.target.value)} 
                        placeholder={activeTab === 'plan' ? "Ex: Desenvolvimento Web Moderno" : "Ex: Noções básicas de JavaScript"}
                        />
                    </div>
                    <div className="mb-4">
                        <Button onClick={handleGenerate} disabled={loading || !topic} className={loading || !topic ? 'opacity-75 cursor-not-allowed' : ''}>
                            {loading ? (
                                <>
                                <span className="animate-spin mr-2">⟳</span> A Gerar...
                                </>
                            ) : (
                                <>
                                <Icons.AI className="w-4 h-4 mr-2" /> Gerar Conteúdo
                                </>
                            )}
                        </Button>
                    </div>
                </div>
                
                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                        <p className="font-bold">Erro na Geração</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Results Area */}
                <div className="mt-8 border-t pt-6">
                    {activeTab === 'plan' && resultPlan && (
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Icons.FileText className="w-5 h-5 text-gray-500" /> 
                                Plano Gerado
                            </h3>
                            <div className="prose prose-indigo max-w-none text-sm whitespace-pre-wrap font-mono bg-white p-4 rounded border">
                                {resultPlan}
                            </div>
                        </div>
                    )}

                    {activeTab === 'quiz' && resultQuiz && (
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 text-center">
                            {!quizFinished ? (
                                <div className="max-w-xl mx-auto">
                                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                                        <span>Questão {currentQuestionIndex + 1}/{resultQuiz.questions.length}</span>
                                        <span>Pontuação: {quizScore}</span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-gray-900 mb-8">
                                        {resultQuiz.questions[currentQuestionIndex].question}
                                    </h3>

                                    <div className="space-y-3">
                                        {resultQuiz.questions[currentQuestionIndex].options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleQuizAnswer(opt)}
                                                disabled={lastAnswerCorrect !== null}
                                                className={`w-full p-4 rounded-lg border text-left font-medium transition-all transform 
                                                ${lastAnswerCorrect === null 
                                                    ? 'bg-white border-gray-200 hover:border-indigo-500 hover:shadow-md' 
                                                    : opt === resultQuiz.questions[currentQuestionIndex].correctAnswer
                                                        ? 'bg-green-100 border-green-500 text-green-800'
                                                        : 'bg-white border-gray-200 opacity-50'
                                                }
                                                `}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>

                                    {lastAnswerCorrect !== null && (
                                        <div className={`mt-4 p-2 rounded text-sm font-bold animate-pulse ${lastAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                            {lastAnswerCorrect ? 'Correto!' : `Incorreto! A resposta certa era: ${resultQuiz.questions[currentQuestionIndex].correctAnswer}`}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <Icons.Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-gray-900">Quiz Concluído!</h3>
                                    <p className="text-lg text-gray-600 mt-2">
                                        Acertou em <span className="font-bold text-indigo-600">{quizScore}</span> de {resultQuiz.questions.length} perguntas.
                                    </p>
                                    <div className="mt-6">
                                        <Button onClick={() => { setQuizFinished(false); setCurrentQuestionIndex(0); setQuizScore(0); }}>
                                            Reiniciar Quiz
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
}