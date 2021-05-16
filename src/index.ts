import { config as setupDotEnv } from 'dotenv';
import { Message, MessageEmbed } from 'discord.js';
import commandLineArgs from 'command-line-args';
import { client } from './client';
import { log } from './log';
import * as commands from './commands';
import { Command } from './types';
import { guilds, defaultGuild } from './store';

// Global options
const optionDefinitions = [
    { name: 'help', alias: 'h', type: Boolean },
    { name: 'command', type: (commandName: string) => commands[commandName as keyof typeof commands], defaultOption: true },
];

// Load envs from .env
setupDotEnv();

// Ensure bot token exists
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    log.error('No BOT_TOKEN env set!');
    process.exit(1);
}

client.on('message', async (message: Message) => {
    // Bail if this isn't in a guild
    if (!message.guild?.id) return;

    // Set guild's default object
    if (!guilds.has(message.guild.id)) {
        guilds.set(message.guild.id, defaultGuild);
    }

    // Get prefix
    const prefix = guilds.get(message.guild.id, 'prefix')!;

    // Bail if we don't have our prefix
    if (!message.content.startsWith(prefix)) return;

    // Get main arguments and options
    const initalArgv = message.content.substring(prefix.length).split(/\s/g);
    const mainOptions = commandLineArgs(optionDefinitions, { argv: initalArgv, partial: true });

    // Get left over arguments
    const argv = mainOptions._unknown || [];

    // Get the command
    const command = mainOptions.command as Command;

    // Unknown command
    if (!command) return;

    // Print help for this command
    if (mainOptions.help) {
        return commands.help.run(message, { command: mainOptions.command });
    }

    try {
        // Parse arguments
        const commandArguments = command.arguments ? commandLineArgs(command.arguments, { argv, camelCase: true }) : {};

        // Check command permissions
        if ((command.permissions?.length ?? 0) >= 1) {
            if (!message.member!.hasPermission(command.permissions ?? [])) throw new Error(`MISSING_PERMISSIONS_${command.permissions![0]}`)
        }

        // Run command
        await Promise.resolve(command.run(message, commandArguments as any));
    } catch (error) {
        const errorMessage = `Failed processing command "${command.name}" with "${error.message}"`;
        log.error(errorMessage);

        await message.channel.send(new MessageEmbed({
            author: {
                name: 'Command error!'
            },
            description: errorMessage
        }));
    }
});

client.on('ready', () => {
    log.info('Connected!');
});

// Authenticate with discord's websocket gateway
client.login(botToken);
