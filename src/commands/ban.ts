import { v4 as uuid } from 'uuid';
import { Message, MessageEmbed, MessageReaction, User } from "discord.js";
import { client } from "../client";
import { colours } from "../colours";
import { rules } from "../rules";
import { members } from "../store";
import { UserMention } from "../utils";

export const ban = {
    name: 'ban',
    isMod: true,
    permissions: ['BAN_MEMBERS'],
    description: 'Ban a member',
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

        // Cannot ban bots
        if (isBot) throw new Error('FAILED_BANNING_BOT');

        // Build the confirmation embed
        const confirmationEmbed = new MessageEmbed({
            color: colours.PENDING,
            author: {
                name: 'Ban - pending'
            },
            thumbnail: {
                url: member.user.displayAvatarURL()
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
                text: 'Are you sure you want to ban this member?'
            }
        });

        // Send the ban confirmation message
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

        // Mod decided not to ban them
        if (!confirmed || timedOut) {
            await confirmationMessage.edit(new MessageEmbed({
                color: timedOut ? colours.TIMEDOUT : colours.CANCELLED,
                author: {
                    name: `Ban - ${timedOut ? 'timed-out' : 'cancelled'}`
                },
                thumbnail: {
                    url: member.user.displayAvatarURL()
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

        // Can we ban this member?
        if (!member.bannable) throw new Error('FAILED_BANNING_UNKICKABLE');

        // Mention this action in the audit-log

        // Add an infration to this member
        members.push(`${message.guild!.id}_${member.id}`, {
            caseId: uuid(),
            type: 'ban',
            moderator: moderator.id,
            channel: channel.id,
            reason,
        }, 'infractions');

        // Let member know they're being banned
        await member.send(new MessageEmbed({
            color: colours.BANNED,
            author: {
                name: `You\'ve been banned from ${message.guild!.name}!`
            }
        }));

        // ban member
        await member.ban({
            reason
        });

        // Let mod know member was banned
        await confirmationMessage.edit(new MessageEmbed({
            color: colours.BANNED,
            author: {
                name: 'Banned'
            },
            thumbnail: {
                url: member.user.displayAvatarURL()
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
}