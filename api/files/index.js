import { put, list } from "@vercel/blob";

// On désactive le bodyParser JSON par défaut : le fichier est envoyé
// en binaire brut dans le corps de la requête (pas en multipart/form-data).
export const config = { api: { bodyParser: false } };

const ALLOWED = new Set([
  ".doc", ".docx", ".pdf", ".txt", ".ppt", ".pptx", ".mp3",
  ".png", ".jpg", ".jpeg",
  ".xlsx", ".csv",
  ".html", ".css", ".js", ".py",
  ".exe", ".bat", ".zip"
]);
const MAX_SIZE = 4 * 1024 * 1024; // 4 Mo (la limite Vercel est ~4.5 Mo par requête)
const PREFIX = "files/";

function ext(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

// Vercel Blob ne permet pas de stocker des métadonnées personnalisées :
// on encode donc (catégorie, titre, nom original) dans le nom du fichier
// stocké, sous forme d'un petit JSON encodé en base64url (sans "/" ni "+").
function b64url(str) {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf-8");
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { blobs } = await list({ prefix: PREFIX });
      const result = blobs.map((b) => {
        const rawKey = b.pathname.slice(PREFIX.length);
        let meta = {};
        try {
          meta = JSON.parse(b64urlDecode(rawKey));
        } catch {
          meta = {};
        }
        return {
          key: rawKey,
          name: meta.n || rawKey,
          title: meta.t || "",
          category: meta.c || "autre",
          type: b.contentType || "application/octet-stream",
          size: b.size,
          createdAt: new Date(b.uploadedAt).getTime(),
          url: b.downloadUrl || b.url
        };
      });
      result.sort((a, b) => b.createdAt - a.createdAt);
      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      const filename = String(req.query.filename || "");
      const category = String(req.query.category || "autre").trim() || "autre";
      const title = String(req.query.title || "").slice(0, 200);

      if (!filename) {
        return res.status(400).json({ error: "Nom de fichier manquant." });
      }

      const extension = ext(filename);
      if (!ALLOWED.has(extension)) {
        return res.status(400).json({
          error: `Type de fichier non autorisé : "${extension || "inconnu"}". Types acceptés : ${[...ALLOWED].join(", ")}.`
        });
      }

      const contentLength = Number(req.headers["content-length"] || 0);
      if (contentLength === 0) {
        return res.status(400).json({ error: "Le fichier envoyé est vide." });
      }
      if (contentLength > MAX_SIZE) {
        return res.status(400).json({
          error: `Fichier trop volumineux (${(contentLength / 1024 / 1024).toFixed(2)} Mo). Limite : 4 Mo.`
        });
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const key = b64url(JSON.stringify({ c: category, t: title, n: filename, i: id }));

      let blob;
      try {
        blob = await put(PREFIX + key, req, {
          access: "public",
          contentType: req.headers["content-type"] || "application/octet-stream"
        });
      } catch (e) {
        return res.status(500).json({ error: "Échec de l'enregistrement dans Vercel Blob : " + e.message });
      }

      return res.status(200).json({ ok: true, key, name: filename, category, url: blob.downloadUrl || blob.url });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: `Méthode ${req.method} non supportée.` });
  } catch (e) {
    return res.status(500).json({ error: "Erreur interne de la fonction : " + (e?.message || String(e)) });
  }
}
