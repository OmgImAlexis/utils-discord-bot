import EnhancedMap from 'enmap';

export type memberId = string;

interface Infraction {
    caseId: string;
    caseOpened: Date;
    caseClosed?: Date;
};

export interface DefaultMember {
    banned?: boolean;
    kicked?: boolean;
    infractions?: Infraction[];
};

export const defaultMember: DefaultMember = {
    infractions: []
};

export const members = new EnhancedMap<memberId, DefaultMember>({
    name: 'members',
    autoFetch: true,
    fetchAll: true,
    // @ts-expect-error
    autoEnsure: defaultMember,
    ensureProps: true
});
