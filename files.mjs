import { getStore } from "@netlify/blobs";

const STORE = "revisapp-files";
const ALLOWED = new Set([".doc", ".docx", ".pdf", ".txt", ".ppt", ".pptx", ".mp3"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo, doit rester cohérent avec le frontend

function ext(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

// Nettoie le nom de fichier mais NE PRODUIT JAMAIS de "/", pour que la clé
// puisse toujours être utilisée telle quelle dans un segment d'URL
// (/api/files/:key) sans problème d'encodage de "%2F".
function safe(s) {
  return (
    String(s || "")
      .normalize("NFKD")
      .replace(/[/\\]/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120) || "fichier"
  );
}

export default async (req) => {
  try {
    const store = getStore(STORE);
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api","files", "<key>"?]
    const rawKey = parts.length >= 3 ? parts.slice(2).join("/") : null;
    const key = rawKey ? decodeURIComponent(rawKey) : null;

    // --- Liste des fichiers -------------------------------------------------
    if (req.method === "GET" && !key) {
      const { blobs } = await store.list();
      const result = [];
      for (const b of blobs) {
        const meta = await store.getMetadata(b.key);
        result.push({
          key: b.key,
          name: meta?.metadata?.name || b.key,
          title: meta?.metadata?.title || "",
          category: meta?.metadata?.category || "autre",
          type: meta?.metadata?.type || "application/octet-stream",
          size: Number(meta?.metadata?.size || 0),
          createdAt: Number(meta?.metadata?.createdAt || Date.now())
        });
      }
      result.sort((a, b) => b.createdAt - a.createdAt);
      return json(result);
    }

    // --- Envoi d'un fichier --------------------------------------------------
    if (req.method === "POST" && !key) {
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return json(
          { error: `Content-Type invalide pour un envoi de fichier : "${contentType}". Attendu: multipart/form-data.` },
          400
        );
      }

      let form;
      try {
        form = await req.formData();
      } catch (e) {
        return json({ error: "Impossible de lire les données envoyées (multipart/form-data invalide) : " + e.message }, 400);
      }

      const file = form.get("file");
      if (!(file instanceof File)) {
        return json({ error: "Aucun fichier reçu (champ 'file' manquant ou invalide)." }, 400);
      }
      if (file.size === 0) {
        return json({ error: "Le fichier envoyé est vide." }, 400);
      }
      if (file.size > MAX_SIZE) {
        return json({ error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(2)} Mo). Limite : 5 Mo.` }, 400);
      }

      const extension = ext(file.name);
      if (!ALLOWED.has(extension)) {
        return json(
          { error: `Type de fichier non autorisé : "${extension || "inconnu"}". Types acceptés : ${[...ALLOWED].join(", ")}.` },
          400
        );
      }

      const category = String(form.get("category") || "autre").trim() || "autre";
      const title = String(form.get("title") || "").slice(0, 200);

      const id = crypto.randomUUID();
      const blobKey = `${id}-${safe(file.name)}`;

      const meta = {
        name: file.name,
        title,
        category,
        type: file.type || "application/octet-stream",
        size: String(file.size),
        createdAt: String(Date.now())
      };

      try {
        const buffer = await file.arrayBuffer();
        await store.set(blobKey, buffer, { metadata: meta });
      } catch (e) {
        return json({ error: "Échec de l'enregistrement dans Netlify Blobs : " + e.message }, 500);
      }

      return json({ ok: true, key: blobKey, name: file.name, category });
    }

    // --- Actions sur un fichier précis (GET / DELETE) ------------------------
    if (key) {
      let meta;
      try {
        meta = await store.getMetadata(key);
      } catch (e) {
        return json({ error: "Erreur lors de la lecture des métadonnées : " + e.message }, 500);
      }
      if (!meta) return json({ error: "Fichier introuvable." }, 404);

      if (req.method === "DELETE") {
        try {
          await store.delete(key);
        } catch (e) {
          return json({ error: "Échec de la suppression : " + e.message }, 500);
        }
        return json({ ok: true });
      }

      if (req.method === "GET") {
        const blob = await store.get(key, { type: "blob" });
        if (!blob) return json({ error: "Fichier introuvable." }, 404);
        return new Response(blob, {
          headers: {
            "content-type": meta.metadata?.type || "application/octet-stream",
            "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.metadata?.name || "fichier")}`,
            "cache-control": "private, max-age=0"
          }
        });
      }

      return json({ error: `Méthode ${req.method} non supportée sur cette route.` }, 405);
    }

    return json({ error: `Route inconnue : ${req.method} ${url.pathname}` }, 404);
  } catch (e) {
    // Filet de sécurité : quel que soit le problème (Blobs mal configuré,
    // exception inattendue...), on renvoie toujours un JSON exploitable
    // au lieu de laisser Netlify renvoyer une réponse vide -> "Error serveur".
    return json({ error: "Erreur interne de la fonction : " + (e?.message || String(e)) }, 500);
  }
};

export const config = {
  path: ["/api/files", "/api/files/*"]
};
