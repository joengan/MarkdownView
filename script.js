import hljs from './libs/highlightjs/11.11.1/highlight.min.js';
import { ensureRendererRuntime, renderMarkdownToSafeHtml, renderMermaidDiagrams } from './mermaid-renderer.js';

const urlParams = new URLSearchParams(window.location.search);
const contentElement = document.getElementById('content');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const downloadBtn = document.getElementById('downloadBtn');

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
                button.innerText = '已複製！';
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
            if (pre.querySelector(':scope > .copy-code-btn')) return;

            if (!pre.hasAttribute('tabindex')) pre.setAttribute('tabindex', '0');
            pre.prepend(createCopyButton(() => code.textContent));
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

async function boot() {
    const filePath = resolveFilePath();

    if (!filePath) {
        fileNameDisplay.textContent = '未指定檔案';
        downloadBtn.removeAttribute('href');
        setMessage('錯誤', `缺少 file 參數，無法載入 Markdown。當前查詢字串：${window.location.search || '(空)'}`);
        return;
    }

    const fileName = filePath.split('/').pop();
    document.title = fileName;
    fileNameDisplay.textContent = fileName;

    const bypassUrl = filePath + (filePath.includes('?') ? '&' : '?') + 'raw=1';
    downloadBtn.href = bypassUrl;
    downloadBtn.download = fileName;

    const response = await fetch(bypassUrl);
    if (!response.ok) {
        throw new Error(`檔案讀取失敗：${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    await ensureRendererRuntime();
    contentElement.innerHTML = renderMarkdownToSafeHtml(text);
    await renderMermaidDiagrams(contentElement);
    attachCopyButtons();
    hljs.highlightAll();
}

boot().catch((err) => {
    fileNameDisplay.textContent = '載入失敗';
    setMessage('錯誤', err.message);
});