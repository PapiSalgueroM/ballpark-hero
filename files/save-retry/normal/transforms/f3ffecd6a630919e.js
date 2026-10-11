import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";
export default function UsCareerSaveNotice({ operation, onRetry }) {
    return /*#__PURE__*/ _jsxDEV("div", {
        role: "alert",
        "data-us-career-save-error": true,
        "data-save-operation": operation,
        className: "sticky top-0 z-40 mb-3 rounded-xl border border-destructive/50 bg-card p-3 text-xs leading-relaxed",
        children: [
            /*#__PURE__*/ _jsxDEV("p", {
                children: operation === 'remove' ? 'Your reset has not been saved. This device may still load the previous career. Stay on this page and retry, or create a new player to replace it.' : 'Your latest progress has not been saved. Stay on this page and try again.'
            }, void 0, false, {
                fileName: "/home/runner/work/ballpark-hero/ballpark-hero/src/components/us-career/UsCareerSaveNotice.tsx",
                lineNumber: 7,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("button", {
                onClick: onRetry,
                className: "mt-2 min-h-11 min-w-11 rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary",
                children: "Retry save"
            }, void 0, false, {
                fileName: "/home/runner/work/ballpark-hero/ballpark-hero/src/components/us-career/UsCareerSaveNotice.tsx",
                lineNumber: 10,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "/home/runner/work/ballpark-hero/ballpark-hero/src/components/us-career/UsCareerSaveNotice.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
