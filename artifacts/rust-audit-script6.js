
const GLUE = "https://nova-content.invalid/content/noah-import/games/1048-runtime/bf12ac6a918f4724.mjs";

// The offline page's files: base64 in the script elements below the page,
// each read once and dropped from the page.
function held(id) {
    const element = document.getElementById(id);
    const text = element.textContent;
    element.remove();
    if (Uint8Array.fromBase64) return Uint8Array.fromBase64(text);
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function gunzip(bytes) {
    return new Uint8Array(await new Response(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
}

globalThis.horizonOffline = async () => {
    status.textContent = "Loading the game�";
    const glue = await import(GLUE);
    // Runs the game's main, which only registers the game to start.
    await glue.default({ module_or_path: await gunzip(held("horizon-wasm")) });
    status.textContent = "Unpacking resources�";
    const tar = await gunzip(held("horizon-boot"));
    // The files the game reads later: one block, cut by the manifest's lengths.
    const store = await gunzip(held("horizon-store"));
    const manifest = document.getElementById("horizon-manifest").textContent;
    const index = new Map();
    let at = 0;
    for (const line of manifest.split("\n")) {
        if (!line) continue;
        const [rel, length] = line.split("\t");
        index.set(rel, [at, Number(length)]);
        at += Number(length);
    }
    // horizon-os's horizon_fetch_sync asks here before it fetches.
    globalThis.horizonHeldFile = (url) => {
        const file = url.startsWith("held:") && index.get(url.slice(5));
        return file ? store.subarray(file[0], file[0] + file[1]) : undefined;
    };
    return { glue, tar, manifest, base: "held:" };
};

// Used by `web/package.py --sounds cdn`: the sound files are not embedded in
// the page. The repo's split sound archive is downloaded from jsDelivr and
// unpacked into the same in-memory "held:" files the game's synchronous sound
// decoder asks for.
// Pin the commit: jsDelivr's branch URLs refuse packages over 50 MB, while
// commit URLs serve the uploaded archive chunks. The snapshot's commit is
// also the current origin/main commit.
const SOUND_COMMIT = "b21a7ae704b415182631429a7e71c797287661df";
const SOUND_CDN = `https://cdn.jsdelivr.net/gh/AlexBoops/mc-rust-onweb@${SOUND_COMMIT}/`;
const SOUND_MANIFEST = `${SOUND_CDN}parts.json`;
// jsDelivr caps a GitHub package at 50 MB, so uncached archive chunks can be
// refused even though the commit URL is valid. The repo's Pages copy of the
// same files has CORS enabled and is the per-chunk fallback.
const SOUND_FALLBACK = "https://alexboops.github.io/mc-rust-onweb/";
const SOUND_ARCHIVE = "fs/res/assets/minecraft/sound.tar.gz";

function cdnStatus(text) {
    const element = document.getElementById("status");
    if (element) element.textContent = text;
}

function parseSoundTar(bytes) {
    const files = new Map();
    const decoder = new TextDecoder();
    const text = (start, length) => {
        let end = start;
        while (end < start + length && bytes[end] !== 0) end++;
        return decoder.decode(bytes.subarray(start, end));
    };
    let offset = 0;
    let longName = "";
    while (offset + 512 <= bytes.length) {
        const header = bytes.subarray(offset, offset + 512);
        if (header.every((value) => value === 0)) break;
        const name = text(offset, 100);
        const prefix = text(offset + 345, 155);
        const size = Number.parseInt(text(offset + 124, 12).trim() || "0", 8) || 0;
        const type = String.fromCharCode(header[156]);
        const dataAt = offset + 512;
        const fullName = longName || (prefix ? `${prefix}/${name}` : name);
        if (type === "L") {
            longName = decoder.decode(bytes.subarray(dataAt, dataAt + size)).replace(/\0/g, "");
        } else {
            longName = "";
            if (fullName.startsWith("sound/") && fullName.endsWith(".ogg")) {
                files.set(`assets/minecraft/sounds/${fullName.slice(6)}`,
                    bytes.subarray(dataAt, dataAt + size));
            }
        }
        offset = dataAt + Math.ceil(size / 512) * 512;
    }
    return files;
}

async function soundEntry(parts) {
    let entry = parts[SOUND_ARCHIVE];
    if (!entry || !Array.isArray(entry.parts)) {
        // jsDelivr can keep an old parts.json after a GitHub upload; GitHub's
        // raw manifest still names the sound archive. A CORS refusal here just
        // falls through to the fixed part list below.
        try {
            const response = await fetch(SOUND_MANIFEST, { cache: "no-store" });
            if (response.ok) {
                const full = JSON.parse((await response.text()).replace(/^\uFEFF/, ""));
                entry = full[SOUND_ARCHIVE];
            }
        } catch {
            // use the fixed list
        }
    }
    // Last resort: the archive is uploaded as 18 fixed-size parts.
    if (!entry || !Array.isArray(entry.parts)) {
        entry = {
            parts: Array.from({ length: 18 }, (_, i) => `${SOUND_ARCHIVE}.part${i}`),
            size: 354952979,
        };
    }
    return entry;
}

async function fetchSoundPart(part, index, total) {
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 120000);
        try {
            const response = await fetch(`${SOUND_CDN}${part}`, {
                cache: "default", signal: controller.signal,
            });
            if (response.ok) {
                const piece = new Uint8Array(await response.arrayBuffer());
                cdnStatus(`Downloading sound files ${index}/${total}…`);
                return piece;
            }
            lastError = new Error(`${part}: ${response.status}`);
            // A 403 here is jsDelivr's package cap; don't spend retries on it.
            if (response.status !== 429 && response.status < 500) break;
        } catch (error) {
            lastError = error;
        } finally {
            clearTimeout(timer);
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
    // Same GitHub content, served by the repository's Pages site.
    const response = await fetch(`${SOUND_FALLBACK}${part}`, { cache: "default" });
    if (!response.ok) {
        throw new Error(`${lastError?.message ?? part}; Pages fallback: ${response.status}`);
    }
    cdnStatus(`Downloading sound files ${index}/${total}…`);
    return new Uint8Array(await response.arrayBuffer());
}

async function downloadSoundArchive() {
    cdnStatus("Downloading sound files…");
    const partsResponse = await fetch(`${SOUND_CDN}parts.json`, { cache: "no-store" });
    if (!partsResponse.ok) throw new Error(`jsDelivr parts.json: ${partsResponse.status}`);
    const parts = JSON.parse((await partsResponse.text()).replace(/^\uFEFF/, ""));
    const entry = await soundEntry(parts);
    // Commit URLs bypass the branch-package limit; the chunks can go together.
    const pieces = await Promise.all(entry.parts.map((part, index) =>
        fetchSoundPart(part, index + 1, entry.parts.length)));
    const size = pieces.reduce((total, piece) => total + piece.length, 0);
    if (entry.size && size !== entry.size) {
        throw new Error(`sound parts are ${size} bytes, not ${entry.size}`);
    }
    const archive = new Uint8Array(size);
    let at = 0;
    for (const piece of pieces) {
        archive.set(piece, at);
        at += piece.length;
    }
    return parseSoundTar(await gunzip(archive));
}

const cdnBaseOffline = globalThis.horizonOffline;
globalThis.horizonOffline = async () => {
    const files = await downloadSoundArchive();
    cdnStatus("Starting the game…");
    const base = await cdnBaseOffline();
    // The game's sound registry lists `assets/minecraft/sounds` through the
    // filesystem, so the downloaded files must be in the manifest too, not
    // only behind `horizonHeldFile`.
    const soundManifest = Array.from(files, ([path, bytes]) =>
        `${path}\t${bytes.length}`).join("\n");
    if (soundManifest) {
        const separator = base.manifest && !base.manifest.endsWith("\n") ? "\n" : "";
        base.manifest = `${base.manifest ?? ""}${separator}${soundManifest}\n`;
    }
    const baseHeld = globalThis.horizonHeldFile;
    globalThis.horizonHeldFile = (url) => {
        if (typeof url === "string" && url.startsWith("held:")) {
            const file = files.get(url.slice(5));
            if (file) return file;
        }
        return baseHeld?.(url);
    };
    return base;
};

// Loads the game, installs the prepared resources and the player's saved
// files in its virtual filesystem, then starts it and keeps saving the
// player's files in the browser's storage (OPFS). A service worker (sw.js)
// keeps the large files for later visits. The offline page (web/package.py)
// sets globalThis.horizonOffline, which hands over the files it holds instead.
 // before the game's glue, which keeps the AudioContext it finds

const ROOT = ".local/horizon-client/26.3";
const status = document.getElementById("status");

// A small always-on readout for the web port: browser frame rate and the
// round-trip time of a tiny resource request to the page's host.
function installPerf() {
    if (location.protocol === "about:") return;
    let el = document.getElementById("perf");
    if (!el) {
        el = document.createElement("div");
        el.id = "perf";
        el.setAttribute("aria-label", "Frame rate and network latency");
        el.textContent = "FPS -- · PING --";
        el.style.cssText = "position:fixed;top:12px;right:12px;z-index:1000000;" +
            "padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.55);" +
            "border:1px solid rgba(255,153,0,.55);color:#ffb347;" +
            "font:600 12px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace;" +
            "letter-spacing:.3px;text-shadow:0 1px 2px #000;pointer-events:none;" +
            "white-space:nowrap;";
        document.body.appendChild(el);
    }
    let frames = 0, since = performance.now(), fps = 0, ping = null, checking = false;
    const draw = () => {
        el.textContent = `FPS ${fps || "--"} · PING ${ping == null ? "--" : `${ping} ms`}`;
    };
    const frame = (now) => {
        frames += 1;
        if (now - since >= 500) {
            fps = Math.round((frames * 1000) / (now - since));
            frames = 0;
            since = now;
            draw();
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    // A file:// page has no host to ping; the offline page also holds its own
    // resources, so polling fs/manifest.txt would only fail CORS every 2 s.
    const offline = location.protocol === "file:" || globalThis.horizonOffline;
    const checkPing = async () => {
        if (offline || checking) return;
        checking = true;
        const started = performance.now();
        try {
            const response = await fetch(`fs/manifest.txt?ping=${Date.now()}`, {
                method: "HEAD", cache: "no-store",
            });
            ping = response.ok ? Math.round(performance.now() - started) : null;
        } catch {
            ping = null;
        }
        checking = false;
        draw();
    };
    if (!offline) {
        checkPing();
        setInterval(checkPing, 2000);
    } else {
        draw();
    }
}
installPerf();

// Whether this browser can draw the game; says why not on the page.
async function webgpu() {
    if (!navigator.gpu) {
        status.textContent = `Horizon needs WebGPU, which this browser doesn't offer.`;
        return false;
    }
    if (!(await navigator.gpu.requestAdapter().catch(() => null))) {
        status.textContent = "Horizon needs WebGPU, and this browser offers it but found no GPU to use " +
            `(it may be switched off, or the graphics driver not supported).`;
        return false;
    }
    return true;
}

// Starts the service worker and, on a first visit, waits briefly for it to
// take over the page, so the large files it fetches are kept.
// A host that sends no isolation headers (a static host) gets them from the
// service worker: once it controls the page, a reload makes it isolated.
async function cacheWorker() {
    const workers = navigator.serviceWorker;
    if (!workers) return;
    try {
        await workers.register("sw.js");
        if (!workers.controller) {
            await Promise.race([
                new Promise((resolve) => workers.addEventListener("controllerchange", resolve, { once: true })),
                new Promise((resolve) => setTimeout(resolve, 3000)),
            ]);
        }
    } catch (e) {
        console.warn(`Horizon: no service worker, files won't be kept for later visits: ${e}`);
        return;
    }
    if (!window.crossOriginIsolated && workers.controller && !sessionStorage.getItem("horizon-isolating")) {
        sessionStorage.setItem("horizon-isolating", "1");
        location.reload();
        await new Promise(() => {});
    }
    sessionStorage.removeItem("horizon-isolating");
}

// The large files' addresses with their content hash (build.json), which the
// service worker keeps them by. A page that can't share memory (not cross-origin
// isolated) runs the single-threaded build when the folder has it (pkg-st/).
async function versioned() {
    const files = await fetch("build.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
    const at = (path) => (files[path] ? `${path}?v=${files[path]}` : path);
    const pkg = !window.crossOriginIsolated && files["pkg-st/horizon-client_bg.wasm"] ? "pkg-st" : "pkg";
    // The module must come from the same build as its glue (pkg/horizon-client.js), so it is
    // loaded from this folder, never from another host.
    return {
        pkg,
        wasmPath: `${pkg}/horizon-client_bg.wasm`,
        wasm: at(`${pkg}/horizon-client_bg.wasm`),
        boot: at("fs/boot.tar.gz"),
    };
}

async function download(url, label, parts) {
    const entry = parts[url.split("?")[0]];
    const response = entry
        ? new Response(await joined(url, entry), { headers: { "Content-Length": String(entry.size) } })
        : await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
    const total = Number(response.headers.get("Content-Length")) || 0;
    let received = 0;
    const counted = response.body.pipeThrough(new TransformStream({
        transform(chunk, controller) {
            received += chunk.length;
            if (total) status.textContent = `${label} ${Math.round((received / total) * 100)}%`;
            controller.enqueue(chunk);
        },
    }));
    return counted;
}

// The player's files (options, saves) live under this folder of the
// origin's private file system, laid out as in the virtual filesystem. Where
// that is refused (a file:// page: the offline file), in IndexedDB instead,
// one record per path.
async function savedRoot() {
    try {
        return await (await navigator.storage.getDirectory()).getDirectoryHandle("horizon", { create: true });
    } catch (e) {
        try {
            return await idbOpen();
        } catch (e2) {
            console.warn(`Horizon: no browser storage, nothing will be saved: ${e}; ${e2}`);
            return null;
        }
    }
}

function idbRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function idbOpen() {
    const request = indexedDB.open("horizon", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    return idbRequest(request);
}

// A path's record: { data, modified } for a file, { data: null } for a folder.
async function idbLoad(glue, db) {
    const files = db.transaction("files").objectStore("files");
    const [paths, records] = await Promise.all([idbRequest(files.getAllKeys()), idbRequest(files.getAll())]);
    // In key order: a folder before what it holds.
    paths.forEach((path, i) => {
        const { data, modified } = records[i];
        if (data) glue.horizon_install_saved_file(path, data, modified);
        else glue.horizon_install_saved_dir(path);
    });
    return records.filter((r) => r.data).length;
}

async function idbApply(db, path, kind, data) {
    const transaction = db.transaction("files", "readwrite");
    const files = transaction.objectStore("files");
    if (kind !== "dir") files.delete(IDBKeyRange.bound(`${path}/`, `${path}/\uffff`));
    if (kind === "gone") files.delete(path);
    else files.put(kind === "file" ? { data, modified: Date.now() } : { data: null }, path);
    await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
}

async function loadSaved(glue, dir, path) {
    if (dir instanceof IDBDatabase) return idbLoad(glue, dir);
    let files = 0;
    for await (const [name, handle] of dir.entries()) {
        const at = `${path}/${name}`;
        if (handle.kind === "directory") {
            glue.horizon_install_saved_dir(at);
            files += await loadSaved(glue, handle, at);
        } else {
            const file = await handle.getFile();
            glue.horizon_install_saved_file(at, new Uint8Array(await file.arrayBuffer()), file.lastModified);
            files += 1;
        }
    }
    return files;
}

// The folder holding `parts`, made when `create`; null when it's missing.
async function folder(root, parts, create) {
    let dir = root;
    for (const part of parts) {
        try {
            dir = await dir.getDirectoryHandle(part, { create });
        } catch (e) {
            if (create && e.name === "TypeMismatchError") {
                // A file where a folder goes now.
                await dir.removeEntry(part);
                dir = await dir.getDirectoryHandle(part, { create });
            } else if (e.name === "NotFoundError") {
                return null;
            } else {
                throw e;
            }
        }
    }
    return dir;
}

async function apply(root, path, kind, data) {
    if (root instanceof IDBDatabase) return idbApply(root, path, kind, data);
    const parts = path.split("/").filter(Boolean);
    if (kind === "gone") {
        const dir = await folder(root, parts.slice(0, -1), false);
        await dir?.removeEntry(parts.at(-1), { recursive: true }).catch((e) => {
            if (e.name !== "NotFoundError") throw e;
        });
    } else if (kind === "file") {
        const dir = await folder(root, parts.slice(0, -1), true);
        const name = parts.at(-1);
        let handle;
        try {
            handle = await dir.getFileHandle(name, { create: true });
        } catch (e) {
            if (e.name !== "TypeMismatchError") throw e;
            // A folder where a file goes now.
            await dir.removeEntry(name, { recursive: true });
            handle = await dir.getFileHandle(name, { create: true });
        }
        // Written to a scratch file and swapped in on close: never half a file.
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
    } else {
        if (kind === "cleardir") {
            const dir = await folder(root, parts.slice(0, -1), false);
            await dir?.removeEntry(parts.at(-1), { recursive: true }).catch(() => {});
        }
        await folder(root, parts, true);
    }
}

// Saves what the game changed since the last time, one batch at a time.
let saving = null;
function saveChanges(glue, root) {
    saving ??= (async () => {
        for (const [path, kind, data] of glue.horizon_take_changes()) {
            try {
                await apply(root, path, kind, data);
            } catch (e) {
                console.error(`Horizon: could not save ${path}: ${e}`);
            }
        }
    })().finally(() => {
        saving = null;
    });
    return saving;
}

// A file the host won't take whole comes from its parts here
// (web/split_parts.py): joined in order, checked against the original size.
async function joined(url, entry) {
    const version = new URL(url, location.href).search;
    const pieces = await Promise.all(entry.parts.map(async (part) => {
        const response = await fetch(part + version);
        if (!response.ok) throw new Error(`${part}: ${response.status} ${response.statusText}`);
        return new Uint8Array(await response.arrayBuffer());
    }));
    const size = pieces.reduce((n, piece) => n + piece.length, 0);
    if (entry.size && size !== entry.size) {
        throw new Error(`the parts of ${url} are ${size} bytes, not ${entry.size}`);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const piece of pieces) {
        bytes.set(piece, at);
        at += piece.length;
    }
    return bytes;
}

// The single-threaded build grows its wasm memory on demand, up to the
// module's 4 GiB maximum. Pre-growing it left too little headroom: a 3.25 GiB
// reservation trapped when a world was created, and held the page under memory
// pressure while it played.

// The game's glue, its module and the resources, from the server.
async function served() {
    await cacheWorker();
    const files = await versioned();
    status.textContent = "Loading the game…";
    const glue = await import(`./${files.pkg}/horizon-client.js`);
    const parts = await fetch("parts.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
    // Runs the game's main, which only registers the game to start.
    const module = parts[files.wasmPath] ? await joined(files.wasm, parts[files.wasmPath]) : files.wasm;
    await glue.default({ module_or_path: module });
    const gz = await download(files.boot, "Downloading resources", parts).catch((e) => {
        throw new Error(`${e}\n\nThe game's resources aren't in this folder (fs/boot.tar.gz). They are made from ` +
            "your own copy of Minecraft: Java Edition 26.3: run horizon-prepare, then web/build.sh (or web/bundle.py).");
    });
    const tar = new Uint8Array(
        await new Response(gz.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    const manifest = await (await fetch("fs/manifest.txt")).text();
    return { glue, tar, manifest, base: "fs/res/" };
}

async function main() {
    if (!(await webgpu())) return;
    const { glue, tar, manifest, base } = await (globalThis.horizonOffline ?? served)();
    status.textContent = "Installing resources…";
    const t0 = performance.now();
    const installed = glue.horizon_install_tar(ROOT, tar);
    glue.horizon_install_manifest(ROOT, base, manifest);
    console.log(`Horizon: ${installed} files installed in ${Math.round(performance.now() - t0)} ms`);

    const root = await savedRoot();
    if (root) {
        const t1 = performance.now();
        const saved = await loadSaved(glue, root, "");
        console.log(`Horizon: ${saved} saved files loaded in ${Math.round(performance.now() - t1)} ms`);
        setInterval(() => saveChanges(glue, root), 2000);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) saveChanges(glue, root);
        });
        addEventListener("pagehide", () => saveChanges(glue, root));
    }

    status.textContent = "Loading resources…";
    // Let the status paint before the game blocks the page while it loads.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    status.textContent = "";
    // The game's command-line arguments, from the address: ?args=--world%20T
    const args = (new URLSearchParams(location.search).get("args") ?? "").split(" ").filter(Boolean);
    try {
        glue.horizon_start(args);
    } catch (e) {
        // winit leaves Rust's stack by throwing once its event loop is set up.
        if (!String(e).includes("Using exceptions for control flow")) throw e;
    }
}

main().catch((e) => {
    console.error(e);
    // The threaded build shares memory between workers, which browsers allow
    // only on a cross-origin isolated page.
    const isolation = window.crossOriginIsolated ? "" :
        "\n\nThe page isn't cross-origin isolated: its server must send " +
        "Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.";
    status.textContent = `Horizon could not start:\n${e}${isolation}`;
});
