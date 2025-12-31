import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Page } from '../types';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';
import { useNavigate } from 'react-router-dom';

export default function CMS() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    const data = await storageService.getPages();
    setPages(data);
  };

  const handleCreate = () => {
    setSelectedPage({
      slug: 'nova-pagina',
      title: 'Nova Página',
      content: '<h1>Título</h1><p>Conteúdo aqui...</p>',
      updatedAt: new Date().toISOString()
    });
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    
    await storageService.savePages([{ ...selectedPage, updatedAt: new Date().toISOString() }]);
    
    await loadPages();
    setSelectedPage(null);
  };

  const handleDelete = async (slug: string) => {
      if (confirm('Eliminar esta página?')) {
          await storageService.deletePage(slug);
          await loadPages();
          if (selectedPage?.slug === slug) setSelectedPage(null);
      }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* List */}
      <div className="w-1/3 border-r pr-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Páginas</h2>
            <Button size="sm" onClick={handleCreate}><Icons.Plus className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-2">
            {pages.map(page => (
                <div 
                    key={page.slug} 
                    className={`p-3 rounded border cursor-pointer hover:bg-gray-50 flex justify-between items-center ${selectedPage?.slug === page.slug ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                    onClick={() => setSelectedPage(page)}
                >
                    <div>
                        <div className="font-medium text-gray-900">{page.title}</div>
                        <div className="text-xs text-gray-500">/p/{page.slug}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/p/${page.slug}`); }} className="text-gray-400 hover:text-indigo-600">
                             <Icons.Link className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(page.slug); }} className="text-gray-400 hover:text-red-600">
                             <Icons.Delete className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 pl-6 flex flex-col">
         {selectedPage ? (
             <div className="h-full flex flex-col space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                     <Input 
                        label="Título" 
                        value={selectedPage.title} 
                        onChange={e => setSelectedPage({...selectedPage, title: e.target.value})} 
                     />
                     <Input 
                        label="Slug (URL)" 
                        value={selectedPage.slug} 
                        onChange={e => setSelectedPage({...selectedPage, slug: e.target.value})} 
                     />
                 </div>
                 
                 <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo (HTML / Rich Text)</label>
                    <textarea 
                        className="flex-1 w-full border border-gray-300 rounded-md p-4 font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={selectedPage.content}
                        onChange={e => setSelectedPage({...selectedPage, content: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">Este campo aceita HTML básico para formatação.</p>
                 </div>

                 <div className="flex justify-end pt-2">
                     <Button onClick={handleSave}>Guardar Alterações</Button>
                 </div>
             </div>
         ) : (
             <div className="h-full flex items-center justify-center text-gray-400">
                 Selecione uma página para editar
             </div>
         )}
      </div>
    </div>
  );
}