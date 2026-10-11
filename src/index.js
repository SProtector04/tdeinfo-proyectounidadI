import { loadConfig } from './config/env.js';
import { buildApp } from './app.js';

const config = loadConfig();
const { app } = await buildApp(config);

app.listen(config.port, () => {
  console.log(`Centro del Quesillo escuchando en http://localhost:${config.port}`);
});
