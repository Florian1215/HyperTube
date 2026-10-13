export default function formatTime(time: number) {
    if (!time || isNaN(time))
        return "0h0m";

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    let result = `${minutes}m`;
    if (hours > 0)
        result = `${hours}h${result}`;
    if (seconds > 0)
        result += seconds.toString().padStart(2, "0");
    return result;
}
