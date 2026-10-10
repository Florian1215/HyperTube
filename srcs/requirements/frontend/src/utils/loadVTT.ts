export interface iSub {
    start: number
    end: number
    text: string
}

function timeToSeconds(time: string) {
    const parts = time.trim().split(":").map(parseFloat);
    return parts.reduce((total, part) => total * 60 + part, 0);
}

function cleanText(text: string) {
    return text
        .replace(/\{\\[^}]*}/g, "")
        .replace(/<(\/?)([ibu])>/g, "\u0000$1$2\u0001")
        .replace(/<[^>]*>/g, "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\u0000/g, "<").replace(/\u0001/g, ">");
}

export function parseVTT(vtt: string): iSub[] {
    const subs: iSub[] = [];

    vtt.replace(/\r/g, "").split(/\n{2,}/).forEach((block) => {
        const lines = block.split("\n");
        const timeIndex = lines.findIndex((line) => line.includes("-->"));
        if (timeIndex === -1)
            return;
        const [start, end] = lines[timeIndex].split("-->");
        const text = cleanText(lines.slice(timeIndex + 1).join("\n")).trim();
        if (text)
            subs.push({start: timeToSeconds(start), end: timeToSeconds(end.trim().split(" ")[0]), text});
    });
    return subs;
}

export default async function loadVTT(url: string, signal?: AbortSignal) {
    const res = await fetch(url, {signal, cache: "no-store"});
    if (!res.ok)
        throw new Error(res.statusText);
    return parseVTT(await res.text());
}
