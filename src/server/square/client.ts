import 'server-only';
import { SquareClient, SquareEnvironment } from 'square';
import { getSquareEnv } from '../env';

let client: SquareClient | null = null;

/** Server-side Square client; sandbox/production chosen by SQUARE_ENVIRONMENT. */
export function getSquareClient(): SquareClient {
  if (!client) {
    const env = getSquareEnv();
    client = new SquareClient({
      token: env.accessToken,
      environment:
        env.environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
  }
  return client;
}

export function getLocationId(): string {
  return getSquareEnv().locationId;
}
