import EnhancedMap from 'enmap';

export type guildId = string;

export interface DefaultGuild {
    prefix: string;
    modRoleId?: string;
};

export const defaultGuild: DefaultGuild = {
    prefix: '[]',
    modRoleId: ''
};

export const guilds = new EnhancedMap<guildId, DefaultGuild>({
    name: 'guilds',
    autoFetch: true,
    fetchAll: true,
    // @ts-expect-error
    autoEnsure: defaultGuild,
    ensureProps: true
});
