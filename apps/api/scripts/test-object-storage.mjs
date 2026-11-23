import { Files } from 'files-sdk';
import { neon } from 'files-sdk/neon';

const BUCKET = 'uploads';
const KEY = `tests/landconnect-upload-${Date.now()}.txt`;
const BODY = [
  'LandConnect object-storage check',
  `Bucket: ${BUCKET}`,
  `Key: ${KEY}`,
  'This file was uploaded with the Neon Files SDK.',
  '',
].join('\n');

// The Neon adapter reads AWS_* credentials/endpoint from the environment.
// Run with: node --env-file=../../.env.local scripts/test-object-storage.mjs
const files = new Files({ adapter: neon({ bucket: BUCKET }) });

const uploaded = await files.upload(KEY, BODY, {
  contentType: 'text/plain; charset=utf-8',
});
console.log(`UPLOADED ${uploaded.key} (${uploaded.size} bytes, ${uploaded.contentType})`);

const listing = await files.list({ prefix: 'tests/' });
console.log(`LIST ${listing.items.length} object(s) under tests/:`);
for (const item of listing.items) {
  console.log(`  - ${item.key} (${item.size} bytes)`);
}

const downloaded = await files.download(KEY);
console.log('DOWNLOADED CONTENTS:');
console.log(await downloaded.text());

console.log('EXISTS', await files.exists(KEY));
