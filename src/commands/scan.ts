import { Message, MessageEmbed } from "discord.js";
import { colours } from "../colours";
import { pEachSeries } from "../utils";

export const scan = {
    name: 'scan',
    isMod: true,
    permissions: ['MANAGE_MEMBERS'],
    description: 'Scan for members using a filter',
    arguments: [{
        name: 'command',
        defaultOption: true,
        multiple: false,
        type: String
    }, {
        name: 'count',
        multiple: false,
        type: Number
    }],
    async run(message: Message, args: { command: string, count?: number, _unknown?: any[] }) {
        // Send inital message
        const scanMessage = await message.channel.send(new MessageEmbed({
            color: colours.PENDING,
            author: {
                name: 'Scanning...'
            }
        }));

        let matchingMembers = message.guild?.members.cache.filter(member => member.user.avatar === null && member.user.bot === false);

        // List members with default profile image
        if (args.command === 'list') {
            const chunks = Math.floor((matchingMembers?.size ?? 50) / 50) || 1;
            const embeds = Array.from({ length: chunks }, (_, index) => {
                const description = (matchingMembers?.size ?? 0) === 0 ? 'No members found with the default profile image.' : [...(matchingMembers?.map(member => `<@${member.id}>`).values() ?? [])].slice(index * 50, (index + 1) * 50).join(' ');
                return new MessageEmbed({
                    color: colours.INFO,
                    ...(index === 0 ? { author: { name: 'Scan done!'} } : {}),
                    description
                });
            });

            // Remove inital scan message
            await scanMessage.delete();

            // Send scan results
            await pEachSeries(embeds, embed => message.channel.send(embed));

            return;
        }

        // Kick first 50 members with default profile image
        if (args.command === 'kick') {
            const members = [...matchingMembers?.values() ?? []].slice(0, 50);
            await pEachSeries(members, member => member.kick(`Didn't pass verification.`));
            matchingMembers = message.guild?.members.cache.filter(member => member.user.avatar === null && member.user.bot === false);
        }

        // Send summary of members with default profile image
        await scanMessage.edit(new MessageEmbed({
            color: colours.INFO,
            author: {
                name: 'Scan done'
            },
            description: `Found ${matchingMembers?.size ?? 0} members with the default profile image.`
        }));

        return;
    }
};
