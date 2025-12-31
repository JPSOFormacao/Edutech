import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { Button, Input, Badge } from '../components/UI';
import { Icons } from '../components/Icons';
import { QuizData, QuizQuestion } from '../types';

export default function AIStudio() {
  const [activeTab, setActiveTab] = useState<'plan' | 'quiz'>('plan');
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
      } else {
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
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg text-white">
                <Icons.AI className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Estúdio de Criação IA</h2>
                <p className="text-sm text-gray-500">Desenvolvido com Gemini 3 Flash</p>
            </div>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
           <button 
             className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'plan' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             onClick={() => { setActiveTab('plan'); setError(null); }}
           >
             Gerador de Plano de Curso
           </button>
           <button 
             className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'quiz' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
             onClick={() => { setActiveTab('quiz'); setError(null); }}
           >
             Gerador de Quiz Interativo
           </button>
        </div>

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
      </div>
    </div>
  );
}