import { handleCron } from "./controllers/cron"
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log(`Starting process to generate draft...`);
  await handleCron();
}
main();


// If you want to run the cron job automatically, uncomment the following line:
//cron.schedule(`0 17 * * *`, async () => {
//  console.log(`Starting process to generate draft...`);
//  await handleCron();
//}); 