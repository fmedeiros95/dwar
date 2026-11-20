import path from 'node:path';

export const avatarDir = path.resolve(process.env.AVATAR_DIR ?? 'storage/avatars');
