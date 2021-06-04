import { Channel, Message, MessageEmbed } from "discord.js";
import { colours } from "../colours";
import { tall } from 'tall'
import { autoPoster as autoPosterStore } from "../store";
import { help } from "./help";

const sleep = (ms: number) => new Promise<void>(resolve => {
    setTimeout(() => {
        resolve();
    }, ms);
});

export const autoPoster = {
    name: 'auto-poster',
    isMod: false,
    description: 'Manage your auto posted message.',
    arguments: [{
        name: 'command',
        defaultOption: true,
        multiple: false,
        type: String
    }, {
        name: 'link',
        multiple: false,
        type: String
    }],
    async run(message: Message, args?: { command: string, link: string }) {
        // Show a preview
        if (args?.command === 'preview') {
            // Get embed data
            const embedData = autoPosterStore.get(`${message.guild!.id}_${message.member!.id}`)?.data;

            // Bail if the member doesn't have a message set yet
            if (!embedData || Object.keys(embedData).length === 0) throw new Error('FAILED_SHOWING_PREVIEW_NO_MESSAGE_SET');

            // Send preview message
            const previewMessage = await message.channel.send(new MessageEmbed(embedData));

            // Wait 10s
            await sleep(10_000);

            // Delete preview message
            await previewMessage.delete();

            return;
        }

        // Update the link
        if (args?.command === 'update' || args?.command === 'set') {
            // Bail if no link was provided
            if (!args || !args.link) throw new Error('FAILED_TO_UPDATE_MESSAGE_NO_LINK_PROVIDED');

            // Send inital message
            const updateMessage = await message.channel.send(new MessageEmbed({
                color: colours.PENDING,
                author: {
                    name: 'Updating...'
                }
            }));

            // Resolve the short url
            const fullUrl = await tall(args.link);

            // Decode the link
            const url = new URL(fullUrl);
            const stringifiedData = Buffer.from(url.searchParams.get('data') ?? '', 'base64').toString('utf-8');
            const embedData = stringifiedData ? JSON.parse(stringifiedData)?.messages?.[0]?.data?.embeds?.[0] : undefined;

            // Invalid data
            if (typeof embedData !== 'object') throw new Error('FAILED_TO_UPDATE_MESSAGE_LINK_WAS_INVALID');

            // Set frequency to every 1 hour
            const ONE_HOUR = 3_600_000;
            const frequency = ONE_HOUR;

            // @todo: Make this per guild and allow multiple
            // Set channel to hell
            const channelId = '834664630268723201';

            // Update store
            autoPosterStore.set(`${message.guild!.id}_${message.member!.id}`, channelId, 'channelId');
            autoPosterStore.set(`${message.guild!.id}_${message.member!.id}`, frequency, 'frequency');
            autoPosterStore.set(`${message.guild!.id}_${message.member!.id}`, embedData, 'data');

            // Let the member know their message has been updated
            await updateMessage.edit(new MessageEmbed({
                color: colours.PENDING,
                author: {
                    name: 'Updated auto-poster'
                }
            }));

            return;
        }

        // Clear the auto poster for this member
        if (args?.command === 'clear') {
            autoPosterStore.delete(`${message.guild!.id}_${message.member!.id}`);

            // Let the member know their message has been updated
            await message.channel.send(new MessageEmbed({
                color: colours.SUCCESS,
                author: {
                    name: 'Cleared auto-poster settings for your account.'
                }
            }));

            return;
        }

        // Show the member help for this command
        return help.run(message, { command: autoPoster });
    }
};
