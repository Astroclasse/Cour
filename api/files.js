import { put, list, del } from '@vercel/blob';

const ALLOWED_EXT = new Set([".doc", ".docx", ".pdf", ".txt", ".ppt", ".pptx", ".mp3"]);
const MAX_SIZE = 5 * 1024 * 1024; // Limite Vercel Function : 5 Mo

function ext(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function sanitize(str) {
  return String(str || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100) || "fichier";
}

export default async function handler(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const parts = url.pathname.split("/").filter(Boolean);
    const rawKey = parts.length >= 3 ? parts.slice(2).join("/") : null;
    const key = rawKey ? decodeURIComponent(rawKey) : null;

    // --- 1. Lister tous les fichiers enregistrés dans Vercel Blob ---
    if (req.method === "GET" && !key) {
      const { blobs } = await list({ prefix: "fiches/" });
      
      const files = blobs.map(b => {
        // Ex: fiches/francais/12345__Titre_de_la_fiche__contenu...__document.pdf
        const nameParts = b.pathname.replace(/^fiches\//, "").split("/");
        const category = nameParts[0] || "autre";
        const meta = (nameParts[1] || "").split("__");

        const id = meta[0] || b.url;
        const title = meta[1] ? decodeURIComponent(meta[1]) : "Fiche de révision";
        const content = meta[2] ? decodeURIComponent(meta[2]) : "";
        const originalName = meta[3] ? decodeURIComponent(meta[3]) : b.pathname;

        return {
          id: b.url,
          key: b.url,
          name: originalName,
          title,
          category,
          content,
          size: b.size,
          createdAt: new Date(b.uploadedAt).getTime()
        };
      });

      files.sort((a, b) => b.createdAt - a.createdAt);
      return jsonResponse(files);
    }

    // --- 2. Uploader un fichier ou enregistrer une note dans Vercel Blob ---
    if (req.method === "POST" && !key) {
      const contentType = req.headers.get("content-type") || "";

      let category = "autre";
      let title = "Sans titre";
      let contentText = "";
      let fileToUpload = null;
      let originalName = "note.txt";

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        fileToUpload = form.get("file");
        category = sanitize(form.get("category") || "autre");
        title = String(form.get("title") || "Fiche sans titre").slice(0, 150);
        contentText = String(form.get("content") || "").slice(0, 300);

        if (fileToUpload instanceof File && fileToUpload.size > 0) {
          if (fileToUpload.size > MAX_SIZE) {
            return jsonResponse({ error: "Fichier trop volumineux (max 5 Mo)." }, 400);
          }
          const extension = ext(fileToUpload.name);
          if (!ALLOWED_EXT.has(extension)) {
            return jsonResponse({ error: `Extension non autorisée : ${extension}` }, 400);
          }
          originalName = fileToUpload.name;
        } else {
          fileToUpload = new Blob([contentText], { type: "text/plain;charset=utf-8" });
        }
      } else {
        const body = await req.json();
        category = sanitize(body.category || "autre");
        title = String(body.title || "Fiche").slice(0, 150);
        contentText = String(body.content || "").slice(0, 300);
        fileToUpload = new Blob([contentText], { type: "text/plain;charset=utf-8" });
      }

      const fileId = Date.now().toString();
      const safeTitle = encodeURIComponent(title);
      const safeContent = encodeURIComponent(contentText);
      const safeName = encodeURIComponent(sanitize(originalName));

      // Construction du chemin unique dans Vercel Blob
      const blobPath = `fiches/${category}/${fileId}__${safeTitle}__${safeContent}__${safeName}`;

      // Sauvegarde effective dans le stockage Vercel Blob
      const blob = await put(blobPath, fileToUpload, {
        access: 'public',
        addRandomSuffix: false
      });

      return jsonResponse({ ok: true, key: blob.url, id: blob.url });
    }

    // --- 3. Supprimer un fichier de Vercel Blob ---
    if (key && req.method === "DELETE") {
      await del(key);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Route introuvable" }, 404);
  } catch (e) {
    return jsonResponse({ error: "Erreur serveur Vercel Blob : " + e.message }, 500);
  }
}
