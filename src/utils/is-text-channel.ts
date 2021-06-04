import { Channel, TextChannel } from "discord.js";

export const isTextChannel = (channel?: Channel): channel is TextChannel => channel?.type === 'text';
