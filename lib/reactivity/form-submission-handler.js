import { parseResponse } from "../utils/response.js";

export class FormSubmissionHandler {
    static PENDING_FORMS;

    constructor(settings, form, event) {
        FormSubmissionHandler.PENDING_FORMS ??= new WeakSet();

        this.settings = { ...settings };
        this.form = typeof form === "string" ? document.querySelector(form) : form;
        this.event = event;

        this.isAjax = this.form.getAttribute(this.settings.tags.formAjax) === "true";
        this.ajaxRenderSelector = this.form.getAttribute(this.settings.tags.formAjaxRender);
        this.removeOnSubmit = this.form.getAttribute(this.settings.tags.formRemoveOnSubmit) === "true";
        this.ajaxMethods = ["get", "post", "put", "patch", "delete"];
    }

    submit() {
        if (this.isAjax) {
            this.event.preventDefault();
            this.ajaxSubmit();
            return;
        }

        this.form.requestSubmit();
    }

    getFormParams() {
        return new URLSearchParams(new FormData(this.form));
    }

    removeForm() {
        if (!this.removeOnSubmit) {
            return;
        }

        this.form.remove();
    }

    getMethod() {
        const attributeMethod = (this.form.getAttribute("method") || "").trim().toLowerCase();
        const propertyMethod = (this.form.method || "").trim().toLowerCase();
        const method = this.ajaxMethods.includes(attributeMethod) ? attributeMethod : propertyMethod;

        return this.ajaxMethods.includes(method) ? method : "get";
    }

    getRequestUrl(method, params) {
        const url = new URL(this.form.action || window.location.href, document.baseURI);

        if (method === "get") {
            for (const [name, value] of params) {
                url.searchParams.append(name, value);
            }
        }

        return url.toString();
    }

    getRequestInit(method, params) {
        if (method === "get") {
            return {
                method: "GET",
            };
        }

        return {
            method: method.toUpperCase(),
            body: params,
        };
    }

    getSubmitControls() {
        const candidates = this.form
            .getRootNode()
            .querySelectorAll('button, input[type="submit"], input[type="image"]');
        return Array.from(candidates).filter(
            (control) => control.form === this.form && (control.type === "submit" || control.type === "image"),
        );
    }

    disableSubmitControls(controls) {
        const enabled = controls.filter((control) => !control.matches(":disabled"));
        for (const control of enabled) {
            control.disabled = true;
        }

        return () => {
            for (const control of enabled) {
                control.disabled = false;
            }
        };
    }

    async ajaxSubmit() {
        const pendingForms = FormSubmissionHandler.PENDING_FORMS;
        if (pendingForms.has(this.form)) {
            return;
        }

        pendingForms.add(this.form);
        let restoreControls;
        let removeLoadingIndicator;

        try {
            const confirmMessage = this.form.getAttribute(this.settings.tags.formConfirm);
            if (confirmMessage !== null && !window.confirm(confirmMessage)) {
                return;
            }

            const target = this.ajaxRenderSelector ? document.querySelector(this.ajaxRenderSelector) : null;
            if (!target) {
                console.warn("No target element found for AJAX form submission.");
                return;
            }

            const method = this.getMethod();
            const params = this.getFormParams();
            const controls = this.getSubmitControls();
            restoreControls = this.disableSubmitControls(controls);
            removeLoadingIndicator = this.addLoadingIndicator(controls);

            const response = await fetch(this.getRequestUrl(method, params), this.getRequestInit(method, params));

            if (!response.ok) {
                const body = await response.text().catch(() => "");
                throw new Error(`HTTP ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`);
            }

            const result = await parseResponse(response);

            this.renderResponse(target, result);
            this.removeForm();
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            restoreControls?.();
            removeLoadingIndicator?.();
            pendingForms.delete(this.form);
        }
    }

    renderResponse(target, result) {
        this.settings.templateRenderer.render(target, result);
    }

    addLoadingIndicator(controls) {
        const indicatorClass = this.form.getAttribute(this.settings.tags.formIndicator) || "is--loading";
        const elements = [this.form, ...controls].filter((element) => !element.classList.contains(indicatorClass));
        for (const element of elements) {
            element.classList.add(indicatorClass);
        }

        return () => {
            for (const element of elements) {
                element.classList.remove(indicatorClass);
            }
        };
    }
}
