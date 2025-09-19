import {hideElement, showElement} from './common.js';

export default class GoogleDriveProgress {

    constructor() {
        this.element = null;
        this.titleElement = null;
        this.messageElement = null;
        this.progressBar = null;
        this.summaryElement = null;
        this.closeButton = null;
        this.state = this.createIdleState();
        this.ensureElement();
    }

    createIdleState() {
        return {
            titleKey: 'google_drive_operation_idle',
            message: '',
            summary: '',
            visible: false,
            progressVisible: false,
            dismissible: false,
            tone: 'idle',
            determinate: false,
            current: 0,
            total: 0
        };
    }

    ensureElement() {
        if (this.element) {
            return;
        }

        const template = document.getElementById('googleDriveProgressTemplate');
        if (!template) {
            throw new Error('Google Drive progress template not found.');
        }

        const fragment = template.content.cloneNode(true);
        this.element = fragment.querySelector('.google-drive-progress');
        this.titleElement = this.element.querySelector('.progress-title');
        this.messageElement = this.element.querySelector('.progress-message');
        this.progressBar = this.element.querySelector('.progress-bar');
        this.summaryElement = this.element.querySelector('.progress-summary');
        this.closeButton = this.element.querySelector('.progress-close');
        this.closeButton.onclick = () => this.hide();

        document.body.append(this.element);
        window.i18n.applyTo(this.element);
        document.addEventListener('languagechange', () => this.render());
        this.render();
    }

    setState(partialState = {}) {
        this.state = {
            ...this.state,
            ...partialState
        };
        this.render();
    }

    reset() {
        this.state = this.createIdleState();
        this.render();
    }

    hide() {
        this.state.visible = false;
        this.render();
    }

    render() {
        if (!this.element) {
            return;
        }

        const {
            titleKey,
            message,
            summary,
            visible,
            progressVisible,
            dismissible,
            tone,
            determinate,
            current,
            total
        } = this.state;

        this.element.dataset.tone = tone || 'idle';
        this.titleElement.textContent = window.i18n.t(titleKey);
        this.messageElement.textContent = message || '';
        this.summaryElement.textContent = summary || '';

        if (message) {
            showElement(this.messageElement);
        } else {
            hideElement(this.messageElement);
        }

        if (summary) {
            showElement(this.summaryElement);
        } else {
            hideElement(this.summaryElement);
        }

        if (dismissible) {
            showElement(this.closeButton);
        } else {
            hideElement(this.closeButton);
        }

        if (visible) {
            showElement(this.element);
        } else {
            hideElement(this.element);
        }

        if (progressVisible) {
            showElement(this.progressBar);
        } else {
            hideElement(this.progressBar);
        }

        if (determinate && total > 0) {
            this.progressBar.max = total;
            this.progressBar.value = Math.min(current, total);
        } else {
            this.progressBar.max = 1;
            this.progressBar.removeAttribute('value');
        }
    }
}
