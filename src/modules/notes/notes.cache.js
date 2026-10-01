import { createHash } from 'node:crypto';
import redisClient from '../../config/redis.js';
import { cacheDel, cacheIncr } from '../../common/utils/cache.js';

export const NOTE_TTL = 60 * 5;  // 5 min
export const LIST_TTL = 60;      // 1 min (lists go stale faster)

const LIST_VERSION_KEY = 'notes:list:version';

export const noteKey = (id) => `notes:item:${id}`;

export const getListVersion = async () => {
  try {
    return (await redisClient.get(LIST_VERSION_KEY)) ?? '0';
  } catch {
    return '0';
  }
};

// Hash the query so long/odd search strings still make a safe key
export const listKey = (version, query) => {
  const hash = createHash('sha1').update(JSON.stringify(query)).digest('hex');
  return `notes:list:v${version}:${hash}`;
};

// Any write changes what lists contain, so bump the version
export const invalidateLists = () => cacheIncr(LIST_VERSION_KEY);

export const invalidateNote = (id) => cacheDel(noteKey(id));