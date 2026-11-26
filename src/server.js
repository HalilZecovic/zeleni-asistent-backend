import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`Zeleni Asistent backend sluša na portu ${env.PORT}`);
});
