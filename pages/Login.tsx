import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Icons } from '../components/Icons';
import { Button, Input, formatCurrency } from '../components/UI';
import { storageService } from '../services/storageService';
import { Course } from '../types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Public Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  React.useEffect(() => {
      // Fetch public courses for landing page
      const loadPublicCourses = async () => {
          try {
              const data = await storageService.getCourses();
              setCourses(data);
          } catch(e) {
              console.error("Failed to load courses for landing page", e);
          } finally {
              setLoadingCourses(false);
          }
      };
      loadPublicCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (email && password) {
      try {
        await login(email.trim().toLowerCase(), password);
      } catch (err: any) {
        setError(err.message || "Erro ao fazer login");
        setLoading(false);
      }
    } else {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                  <div className="flex items-center gap-2">
                     <div className="bg-indigo-600 p-2 rounded-lg">
                        <Icons.Student className="text-white w-6 h-6" />
                     </div>
                     <span className="text-xl font-bold tracking-tight text-gray-900">EduTech <span className="text-indigo-600">PT</span></span>
                  </div>
                  <div className="flex items-center">
                      <a href="#courses" className="text-sm font-medium text-gray-500 hover:text-gray-900 mr-4">Cursos</a>
                      <a href="#login" className="text-sm font-bold text-indigo-600 hover:text-indigo-500">Área de Aluno</a>
                  </div>
              </div>
          </div>
      </nav>

      {/* Hero / Login Section */}
      <div id="login" className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 gap-12">
          
          {/* Left: Welcome Text */}
          <div className="lg:w-1/2 flex flex-col justify-center space-y-6">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  Evolua a sua carreira com as <span className="text-indigo-600">Novas Tecnologias</span>.
              </h1>
              <p className="text-lg text-gray-600">
                  Plataforma completa de gestão de formação. Aceda aos seus cursos, materiais didáticos e certificações num só lugar.
              </p>
              <div className="flex gap-4">
                  <div className="flex items-center text-sm text-gray-500">
                      <Icons.Check className="w-5 h-5 text-green-500 mr-2" /> Certificados Reconhecidos
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                      <Icons.Check className="w-5 h-5 text-green-500 mr-2" /> Acesso Vitalício
                  </div>
              </div>
          </div>

          {/* Right: Login Box */}
          <div className="lg:w-1/2 lg:pl-12">
            <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              
              <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Entrar na Plataforma</h2>
                  <p className="text-sm text-gray-500 mt-1">Insira as suas credenciais para continuar</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <Icons.Close className="h-5 w-5 text-red-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}
                
                <Input 
                  label="Endereço de Email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@edutech.pt"
                  className="bg-gray-50"
                />

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50 pr-10"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <Icons.EyeOff className="h-5 w-5" aria-hidden="true" />
                            ) : (
                                <Icons.Eye className="h-5 w-5" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>

                <div>
                  <Button type="submit" className="w-full flex justify-center py-3 text-base" disabled={loading}>
                    {loading ? (
                        <>
                           <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                           A verificar...
                        </>
                    ) : 'Entrar / Registar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
      </div>

      {/* Public Courses Grid */}
      <div id="courses" className="bg-gray-50 py-16 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                      Cursos em Destaque
                  </h2>
                  <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
                      Explore a nossa oferta formativa e dê o próximo passo na sua carreira tecnológica.
                  </p>
              </div>

              {loadingCourses ? (
                  <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
              ) : courses.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                      <p>Sem cursos disponíveis de momento.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {courses.map((course) => (
                          <div key={course.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group border border-gray-100">
                              <div className="h-48 w-full relative overflow-hidden">
                                <img 
                                    src={course.imageUrl} 
                                    alt={course.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                                <div className="absolute top-3 left-3">
                                    <span className="bg-indigo-600/90 backdrop-blur px-3 py-1 text-xs font-bold rounded-full text-white shadow-sm">
                                        {course.category}
                                    </span>
                                </div>
                              </div>
                              <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">{course.description}</p>
                                
                                <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                                    <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                                        {course.duration}
                                    </div>
                                    <div className="text-lg font-bold text-indigo-600">
                                        {formatCurrency(course.price)}
                                    </div>
                                </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
              &copy; {new Date().getFullYear()} EduTech PT. Todos os direitos reservados.
          </div>
      </footer>
    </div>
  );
}