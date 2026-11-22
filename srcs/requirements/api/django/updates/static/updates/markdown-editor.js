'use strict';
(function () {
    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    function initEditor(textarea) {
        // the empty inline form used as template by Django is cloned: it must stay a plain textarea
        if (textarea.dataset.editorReady || textarea.name.includes('__prefix__'))
            return;
        textarea.dataset.editorReady = 'true';
        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-editor-wrapper';
        textarea.parentNode.insertBefore(wrapper, textarea);
        wrapper.appendChild(textarea);

        const editor = new EasyMDE({
            element: textarea,
            forceSync: true,
            spellChecker: false,
            status: ['upload-image', 'lines', 'words'],
            uploadImage: true,
            imageAccept: 'image/png, image/jpeg, image/gif, image/webp',
            imageMaxSize: 20 * 1024 * 1024,
            toolbar: ['bold', 'italic', 'heading', '|', 'unordered-list', 'ordered-list', 'quote', 'link', 'upload-image', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
            imageUploadFunction: function (file, onSuccess, onError) {
                const data = new FormData();
                data.append('image', file);
                fetch(textarea.dataset.uploadUrl, {method: 'POST', body: data, headers: {'X-CSRFToken': getCookie('csrftoken')}, credentials: 'same-origin'})
                    .then((response) => response.json().then((json) => response.ok ? onSuccess(json.url) : onError(json.error || 'Upload failed')))
                    .catch(() => onError('Upload failed'));
            },
        });
        // the editor is hidden in new inline forms: it has to be redrawn once shown
        setTimeout(() => editor.codemirror.refresh(), 0);
    }

    function initAll(root) {
        root.querySelectorAll('textarea.markdown-editor').forEach(initEditor);
    }

    document.addEventListener('DOMContentLoaded', () => initAll(document));
    document.addEventListener('formset:added', (event) => initAll(event.target));
})();
