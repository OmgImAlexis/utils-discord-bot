import EnhancedMap from 'enmap';

export type guildId = string;

export interface DefaultGuild {
    prefix: string;
    modRoleId?: string;
};

export const defaultGuild: DefaultGuild = {
    prefix: '[]'
};

export const guilds = new EnhancedMap<guildId, DefaultGuild>({
    name: 'guilds',
    autoFetch: true,
    fetchAll: true
});
