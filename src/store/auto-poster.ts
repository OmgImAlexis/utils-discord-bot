import EnhancedMap from 'enmap';

type guildId_memberId = string;

export interface DefaultAutoPoster {
    frequency: number;
    data: Record<string, any>;
    lastPosted?: Date;
    channelId: string;
};

export const defaultAutoPoster: DefaultAutoPoster = {
    frequency: -1,
    data: {},
    channelId: ''
};

export const autoPoster = new EnhancedMap<guildId_memberId, DefaultAutoPoster>({
    name: 'auto-poster',
    autoFetch: true,
    fetchAll: true,
    // @ts-expect-error
    autoEnsure: defaultAutoPoster,
    ensureProps: true
});
