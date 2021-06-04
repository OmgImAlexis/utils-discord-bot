import { Message, MessageEmbed } from "discord.js";
import { DefaultGuild, defaultGuild, guilds } from '../store';

export const settings = {
    name: 'settings',
    description: 'Shows the settings menu!',
    isMod: true,
    arguments: [{
        name: 'command',
        type: String,
        defaultOption: true
    }, {
        name: 'field',
        type: String
    }, {
        name: 'value',
        type: String
    }],
    async run(message: Message, args: { command?: string, field?: string, value?: string } = {}) {
        const modRoleId = guilds.get(message.guild?.id!, 'modRoleId');

        // Skip checks if this is the owner of the guild
        if (message.author.id !== message.guild?.ownerID) {
            // No mod role set
            if (!modRoleId) return;

            // Bail as member doesn't have mod role
            if (!message.member?.roles.cache.has(modRoleId)) throw new Error('PERMISSION_DENIED');
        }

        // Return current settings when no command is present
        if (!args.command) {
            await message.channel.send(new MessageEmbed({
                author: {
                    name: 'Settings'
                },
                description: '```json\n' + JSON.stringify(guilds.get(message.guild?.id!), null, 2) + '\n```'
            }));
            return;
        }

        // Set field to user provided value
        if (args.command === 'set') {
            // Bail if we have no field and no value
            if (!args.field || !args.value) throw new Error('FAILED_UPDATING_GUILD_SETTING_NO_FIELD_OR_VALUE_PROVIDED');

            // Update guild settings
            guilds.set(message.guild?.id!, args.value, args.field);

            // Let moderator know settings were updated
            await message.channel.send(new MessageEmbed({
                author: {
                    name: 'Setting updated'
                },
                description: '```json\n' + JSON.stringify(guilds.get(message.guild?.id!), null, 2) + '\n```'
            }));

            return;
        }

        // Push a user provided value into a field
        if (args.command === 'push') {
            // Bail if we have no field and no value
            if (!args.field || !args.value) throw new Error('FAILED_PUSHING_INTO_GUILD_SETTING_NO_FIELD_OR_VALUE_PROVIDED');

            // Push into guild settings
            guilds.push(message.guild?.id!, args.value, args.field);

            // Let moderator know settings were updated
            await message.channel.send(new MessageEmbed({
                author: {
                    name: 'Setting updated'
                },
                description: '```json\n' + JSON.stringify(guilds.get(message.guild?.id!), null, 2) + '\n```'
            }));

            return;
        }

        // Delete field that user provided
        if (args.command === 'delete') {
            // Bail if we have no field and no value
            if (!args.field) throw new Error('FAILED_DELETING_GUILD_SETTING_NO_FIELD_PROVIDED');

            // Update guild settings
            guilds.delete(message.guild?.id!, args.field);

            // Let moderator know settings were updated
            await message.channel.send(new MessageEmbed({
                author: {
                    name: 'Setting deleted'
                },
                description: '```json\n' + JSON.stringify(guilds.get(message.guild?.id!), null, 2) + '\n```'
            }));

            return;
        }

        // Reset field that user provided
        if (args.command === 'reset') {
            // Reset all values
            if (!args.field) {
                // Reset guild settings
                guilds.set(message.guild?.id!, defaultGuild);

                // Let moderator know settings were reset
                await message.channel.send(new MessageEmbed({
                    author: {
                        name: 'Settings reset'
                    },
                    description: '```json\n' + JSON.stringify(guilds.get(message.guild?.id!), null, 2) + '\n```'
                }));

                return;
            }

            const defaultValue = defaultGuild[args.field as keyof DefaultGuild];

            // Bail if there's no default value for this field
            if (!defaultValue) throw new Error('FAILED_RESETTING_GUILD_SETTINGS_NO_DEFAULT_VALUE');

            // Reset guild setting
            guilds.set(message.guild?.id!, defaultValue, args.field);

            // Let moderator know settings were updated
            await message.channel.send(new MessageEmbed({
                author: {
                    name: 'Setting reset'
                },
                description: '```json\n' + JSON.stringify(guilds.get(message.guild?.id!), null, 2) + '\n```'
            }));

            return;
        }

        // Let moderator know settings were updated
        await message.channel.send(new MessageEmbed({
            author: {
                name: 'Settings'
            },
            description: '```json\n' + JSON.stringify(guilds.get(message.guild?.id!), null, 2) + '\n```'
        }));
    }
};
