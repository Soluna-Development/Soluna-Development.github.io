import { DISCORD_INVITE_API } from '../config/constants.js';

export async function getDiscordStats() {
    const response = await fetch(DISCORD_INVITE_API);
    if (!response.ok) throw new Error('Failed to fetch Discord invite stats');
    const data = await response.json();
    return {
        memberCount: data.approximate_member_count || 0,
        onlineCount: data.approximate_presence_count || 0,
    };
}
