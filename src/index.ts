import { camelCase } from 'change-case';
import { config as setupDotEnv } from 'dotenv';
import { Message, MessageEmbed } from 'discord.js';
import commandLineArgs from 'command-line-args';
import { client } from './client';
import { log } from './log';
import * as commands from './commands';
import { Command } from './types';
import { autoPoster, guilds } from './store';
import { isTextChannel, pEachSeries } from './utils';
import { colours } from './colours';

// Global options
const optionDefinitions = [
    { name: 'help', alias: 'h', type: Boolean },
    { name: 'command', type: (commandName: string) => commands[camelCase(commandName) as keyof typeof commands], defaultOption: true },
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

    // Get prefix
    const prefix = guilds.get(message.guild.id)?.prefix!;

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
        const commandArguments = command.arguments ? commandLineArgs(command.arguments, { argv, camelCase: true, partial: true }) : {};

        // Skip checks if this is the owner of the guild
        if (message.author.id !== message.guild?.ownerID) {
            // Check command global permissions
            if ((command.permissions?.length ?? 0) >= 1) {
                if (!message.member!.hasPermission(command.permissions ?? [])) throw new Error(`MISSING_PERMISSIONS_${command.permissions![0]}`)
            }

            // Get guild settings
            const guildSettings = guilds.get(message.guild.id);

            // Check guild specific channel permissions
            const commandIsDeniedInSomeChannels = (guildSettings?.commandPermissions[command.name]?.denied.channels ?? []).length >= 1;
            const commandIsAllowedInSomeChannels = (guildSettings?.commandPermissions[command.name]?.allowed.channels ?? []).length >= 1;
            const isThisChannelDenied = commandIsDeniedInSomeChannels ? guildSettings?.commandPermissions[command.name]?.denied.channels.includes(message.channel.id) : false;
            const isThisChannelAllowed = commandIsAllowedInSomeChannels ? guildSettings?.commandPermissions[command.name]?.allowed.channels.includes(message.channel.id) : true;
            const isThisChannelOkay = !isThisChannelDenied && isThisChannelAllowed;

            // Command cannot be used in this channel
            if (!isThisChannelOkay) {
                console.log(`channel cannot use ${command.name}`, {isThisChannelDenied, isThisChannelAllowed, isThisChannelOkay});
                return;
            }

            // Check guild specific role permissions
            const commandIsDeniedForSomeRoles = (guildSettings?.commandPermissions[command.name]?.denied.roles ?? []).length >= 1;
            const commandIsAllowedForSomeRoles = (guildSettings?.commandPermissions[command.name]?.allowed.roles ?? []).length >= 1;
            const memberHasDeniedRoles = commandIsDeniedForSomeRoles ? guildSettings?.commandPermissions[command.name]?.denied.roles.every(roleId => message.member?.roles.cache.has(roleId)) : false;
            const memberHasAllowedRoles = commandIsAllowedForSomeRoles ? guildSettings?.commandPermissions[command.name]?.allowed.roles.some(roleId => message.member?.roles.cache.has(roleId)) : true;
            const hasMemberGotCorrectRoles = !memberHasDeniedRoles && memberHasAllowedRoles;

            // Command cannot be used by this member as they don't have the correct roles
            if (!hasMemberGotCorrectRoles) {
                console.log(`member cannot use ${command.name}`, {memberHasDeniedRoles, memberHasAllowedRoles, hasMemberGotCorrectRoles});
                return;
            }
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

    // One minute in milliseconds
    const ONE_MINUTE = 60_000;

    // Start auto poster
    // Every minute check if we need to auto post
    setInterval(async () => {
        const now = new Date();
        await pEachSeries(autoPoster.entries(), async ([guildId_memberId, memberAutoPoster]) => {
            // Check if it's time to post
            const canPost = memberAutoPoster.lastPosted ? ((memberAutoPoster.lastPosted ?? now).getTime() + memberAutoPoster.frequency) < now.getTime() : true;
            if (!canPost) return;

            // Get guild and channel ids
            const [guildId] = guildId_memberId.split('_');
            const channelId = memberAutoPoster.channelId;

            // Get channel
            const channel = client.guilds.cache.get(guildId)?.channels.cache.get(channelId);

            // Check this ia a text channel
            if (isTextChannel(channel)) {
                // Set last posted to set
                autoPoster.set(guildId_memberId, now, 'lastPosted');

                // Post embed to the channel
                await channel.send(new MessageEmbed({
                    ...memberAutoPoster.data,
                    color: colours.LUMINOUS_VIVID_PINK
                }));
            }
        }).catch(error => {
            log.error('FAILED_HANDLING_AUTO_POSTER', error);
        });
    }, ONE_MINUTE);
});

// Authenticate with discord's websocket gateway
client.login(botToken);
