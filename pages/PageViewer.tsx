import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Page } from '../types';

export default function PageViewer() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        const pages = await storageService.getPages();
        const found = pages.find(p => p.slug === slug);
        setPage(found || null);
        setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="p-10 text-center">A carregar conteúdo...</div>;

  if (!page) {
    return (
      <div className="text-center py-20">
        <h2 className="text-3xl font-bold text-gray-300">404</h2>
        <p className="text-gray-500">Página não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4">{page.title}</h1>
      <div 
        className="prose prose-indigo max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: page.content }} 
      />
      <div className="mt-8 pt-4 border-t text-sm text-gray-400">
          Última atualização: {new Date(page.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}