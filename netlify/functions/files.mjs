import { getStore } from "@netlify/blobs";

const STORE = "revisapp-files";
const ALLOWED = new Set([.doc", ".docx", ".pdf", ".txt", ".ppt", ".pptx", ".mp3"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 
