export class Evaluator {
    constructor({ config, dataBinderInstance, usedForTag }) {
        this.config = { ...config };
        this.dataBinder = dataBinderInstance;
        this.usedForTag = usedForTag;

        this.evaluationCache = new Map();
        this.statementCache = new Map();
    }

    getData(element) {
        const scopedData = this.getScopedData(element);
        const expression = this.getExpression(element);

        return this.evaluate(expression, scopedData);
    }

    normalizeExpression(expression) {
        let normalized = expression;
        let prev;

        do {
            prev = normalized;
            normalized = normalized.replace(
                /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|([A-Za-z_$)\]])\.(\d+)\b/g,
                (match, base, index) => {
                    if (base === undefined) {
                        return match;
                    }

                    return `${base}[${index}]`;
                },
            );
        } while (normalized !== prev);

        return normalized;
    }

    evaluate(expression, scopedData, options = {}) {
        const silent = options.silent ?? false;
        const fallback = "fallback" in options ? options.fallback : false;
        const normalized = this.normalizeExpression(expression);
        const fn = this.compile(normalized, { silent });
        if (!fn) {
            return fallback;
        }

        const scope = this.scope(scopedData);

        try {
            return fn.call(scope, scope);
        } catch (err) {
            if (!silent) {
                console.error(`[${this.usedForTag}] runtime error in "${expression}"`, err);
            }

            return fallback;
        }
    }

    execute(statement, scopedData, extras = {}) {
        const fn = this.compileStatement(statement);
        if (!fn) {
            return;
        }

        const scope = this.scope({ ...scopedData, ...extras });

        try {
            return fn.call(scope, scope);
        } catch (err) {
            console.error(`[${this.usedForTag}] runtime error in "${statement}"`, err);
        }
    }

    compile(expression, { silent = false } = {}) {
        if (this.evaluationCache.has(expression)) {
            return this.evaluationCache.get(expression);
        }

        let fn = null;

        try {
            fn = new Function("__s__", `with (__s__) { return (${expression}); }`);
        } catch (err) {
            if (!silent) {
                console.error(`[${this.usedForTag}] syntax error in "${expression}"`, err);
            }
        }

        this.evaluationCache.set(expression, fn);

        return fn;
    }

    compileStatement(statement) {
        if (this.statementCache.has(statement)) {
            return this.statementCache.get(statement);
        }

        let fn = null;

        try {
            fn = new Function("__s__", `with (__s__) { ${statement} }`);
        } catch (err) {
            console.error(`[${this.usedForTag}] syntax error in "${statement}"`, err);
        }

        this.statementCache.set(statement, fn);

        return fn;
    }

    scope(state = {}) {
        return new Proxy(state, {
            has(target, key) {
                return key !== Symbol.unscopables;
            },
            get(target, key) {
                if (key === Symbol.unscopables) {
                    return undefined;
                }

                if (key in target) {
                    return target[key];
                }

                return globalThis[key];
            },
            set(target, key, value) {
                target[key] = value;

                return true;
            },
        });
    }

    getScopedData(element) {
        const closestState = this.dataBinder?.getClosestData(element);

        let loopData = {};
        if (element?._loopData) {
            loopData = { ...element._loopData };
        }

        if (!closestState) {
            return { ...this.config.data, ...loopData };
        }

        return { ...this.config.data, ...closestState, ...loopData };
    }

    getExpression(element) {
        return element.getAttribute(this.usedForTag).trim();
    }
}
