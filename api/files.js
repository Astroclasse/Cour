import { put, list, del } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false, // Nécessaire pour traiter FormData / uploads de fichiers
  },
};

export default async function handler(req, res) {
  try {
    // --- 1. Lister les fichiers ---
    if (req.method === 'GET' && !req.query.path) {
      const { blobs } = await list();
      const files = blobs.map((b) => ({
        id: b.url,
        key: b.url,
        name: b.pathname,
        title: b.pathname.split('/').pop(),
        category: 'autre',
        content: '',
        size: b.size,
        createdAt: new Date(b.uploadedAt).getTime(),
      }));
      return res.status(200).json(files);
    }

    // --- 2. Supprimer un fichier ---
    if (req.method === 'DELETE') {
      const urlToDelete = req.query.url || req.body?.url;
      if (urlToDelete) {
        await del(urlToDelete);
        return res.status(200).json({ ok: true });
      }
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
