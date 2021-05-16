import EnhancedMap from 'enmap';

export type memberId = string;

interface Infraction {
    caseId: string;
};

export interface DefaultMember {
    banned?: boolean;
    kicked?: boolean;
    infractions?: Infraction[];
};

export const defaultMember: DefaultMember = {};

export const members = new EnhancedMap<memberId, DefaultMember>({
    name: 'members',
    autoFetch: true,
    fetchAll: true
});
