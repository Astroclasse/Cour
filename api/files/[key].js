import { del, list } from "@vercel/blob";

const PREFIX = "files/";

export default async function handler(req, res) {
  try {
    const key = String(req.query.key || "");
    if (!key) return res.status(400).json({ error: "Clé manquante." });
    const pathname = PREFIX + key;

    if (req.method === "DELETE") {
      try {
        await del(pathname);
      } catch (e) {
        return res.status(500).json({ error: "Échec de la suppression : " + e.message });
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === "GET") {
      const { blobs } = await list({ prefix: pathname, limit: 1 });
      const found = blobs.find((b) => b.pathname === pathname);
      if (!found) return res.status(404).json({ error: "Fichier introuvable." });
      res.writeHead(302, { Location: found.downloadUrl || found.url });
      return res.end();
    }

    res.setHeader("Allow", "GET, DELETE");
    return res.status(405).json({ error: `Méthode ${req.method} non supportée.` });
  } catch (e) {
    return res.status(500).json({ error: "Erreur interne : " + (e?.message || String(e)) });
  }
}
