export const log = {
    error(message: string | Error) {
        console.error(message instanceof Error ? message.message : message);
    },
    info(message: string, ...args: string[]) {
        console.info(message, ...args);
    }
};