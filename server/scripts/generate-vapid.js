// Generate the key pair web push needs ("VAPID" keys). Run once:  npm run vapid
// Then copy the two lines into server/.env and restart the server.
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log('\nAdd these to server/.env (keep the private key secret):\n');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:you@example.com\n');
