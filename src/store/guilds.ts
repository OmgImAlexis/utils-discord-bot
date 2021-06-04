import EnhancedMap from 'enmap';

export type guildId = string;
export type commandName = string;

export interface DefaultGuild {
    prefix: string;
    modRoleId?: string;
    commandPermissions: Record<commandName, {
        allowed: {
            roles: string[];
            channels: string[];
        }
        denied: {
            roles: string[];
            channels: string[];
        }
    } | undefined>
};

export const defaultGuild: DefaultGuild = {
    prefix: '[]',
    modRoleId: '',
    commandPermissions: {
        'auto-poster': {
            allowed: {
                roles: [],
                channels: []
            },
            denied: {
                roles: [],
                channels: []
            }
        }
    }
};

export const guilds = new EnhancedMap<guildId, DefaultGuild>({
    name: 'guilds',
    autoFetch: true,
    fetchAll: true,
    // @ts-expect-error
    autoEnsure: defaultGuild,
    ensureProps: true
});
