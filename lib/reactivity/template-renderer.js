import { Directive } from "../directives/directive.js";
import { parseTemplate } from "../utils/parse-template.js";

export class TemplateRenderer {
    constructor(config) {
        this.config = config ? { ...config } : {};
        this.templateSources = new WeakMap();
    }

    render(targetElement, result) {
        const templateElement = this.getTemplateElement(targetElement);

        if (templateElement) {
            this.renderTemplate(templateElement, result, targetElement);
            return;
        }

        targetElement.innerHTML = typeof result === "object" ? JSON.stringify(result, null, 2) : result;
    }

    getTemplateElement(targetElement) {
        const templateId = targetElement.getAttribute(this.config.tags.useTemplate);

        return templateId ? document.querySelector(templateId) : null;
    }

    getTemplateSource(templateElement) {
        if (!this.templateSources.has(templateElement)) {
            this.templateSources.set(templateElement, templateElement.innerHTML);
        }

        return this.templateSources.get(templateElement);
    }

    renderTemplate(templateElement, result, targetElement) {
        const varName = templateElement.getAttribute(this.config.tags.remoteData);
        const data = {};
        data[varName] = result;

        const configData = { ...this.config, data: { ...data } };

        const parsedContent = parseTemplate(this.getTemplateSource(templateElement), data);
        const renderTemplate = document.createElement("template");
        renderTemplate.innerHTML = parsedContent;

        const fragment = renderTemplate.content.cloneNode(true);
        const hasAnyDirectives =
            fragment.querySelectorAll(`[${configData.tags.forLoop}], [${configData.tags.conditionIf}]`).length > 0;
        if (hasAnyDirectives) {
            this.renderDirectives(fragment, configData);
        }

        const isKeepExistingContent = targetElement.hasAttribute(configData.tags.keepExisting);
        if (isKeepExistingContent) {
            targetElement.append(fragment);
        } else {
            targetElement.replaceChildren(fragment);
        }
    }

    renderDirectives(fragment, configData) {
        const directive = new Directive({ ...configData, dataBinder: this.config.dataBinder, root: fragment });
        directive.bootstrap();
    }
}
