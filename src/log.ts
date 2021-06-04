export const log = {
    error(message: string | Error, ...args: any[]) {
        console.error(message instanceof Error ? message.message : message, ...args);
    },
    info(message: string, ...args: string[]) {
        console.info(message, ...args);
    }
};