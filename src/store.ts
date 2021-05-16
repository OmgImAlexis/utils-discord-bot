import EnhancedMap from 'enmap';

type guildId = string;

interface Guild {
    prefix: string;
};

export const defaultGuild: Guild = {
    prefix: '[]'
};

export const guilds = new EnhancedMap<guildId, Guild>({
    name: 'guilds',
    autoFetch: true,
    fetchAll: true
});
