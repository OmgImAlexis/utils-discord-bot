import dedent from 'dedent';
import { Message, MessageEmbed } from "discord.js";
import { colours } from "../colours";
import { guilds } from '../store';
import { Command, Commands } from "../types";
import { UserMention } from '../utils';
import * as commands from './index';

export const help = {
    name: 'help',
    description: 'Shows the help menu!',
    arguments: [{
        name: 'command',
        type: (commandName: string) => commands[commandName as keyof typeof commands]
    }],
    async run(message: Message, args?: { command: Command }) {
        const prefix = guilds.get(message.guild?.id!, 'prefix');

        // Bot help
        if (!args?.command) {
            await message.channel.send(new MessageEmbed({
                color: colours.INFO,
                author: {
                    name: 'Help'
                },
                description: dedent`
                    **__Commands__**

                    ${Object.values(commands as Commands).filter(command => {
                        // Command is only for mods, admins and the guild owner
                        if (command.isMod) return false;

                        // Command doesn't have any permissions needed
                        if (!command.permissions) return true;

                        // Check if member has permission to use this command
                        return command.permissions && command.permissions.length >= 1 && message.member?.hasPermission(command.permissions);
                    }).map(command => command.name).join(', ')}
                `
            }));

            return;
        }

        // Member doesn't have the needed permissions to see the help menu for this command
        if (args.command.permissions && args.command.permissions.length >= 1 && !message.member?.hasPermission(args.command.permissions)) return;

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
                    if (argument.type === UserMention) {
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
}