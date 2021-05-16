import { v4 as uuid } from 'uuid';
import { Message, MessageEmbed, MessageReaction, User } from "discord.js";
import { client } from "../client";
import { colours } from "../colours";
import { rules } from "../rules";
import { members } from "../store";
import { UserMention } from "../utils";

export const kick = {
    name: 'kick',
    permissions: ['KICK_MEMBERS'],
    description: 'Kick a member',
    arguments: [{
        name: 'user',
        defaultOption: true,
        multiple: true,
        type: UserMention
    }, {
        name: 'reason',
        multiple: true,
        type: String
    }, {
        name: 'rule',
        multiple: false,
        type: Number
    }],
    async run(message: Message, args: { user: User[], reason?: string[], rule?: number, _unknown?: any[] }) {
        const memberId = (args.user ?? [])[0]?.id;
        const isBot = (args.user ?? [])[0]?.bot ?? false;
        const member = message.guild?.members.cache.get(memberId);
        const moderator = message.author;
        const rule = rules[args.rule as keyof typeof rules];
        const reason = (args.reason ?? []).join(' ').replace(/['"]+/g, '') || rule || 'No reason given.';
        const channel = message.channel;

        // Failed resolving guild member
        // Maybe they left?
        if (!member) throw new Error('FAILED_RESOLVING_GUILD_MEMBER');

        // Cannot kick bots
        if (isBot) throw new Error('FAILED_KICKING_BOT');

        // Build the confirmation embed
        const confirmationEmbed = new MessageEmbed({
            color: colours.PENDING,
            author: {
                name: 'Kick - pending'
            },
            fields: [{
                name: 'Member',
                value: `<@${member.id}>`,
                inline: true
            }, {
                name: 'Moderator',
                value: `<@${moderator.id}>`,
                inline: true
            }, {
                name: 'Channel',
                value: channel,
                inline: true
            }, {
                name: 'Reason',
                value: reason
            }],
            footer: {
                text: 'Are you sure you want to kick this member?'
            }
        });

        // Send the kick confirmation message
        const confirmationMessage = await message.channel.send(confirmationEmbed);

        // Add confirmation reactions
        await confirmationMessage.react('✅');
        await confirmationMessage.react('❌');

        // Wait for confirmation
        const emojis = ['✅', '❌'];
        const filterCollection = (reaction: MessageReaction, user: User) => user.id == message.author.id && emojis.includes(reaction.emoji.name);
        const collected = await confirmationMessage.awaitReactions(filterCollection, { max: 1, time: 30000 });
        const confirmed = collected.first()?.emoji.name === '✅';
        const timedOut = collected.size === 0;

        // Remove confirmation reactions
        await confirmationMessage.reactions.removeAll();

        // Mod decided not to kick them
        if (!confirmed || timedOut) {
            await confirmationMessage.edit(new MessageEmbed({
                color: timedOut ? colours.TIMEDOUT : colours.BLURPLE,
                author: {
                    name: `Kick - ${timedOut ? 'timed-out' : 'cancelled'}`
                },
                fields: [{
                    name: 'Member',
                    value: `<@${member.id}>`,
                    inline: true
                }, {
                    name: 'Moderator',
                    value: `<@${moderator.id}>`,
                    inline: true
                }, {
                    name: 'Channel',
                    value: channel,
                    inline: true
                }, {
                    name: 'Reason',
                    value: reason
                }]
            }));
            return;
        }

        // Can we kick this member?
        if (!member.kickable) throw new Error('FAILED_KICKING_UNKICKABLE');

        // Mention this action in the audit-log

        // Add an infration to this member
        members.push(`${message.guild!.id}_${member.id}`, {
            caseId: uuid(),
            type: 'ban',
            moderator: moderator.id,
            channel,
            reason,
        }, 'infractions');

        // Let member know they're being kicked
        await member.send(new MessageEmbed({
            color: colours.KICKED,
            author: {
                name: `You\'ve been kicked from ${message.guild!.name}!`
            }
        }));

        // Kick member
        await member.kick(reason);

        // Let mod know member was kicked
        await confirmationMessage.edit(new MessageEmbed({
            color: colours.KICKED,
            author: {
                name: 'Kicked'
            },
            fields: [{
                name: 'Member',
                value: `<@${member.id}>`,
                inline: true
            }, {
                name: 'Moderator',
                value: `<@${moderator.id}>`,
                inline: true
            }, {
                name: 'Channel',
                value: channel,
                inline: true
            }, {
                name: 'Reason',
                value: reason
            }]
        }));

        // Clear member from cache
        client.users.cache.delete(member.id);
    }
};