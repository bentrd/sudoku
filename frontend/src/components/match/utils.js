/**
 * Helper: format a duration (in ms) into a human-readable string:
 *  - If < 60s, show "XXs"
 *  - If < 60m, show "XXm YYs"
 *  - If < 24h, show "XXh YYm"
 *  - Else show "ZZd XXh"
 */
export function formatDuration(ms) {
    ms = Number(ms) || 0; // Ensure ms is a number
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) {
        const secs = totalSeconds % 60;
        return `${totalMinutes}m${secs}s`;
    }
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
        const mins = totalMinutes % 60;
        return `${totalHours}h${mins}m`;
    }
    const totalDays = Math.floor(totalHours / 24);
    if (totalDays < 365) {
        const hours = totalHours % 24;
        return `${totalDays}d${hours}h`;
    }
    const years = Math.floor(totalDays / 365);
    const days = totalDays % 365;
    return `${years}y${days}d`;
}