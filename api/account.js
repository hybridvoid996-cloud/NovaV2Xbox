import accountRecovery from '../api-handlers/account-recovery.js';
import accountLogin from '../api-handlers/account-login.js';
import loginHandoff from '../api-handlers/login-handoff.js';
import secureAppeal from '../api-handlers/secure-appeal.js';

const handlers = {'account-recovery': accountRecovery, 'account-login': accountLogin, 'login-handoff': loginHandoff, 'secure-appeal': secureAppeal};
export const config = {maxDuration: 60};
export default function handler(req, res) {
  const route = new URL(req.url, 'https://nova.local').searchParams.get('novaEndpoint');
  if (!Object.hasOwn(handlers, route)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({error: 'Unknown account endpoint.'}));
    return;
  }
  return handlers[route](req, res);
}
