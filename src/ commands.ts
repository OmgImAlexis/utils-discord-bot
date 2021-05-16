import dedent from "dedent";
import { OptionDefinition } from "command-line-args";
import { Message, MessageEmbed, MessageReaction, PermissionString, User } from "discord.js";
import { client } from "./client";
import { colours } from "./colours";
import { rules } from "./rules";
import { getUserFromMention } from "./utils";

export interface Command {
    name: string;
    description?: string;
    arguments?: OptionDefinition[];
    permissions?: PermissionString[];
    run: (message: Message, args?: any) => void | Promise<void>;
}

export interface Commands {
    [name: string]: Command;
}

const Mention = (mention: string) => getUserFromMention(mention);

// @todo: move this to per guild
const prefix = '[]';

// Commands
export const commands: Commands = {
    help: {
        name: 'help',
        description: 'Shows the help menu!',
        arguments: [{
            name: 'command',
            type: (commandName: string) => commands[commandName]
        }],
        async run(message: Message, args?: { command: Command }) {
            // Bot help
            if (!args?.command) {
                await message.channel.send(new MessageEmbed({
                    color: colours.INFO,
                    author: {
                        name: 'Help'
                    },
                    description: dedent`
                        **__Commands__**

                        ${Object.values(commands).map(command => command.name).join(', ')}
                    `
                }));

                return;
            }

            // Command specific help
            await message.channel.send(new MessageEmbed({
                author: {
                    name: `Help - ${args.command.name}`
                },
                fields: [{
                    name: 'Description',
                    value: args.command.description
                }, {
                    name: 'Usage',
                    value: `${prefix}${args.command.name} ${Object.values(args.command.arguments || {}).map(argument => {
                        if (argument.type === Mention) {
                            return '@ExampleMember';
                        }

                        if (argument.defaultOption) {
                            return `<${argument.name}>`;
                        }

                        if (argument.type === String) {
                            return `**--${argument.name}** __string__`;
                        }

                        if (argument.type === Number) {
                            return `**--${argument.name}** __number__`;
                        }

                        return;
                    }).join(' ')}`
                }]
            }));
        }
    },
    ban: {
        name: 'ban',
        permissions: ['BAN_MEMBERS'],
        description: 'Ban a member',
        arguments: [{
            name: 'user',
            defaultOption: true,
            multiple: true,
            type: Mention
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
    },
    kick: {
        name: 'kick',
        permissions: ['KICK_MEMBERS'],
        description: 'Kick a member',
        arguments: [{
            name: 'user',
            defaultOption: true,
            multiple: true,
            type: mention => getUserFromMention(mention)
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
    }
};