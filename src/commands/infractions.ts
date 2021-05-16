import { ago as timeAgo } from 'time-ago';
import { Message, MessageEmbed, User } from "discord.js";
import { colours } from "../colours";
import { members } from "../store";
import { UserMention } from "../utils";

export const infractions = {
    name: 'infractions',
    isMod: true,
    description: 'Show infrations a member has',
    arguments: [{
        name: 'user',
        defaultOption: true,
        multiple: true,
        type: UserMention
    }],
    async run(message: Message, args: { user: User[], reason?: string[], rule?: number, _unknown?: any[] }) {
        const memberId = (args.user ?? [])[0]?.id;
        const isBot = (args.user ?? [])[0]?.bot ?? false;
        const member = message.guild?.members.cache.get(memberId);

        // Failed resolving guild member
        // Maybe they left?
        if (!member) throw new Error('FAILED_RESOLVING_GUILD_MEMBER');

        // Cannot warn bots
        if (isBot) throw new Error('FAILED_GETTING_INFRATIONS_BOTS_CANT_GET_INFRATIONS');

        // Get member infractions
        const infractions = members.get(`${message.guild?.id}_${member.id}`)?.infractions;

        // Member has no infrations
        if (!infractions || infractions.length === 0) {
            const infrationsEmbed = new MessageEmbed({
                color: colours.INFO,
                author: {
                    name: `${member.displayName} has no infractions`
                }
            });

            // Send the infrations message
            await message.channel.send(infrationsEmbed);

            return;
        }

        // Build the infrations embed
        const infrationsEmbed = new MessageEmbed({
            color: colours.INFO,
            author: {
                name: `Infrations - ${member.displayName}`
            },
            fields: [{
                name: 'Last 24 hours',
                value: '?',
                inline: true
            }, {
                name: 'Last 7 days',
                value: '?',
                inline: true
            }, {
                name: 'Total',
                value: infractions?.length ?? 0,
                inline: true
            }, {
                name: 'Last 10 infractions',
                value: infractions?.map(infration => `#${infration.caseId} - ${timeAgo(infration.caseOpened)}`) ?? 'None'
            }]
        });

        // Send the infrations message
        await message.channel.send(infrationsEmbed);
    }
};
