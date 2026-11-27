export class ValidateMethod {
    constructor(config) {
        this.config = config;
    }

    getFieldValue(field) {
        if (!field) {
            return "";
        }

        const value = field.value;

        if (typeof value === "string") {
            return value;
        }

        if (value === null || value === undefined) {
            return "";
        }

        return String(value);
    }

    findFieldByName(field, name) {
        const form = field.form || (typeof field.closest === "function" ? field.closest("form") : null);
        const found = form && form.elements ? form.elements.namedItem(name) : null;

        if (!found) {
            return null;
        }

        if (typeof found.value === "string") {
            return found;
        }

        if (typeof found.length === "number") {
            return found.length > 0 ? found[0] : null;
        }

        return null;
    }

    isRadioGroupChecked(field) {
        const form = field.form;

        if (!form || !field.name) {
            return Boolean(field.checked);
        }

        const group = form.elements.namedItem(field.name);

        if (!group || typeof group.length !== "number") {
            return Boolean(field.checked);
        }

        for (let index = 0; index < group.length; index += 1) {
            if (group[index].checked) {
                return true;
            }
        }

        return false;
    }

    validateRequired(field, value) {
        if (!value) {
            return null;
        }

        if (field.type === "checkbox") {
            return field.checked ? null : this.config.messages.required;
        }

        if (field.type === "radio") {
            return this.isRadioGroupChecked(field) ? null : this.config.messages.required;
        }

        const current = this.getFieldValue(field).trim();

        return current ? null : this.config.messages.required;
    }

    validateEmail(field, value) {
        if (!value) {
            return null;
        }

        const email = this.getFieldValue(field).trim();

        if (!email) {
            return null;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return this.config.messages.email;
        }

        return null;
    }

    validateMin(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field);

        if (current && current.length < value) {
            return this.config.messages.min.replace("{min}", value);
        }

        return null;
    }

    validateMax(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field);

        if (current && current.length > value) {
            return this.config.messages.max.replace("{max}", value);
        }

        return null;
    }

    validatePattern(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field);

        if (!current) {
            return null;
        }

        if (!new RegExp(value).test(current)) {
            return this.config.messages.pattern;
        }

        return null;
    }

    validateLength(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field);

        if (current && current.length !== value) {
            return this.config.messages.length.replace("{length}", value);
        }

        return null;
    }

    validateTime(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field).trim();

        if (!current) {
            return null;
        }

        const timePattern = /^(?:(?:[01]\d|2[0-3]|[1-9]):[0-5]\d|(?:0?[1-9]|1[0-2]):[0-5]\d ?(?:a\.?m\.?|p\.?m\.?))$/i;

        if (!timePattern.test(current)) {
            return this.config.messages.time;
        }

        return null;
    }

    parseDateValue(value, pattern) {
        const tokens = {
            Y: { source: "(\\d{4})", part: "year" },
            m: { source: "(1[0-2]|0?[1-9])", part: "month" },
            d: { source: "(3[01]|[12]\\d|0?[1-9])", part: "day" },
        };

        const order = [];
        let source = "";

        for (const character of pattern) {
            const token = tokens[character];

            if (!token) {
                source += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                continue;
            }

            source += token.source;
            order.push(token.part);
        }

        const match = new RegExp(`^${source}$`).exec(value);

        if (!match) {
            return null;
        }

        const parts = {};

        order.forEach((part, index) => {
            parts[part] = Number(match[index + 1]);
        });

        return parts;
    }

    isRealDate(year, month, day) {
        if (!year || !month || !day) {
            return false;
        }

        const date = new Date(0);
        date.setUTCFullYear(year, month - 1, day);

        return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }

    validateDate(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field).trim();

        if (!current) {
            return null;
        }

        const isPattern = typeof value === "string" && /^[Ymd\s/,.-]+$/.test(value);

        if (!isPattern && !/^\d{4}-\d{2}-\d{2}$/.test(current)) {
            return this.config.messages.date;
        }

        const parts = this.parseDateValue(current, isPattern ? value : "Y-m-d");

        if (!parts || !this.isRealDate(parts.year, parts.month, parts.day)) {
            return this.config.messages.date;
        }

        return null;
    }

    validateJsDate(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field).trim();

        if (!current) {
            return null;
        }

        if (Number.isNaN(Date.parse(current))) {
            return this.config.messages.jsDate;
        }

        return null;
    }

    validateNumber(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field).trim();

        if (!current) {
            return null;
        }

        if (!Number.isFinite(Number(current))) {
            return this.config.messages.number;
        }

        return null;
    }

    validateInt(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field).trim();

        if (!current) {
            return null;
        }

        const numeric = Number(current);

        if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
            return this.config.messages.int;
        }

        return null;
    }

    validateFloat(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field).trim();

        if (!current) {
            return null;
        }

        if (!Number.isFinite(Number(current))) {
            return this.config.messages.float;
        }

        return null;
    }

    validateBool(field, value) {
        if (!value) {
            return null;
        }

        if (field.type === "checkbox" || field.type === "radio") {
            return null;
        }

        const current = this.getFieldValue(field).trim().toLowerCase();

        if (!current) {
            return null;
        }

        const accepted = ["true", "false", "1", "0", "yes", "no", "on", "off"];

        if (!accepted.includes(current)) {
            return this.config.messages.bool;
        }

        return null;
    }

    validateSame(field, value) {
        if (!value) {
            return null;
        }

        const current = this.getFieldValue(field);

        if (!current) {
            return null;
        }

        const compareField = this.findFieldByName(field, value);

        if (!compareField || this.getFieldValue(compareField) !== current) {
            return this.config.messages.same.replace("{field}", value);
        }

        return null;
    }
}
