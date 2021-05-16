import { OptionDefinition } from "command-line-args";
import { Message, PermissionString } from "discord.js";

export interface Command {
    name: string;
    description?: string;
    isMod?: boolean;
    arguments?: OptionDefinition[];
    permissions?: PermissionString[];
    run: (message: Message, args?: any) => void | Promise<void>;
}

export interface Commands {
    [name: string]: Command;
}