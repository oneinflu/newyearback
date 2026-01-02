const crypto = require("crypto");
require("dotenv").config();

async function createDirectory(path) {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const key = process.env.BUNNY_ACCESS_KEY;
  if (!zone || !key) throw new Error("bunny_not_configured");
  const base = `https://storage.bunnycdn.com/${zone}/${path}`.replace(/\/+/g, "/").replace(":/", "://");
  const url = `${base}/`.replace(/\/+/g, "/").replace(":/", "://");
  const res = await fetch(url, { method: "PUT", headers: { AccessKey: key, "Content-Length": "0" } });
  if (!res.ok && res.status !== 409) throw new Error("bunny_storage_error");
  return true;
}

function userFolder(username) {
  const safe = String(username || "").trim().toLowerCase();
  if (!safe) throw new Error("invalid_username");
  return `users/${safe}`;
}

async function ensureUserFolder(username) {
  const path = userFolder(username);
  await createDirectory(path);
  return path;
}

function cdnBase() {
  return (process.env.BUNNY_CDN_BASE_URL || "https://oneinflu.b-cdn.net").replace(/\/+$/, "");
}

async function deleteStoragePath(path) {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const key = process.env.BUNNY_ACCESS_KEY;
  if (!zone || !key) throw new Error("bunny_not_configured");
  const url = `https://storage.bunnycdn.com/${zone}/${path}`.replace(/\/+/g, "/").replace(":/", "://");
  const res = await fetch(url, { method: "DELETE", headers: { AccessKey: key } });
  if (!res.ok && res.status !== 404) throw new Error("bunny_storage_error");
  return true;
}

function pathFromCdnUrl(url) {
  const base = cdnBase();
  const s = String(url || "");
  if (!s.startsWith(base)) return null;
  const rel = s.slice(base.length).replace(/^\/+/, "");
  return rel || null;
}

async function deleteByCdnUrl(url) {
  const path = pathFromCdnUrl(url);
  if (!path) return false;
  await deleteStoragePath(path);
  return true;
}

function idFolder(userId) {
  const safe = String(userId || "").trim();
  if (!safe) throw new Error("invalid_user_id");
  return `users/${safe}`;
}

async function ensureUserFolderId(userId) {
  const path = idFolder(userId);
  await createDirectory(path);
  return path;
}

async function uploadUserFile(usernameOrId, buffer, filename, contentType) {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const key = process.env.BUNNY_ACCESS_KEY;
  if (!zone || !key) throw new Error("bunny_not_configured");
  const isId = /^[a-f0-9]{24}$/i.test(String(usernameOrId));
  const basePath = isId ? idFolder(usernameOrId) : userFolder(usernameOrId);
  const ext = (filename || "").split(".").pop() || (contentType || "").split("/").pop() || "bin";
  const safeName = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}.${ext.toLowerCase()}`;
  const path = `${basePath}/${safeName}`.replace(/\/+/g, "/");
  const url = `https://storage.bunnycdn.com/${zone}/${path}`.replace(/\/+/g, "/").replace(":/", "://");
  const headers = {
    AccessKey: key,
    "Content-Type": contentType || "application/octet-stream"
  };
  const res = await fetch(url, { method: "PUT", headers, body: buffer });
  if (!res.ok) throw new Error("bunny_storage_error");
  const publicUrl = `${cdnBase()}/${path}`.replace(/\/+/g, "/").replace(":/", "://");
  return { path, url: publicUrl };
}

async function getFolderUsageById(userId) {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const key = process.env.BUNNY_ACCESS_KEY;
  if (!zone || !key) throw new Error("bunny_not_configured");
  const path = idFolder(userId);
  const base = `https://storage.bunnycdn.com/${zone}/${path}`.replace(/\/+/g, "/").replace(":/", "://");
  const urls = [`${base}/`, base];
  let listing = null;
  for (const u of urls) {
    const r = await fetch(u, { method: "GET", headers: { AccessKey: key, Accept: "application/json" } });
    if (r.ok) {
      try {
        listing = await r.json();
        break;
      } catch {
        listing = null;
      }
    } else if (r.status === 404) {
      continue;
    } else {
      throw new Error("bunny_storage_error");
    }
  }
  if (!listing) return 0;
  let items = Array.isArray(listing) ? listing : Array.isArray(listing?.Items) ? listing.Items : [];
  let total = 0;
  for (const entry of items) {
    const len = Number(
      entry?.Length ??
      entry?.length ??
      entry?.Size ??
      entry?.size ??
      entry?.ObjectSize ??
      0
    );
    if (isFinite(len)) total += len;
  }
  return total;
}

module.exports = {
  createDirectory,
  ensureUserFolder,
  userFolder,
  idFolder,
  ensureUserFolderId,
  uploadUserFile,
  getFolderUsageById,
  deleteStoragePath,
  pathFromCdnUrl,
  deleteByCdnUrl
};
