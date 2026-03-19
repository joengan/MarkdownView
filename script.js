import hljs from './libs/highlightjs/11.11.1/highlight.min.js';
import { ensureRendererRuntime, renderMarkdownToSafeHtml, renderMermaidDiagrams } from './mermaid-renderer.js';

const supportedMarkdownExtensions = Object.freeze([
    '.md',
    '.markdown',
    '.mdown',
    '.mkd',
    '.mkdn',
    '.mdwn',
    '.mdtxt',
    '.mdtext'
]);

const urlParams = new URLSearchParams(window.location.search);
const contentElement = document.getElementById('content');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const downloadBtn = document.getElementById('downloadBtn');
let currentMarkdownText = '';
let renderRequestId = 0;

function setMessage(title, message) {
    contentElement.innerHTML = `<h1>${title}</h1><p>${message}</p>`;
}

function resolveFilePath() {
    const rawFilePath = urlParams.get('file');

    if (!rawFilePath) {
        return null;
    }

    try {
        return decodeURIComponent(rawFilePath);
    } catch {
        return rawFilePath;
    }
}

function getFilePathForExtensionCheck(filePath) {
    return filePath.split('#')[0].split('?')[0].toLowerCase();
}

function createCacheBuster() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildFileRequestUrl(filePath, cacheBuster) {
    const requestUrl = new URL(filePath, window.location.href);
    requestUrl.hash = '';
    requestUrl.searchParams.set('raw', '1');

    if (cacheBuster) {
        requestUrl.searchParams.set('_', cacheBuster);
    }

    return requestUrl.toString();
}

function isSupportedMarkdownFile(filePath) {
    const normalizedFilePath = getFilePathForExtensionCheck(filePath);
    return supportedMarkdownExtensions.some((extension) => normalizedFilePath.endsWith(extension));
}

function formatCodeLanguageLabel(language) {
    if (!language) {
        return '';
    }

    const normalized = language.trim().toLowerCase();

    if (!normalized) {
        return '';
    }

    const languageAliases = {
        js: 'JavaScript',
        jsx: 'JSX',
        ts: 'TypeScript',
        tsx: 'TSX',
        html: 'HTML',
        xml: 'XML',
        css: 'CSS',
        scss: 'SCSS',
        sass: 'Sass',
        less: 'Less',
        json: 'JSON',
        yaml: 'YAML',
        yml: 'YAML',
        md: 'Markdown',
        sh: 'Shell',
        bash: 'Bash',
        ps1: 'PowerShell',
        powershell: 'PowerShell',
        py: 'Python',
        rb: 'Ruby',
        php: 'PHP',
        go: 'Go',
        rs: 'Rust',
        java: 'Java',
        kt: 'Kotlin',
        kts: 'Kotlin',
        cs: 'C#',
        cpp: 'C++',
        cxx: 'C++',
        cc: 'C++',
        c: 'C',
        sql: 'SQL',
        plaintext: 'Plain Text',
        text: 'Plain Text',
        txt: 'Plain Text',
        dockerfile: 'Dockerfile',
        mermaid: 'Mermaid',
    };

    if (languageAliases[normalized]) {
        return languageAliases[normalized];
    }

    return normalized
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getCodeBlockLanguageLabel(code) {
    const classNames = Array.from(code.classList);
    const languageClass = classNames.find((className) => /^(?:language|lang)-/i.test(className));
    const rawLanguage = languageClass
        ? languageClass.replace(/^(?:language|lang)-/i, '')
        : code.dataset.language || code.getAttribute('data-language') || '';

    return formatCodeLanguageLabel(rawLanguage);
}

function attachCopyButtons() {
    const createCopyButton = (getText) => {
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.type = 'button';
        button.innerText = '複製';

        button.addEventListener('click', () => {
            const text = getText();
            if (!text) return;

            navigator.clipboard.writeText(text).then(() => {
                button.innerText = '已複製';
                setTimeout(() => {
                    button.innerText = '複製';
                }, 1500);
            });
        });

        return button;
    };

    document.querySelectorAll('#content code').forEach((code) => {
        const pre = code.parentElement;
        const isBlockCode = pre && pre.tagName === 'PRE';

        if (isBlockCode) {
            if (pre.parentElement && pre.parentElement.classList.contains('code-block-container')) return;

            if (!pre.hasAttribute('tabindex')) pre.setAttribute('tabindex', '0');

            const container = document.createElement('div');
            container.className = 'code-block-container';

            const header = document.createElement('div');
            header.className = 'code-block-header';

            const languageLabel = document.createElement('span');
            languageLabel.className = 'code-block-language';
            languageLabel.textContent = getCodeBlockLanguageLabel(code);

            header.append(languageLabel, createCopyButton(() => code.textContent));

            pre.parentNode.insertBefore(container, pre);
            container.append(header, pre);
            return;
        }

        if (code.parentElement && code.parentElement.classList.contains('inline-code-wrapper')) return;

        const wrapper = document.createElement('span');
        wrapper.className = 'inline-code-wrapper';
        wrapper.tabIndex = 0;

        code.parentNode.insertBefore(wrapper, code);
        wrapper.appendChild(code);
        wrapper.appendChild(createCopyButton(() => code.textContent));
    });
}

async function renderContent(markdownText) {
    currentMarkdownText = markdownText;
    const requestId = ++renderRequestId;

    contentElement.innerHTML = renderMarkdownToSafeHtml(markdownText);
    await renderMermaidDiagrams(contentElement);

    if (requestId !== renderRequestId) {
        return;
    }

    attachCopyButtons();
    hljs.highlightAll();
}

function installSystemThemeSync() {
    if (!window.matchMedia) {
        return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = async () => {
        if (!currentMarkdownText) {
            return;
        }

        await renderContent(currentMarkdownText);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', () => {
            handleThemeChange().catch((error) => {
                setMessage('錯誤', error.message);
            });
        });
        return;
    }

    mediaQuery.addListener(() => {
        handleThemeChange().catch((error) => {
            setMessage('錯誤', error.message);
        });
    });
}

async function boot() {
    const filePath = resolveFilePath();

    if (!filePath) {
        fileNameDisplay.textContent = '未指定檔案';
        downloadBtn.removeAttribute('href');
        setMessage('錯誤', `缺少 file 參數，無法載入 Markdown。當前查詢字串：${window.location.search || '(空)'}`);
        return;
    }

    if (!isSupportedMarkdownFile(filePath)) {
        const extensionList = supportedMarkdownExtensions.join(', ');
        fileNameDisplay.textContent = '不支援的檔案類型';
        downloadBtn.removeAttribute('href');
        setMessage('錯誤', `目前僅支援以下 Markdown 副檔名：${extensionList}`);
        return;
    }

    const fileName = filePath.split('/').pop();
    document.title = fileName;
    fileNameDisplay.textContent = fileName;

    const cacheBuster = createCacheBuster();
    const bypassUrl = buildFileRequestUrl(filePath, cacheBuster);
    downloadBtn.href = bypassUrl;
    downloadBtn.download = fileName;

    const response = await fetch(bypassUrl, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`檔案讀取失敗：${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    await ensureRendererRuntime();
    await renderContent(text);
    installSystemThemeSync();
}

boot().catch((err) => {
    fileNameDisplay.textContent = '載入失敗';
    setMessage('錯誤', err.message);
});