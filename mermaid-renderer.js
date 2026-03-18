import { marked } from './libs/marked/17.0.4/marked.esm.js';

const DOMPURIFY_SRC = './libs/dompurify/3.3.3/purify.min.js';
const MERMAID_SRC = './libs/mermaid/11.12.0/mermaid.min.js';

const MERMAID_BASE_CONFIG = {
    startOnLoad: false,
    fontFamily: '"Calibri", "Microsoft JhengHei", "Arial", "Microsoft YaHei", "Segoe UI", sans-serif',
    fontSize: 14,
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        defaultRenderer: 'dagre-wrapper',
    },
    pie: {
        useMaxWidth: true,
        htmlLabels: true,
    },
    quadrantChart: {
        htmlLabels: true,
    },
    xychart: {
        htmlLabels: true,
    },
    requirement: {
        htmlLabels: true,
    },
    gantt: {
        htmlLabels: true,
    },
    sequence: {
        messageAlign: 'center',
        htmlLabels: true,
    },
    class: {
        htmlLabels: true,
    },
    state: {
        htmlLabels: true,
    },
    journey: {
        htmlLabels: true,
    },
    c4: {
        htmlLabels: true,
    },
    sankey: {
        htmlLabels: true,
    },
    er: {
        htmlLabels: true,
    },
    securityLevel: 'loose',
};

let mermaidInitialized = false;
let initializedThemeName = null;
let renderCounter = 0;
let runtimeReadyPromise;

function isDarkColorSchemePreferred() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function getCssVariable(name, fallbackValue) {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallbackValue;
}

function getMermaidConfig() {
    const darkMode = isDarkColorSchemePreferred();

    return {
        ...MERMAID_BASE_CONFIG,
        theme: darkMode ? 'dark' : 'default',
        darkMode,
        themeVariables: {
            background: 'transparent',
            primaryColor: getCssVariable('--surface-subtle', darkMode ? '#21262d' : '#f3f4f6'),
            primaryTextColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            primaryBorderColor: getCssVariable('--border-default', darkMode ? '#30363d' : '#d0d7de'),
            secondaryColor: getCssVariable('--surface-muted', darkMode ? '#161b22' : '#f6f8fa'),
            secondaryTextColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            secondaryBorderColor: getCssVariable('--border-default', darkMode ? '#30363d' : '#d0d7de'),
            tertiaryColor: getCssVariable('--surface-background', darkMode ? '#161b22' : '#ffffff'),
            tertiaryTextColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            tertiaryBorderColor: getCssVariable('--border-default', darkMode ? '#30363d' : '#d0d7de'),
            lineColor: getCssVariable('--text-secondary', darkMode ? '#9198a1' : '#57606a'),
            textColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            mainBkg: getCssVariable('--surface-subtle', darkMode ? '#21262d' : '#f3f4f6'),
            secondBkg: getCssVariable('--surface-muted', darkMode ? '#161b22' : '#f6f8fa'),
            clusterBkg: getCssVariable('--surface-muted', darkMode ? '#161b22' : '#f6f8fa'),
            clusterBorder: getCssVariable('--border-default', darkMode ? '#30363d' : '#d0d7de'),
            nodeBorder: getCssVariable('--border-default', darkMode ? '#30363d' : '#d0d7de'),
            defaultLinkColor: getCssVariable('--text-secondary', darkMode ? '#9198a1' : '#57606a'),
            titleColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            edgeLabelBackground: getCssVariable('--surface-background', darkMode ? '#161b22' : '#ffffff'),
            labelBackground: getCssVariable('--surface-background', darkMode ? '#161b22' : '#ffffff'),
            actorBkg: getCssVariable('--surface-subtle', darkMode ? '#21262d' : '#f3f4f6'),
            actorBorder: getCssVariable('--border-default', darkMode ? '#30363d' : '#d0d7de'),
            actorTextColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            noteBkgColor: getCssVariable('--surface-muted', darkMode ? '#161b22' : '#f6f8fa'),
            noteBorderColor: getCssVariable('--border-default', darkMode ? '#30363d' : '#d0d7de'),
            noteTextColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            signalColor: getCssVariable('--text-secondary', darkMode ? '#9198a1' : '#57606a'),
            signalTextColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            labelTextColor: getCssVariable('--text-primary', darkMode ? '#f0f6fc' : '#1f2328'),
            fontFamily: MERMAID_BASE_CONFIG.fontFamily,
        },
    };
}

function getGlobalValue(name) {
    if (name === 'mermaid') {
        return window.mermaid
            || globalThis.mermaid
            || globalThis.__esbuild_esm_mermaid_nm?.mermaid
            || globalThis.__esbuild_esm_mermaid_nm?.mermaid?.default
            || window.__esbuild_esm_mermaid_nm?.mermaid
            || window.__esbuild_esm_mermaid_nm?.mermaid?.default;
    }

    return window[name] || globalThis[name];
}

function waitForGlobal(globalName, src) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();

        const poll = () => {
            if (!globalName || getGlobalValue(globalName)) {
                resolve();
                return;
            }

            if (Date.now() - startedAt > 3000) {
                reject(new Error(`載入逾時: ${src}`));
                return;
            }

            window.setTimeout(poll, 30);
        };

        poll();
    });
}

function loadScriptOnce(src, globalName) {
    if (globalName && getGlobalValue(globalName)) {
        return Promise.resolve();
    }

    const absoluteSrc = new URL(src, window.location.href).href;
    const existing = Array.from(document.scripts).find((script) => script.src === absoluteSrc);

    if (existing) {
        if (globalName && getGlobalValue(globalName)) {
            existing.dataset.loaded = 'true';
            return Promise.resolve();
        }

        if (existing.dataset.loaded === 'true') {
            return waitForGlobal(globalName, src);
        }

        if (document.readyState !== 'loading') {
            return waitForGlobal(globalName, src);
        }

        return new Promise((resolve, reject) => {
            existing.addEventListener('load', () => {
                existing.dataset.loaded = 'true';
                waitForGlobal(globalName, src).then(resolve).catch(reject);
            }, { once: true });
            existing.addEventListener('error', () => {
                reject(new Error(`載入失敗: ${src}`));
            }, { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            waitForGlobal(globalName, src).then(resolve).catch(reject);
        }, { once: true });
        script.addEventListener('error', () => {
            reject(new Error(`載入失敗: ${src}`));
        }, { once: true });
        document.head.appendChild(script);
    });
}

export async function ensureRendererRuntime() {
    if (runtimeReadyPromise) {
        return runtimeReadyPromise;
    }

    runtimeReadyPromise = (async () => {
        if (!getGlobalValue('DOMPurify')) {
            await loadScriptOnce(DOMPURIFY_SRC, 'DOMPurify');
        }

        if (!getGlobalValue('mermaid')) {
            await loadScriptOnce(MERMAID_SRC, 'mermaid');
        }

        if (!getGlobalValue('DOMPurify')) {
            throw new Error('缺少 DOMPurify，無法啟用 XSS 防護');
        }

        if (!getGlobalValue('mermaid')) {
            throw new Error('缺少 Mermaid runtime，請確認已提供本地 libs/mermaid/.../mermaid.min.js');
        }
    })();

    return runtimeReadyPromise;
}

function getDOMPurify() {
    const purify = getGlobalValue('DOMPurify');

    if (!purify) {
        throw new Error('缺少 DOMPurify，無法啟用 XSS 防護');
    }

    return purify;
}

function getMermaid() {
    const mermaid = getGlobalValue('mermaid');

    if (!mermaid) {
        throw new Error('缺少 Mermaid runtime，請確認已提供本地 libs/mermaid/.../mermaid.min.js');
    }

    return mermaid;
}

function sanitizeHtml(html) {
    return getDOMPurify().sanitize(html, {
        USE_PROFILES: { html: true },
    });
}

function ensureMermaidInitialized() {
    const config = getMermaidConfig();

    if (mermaidInitialized && initializedThemeName === config.theme) {
        return;
    }

    getMermaid().initialize(config);
    mermaidInitialized = true;
    initializedThemeName = config.theme;
}

function processMarkdownInMermaid(mermaidCode) {
    return mermaidCode.replace(/"([^"]*)"/g, (match, content) => {
        if (!content.trim()) {
            return match;
        }

        const dirtyHtml = marked.parseInline(content);
        const cleanHtml = sanitizeHtml(dirtyHtml);
        return `"${cleanHtml}"`;
    });
}

function createMermaidError(message, sourceCode) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-error';

    const title = document.createElement('strong');
    title.textContent = 'Mermaid 渲染失敗';

    const detail = document.createElement('div');
    detail.className = 'mermaid-error-message';
    detail.textContent = message;

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'language-mermaid';
    code.textContent = sourceCode;
    pre.appendChild(code);

    wrapper.append(title, detail, pre);
    return wrapper;
}

function getMermaidCodeBlocks(container) {
    return Array.from(container.querySelectorAll('pre > code')).filter((code) => {
        return /\b(?:language|lang)-mermaid\b/i.test(code.className);
    });
}

function normalizeRenderedSvg(wrapper) {
    const svg = wrapper.querySelector('svg');

    if (!svg) {
        return;
    }

    svg.removeAttribute('height');
    svg.style.maxWidth = '100%';
    svg.style.height = 'auto';
    svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet');
}

export function renderMarkdownToSafeHtml(markdownText) {
    const dirtyHtml = marked.parse(markdownText);
    return sanitizeHtml(dirtyHtml);
}

export async function renderMermaidDiagrams(container) {
    const blocks = getMermaidCodeBlocks(container);

    if (blocks.length === 0) {
        return;
    }

    let mermaid;

    try {
        mermaid = getMermaid();
        ensureMermaidInitialized();
    } catch (error) {
        for (const code of blocks) {
            const pre = code.parentElement;
            pre.replaceWith(createMermaidError(error.message, code.textContent || ''));
        }
        return;
    }

    for (const code of blocks) {
        const pre = code.parentElement;
        const sourceCode = (code.textContent || '').trim();
        const diagramCode = processMarkdownInMermaid(sourceCode);

        try {
            const diagramId = `mermaid-diagram-${renderCounter++}`;
            const { svg, bindFunctions } = await mermaid.render(diagramId, diagramCode);
            const wrapper = document.createElement('div');
            wrapper.className = 'mermaid-diagram';
            wrapper.innerHTML = svg;
            normalizeRenderedSvg(wrapper);
            bindFunctions?.(wrapper);
            pre.replaceWith(wrapper);
        } catch (error) {
            pre.replaceWith(createMermaidError(error.message, sourceCode));
        }
    }
}